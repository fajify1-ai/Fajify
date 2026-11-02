import {randomUUID} from 'node:crypto';
import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {CustomerService} from '../customer/customer.service';
import type {VerifiedIdentity} from '../auth/identity.types';
import {FinanceLedger,minor,type FinanceIntent} from './finance-ledger.service';
import {PaystackGateway} from './paystack.gateway';
import {parseTicketToken,ticketKey,ticketNonce,ticketToken} from './ticket-token';

export type HoldInput={kind:'reservation'|'ticket';sourceId:string;quantity:number;guestName:string;requestKey:string};
@Injectable()
export class CommerceLifecycle {
 constructor(@Inject(FinanceLedger)readonly ledger:FinanceLedger,@Inject(CustomerService)readonly customers:CustomerService,@Inject(PaystackGateway)readonly gateway:PaystackGateway){}
 async hold(who:VerifiedIdentity,input:HoldInput){
  if(!input.guestName.trim())throw new BadRequestException('Guest name is required');
  const environment=this.gateway.environment();const key=input.kind==='ticket'?ticketKey().keyId:null;
  return this.customers.withAccountTransaction(who,async c=>{
   const prior=(await c.query('SELECT h.*,p.amount_minor::text,p.currency FROM paid_holds h JOIN payment_intents p ON p.id=h.intent_id WHERE h.customer_subject=$1 AND h.request_key=$2',[who.subject,input.requestKey])).rows[0];
   if(prior){if(prior.kind!==input.kind||prior.quantity!==input.quantity||prior.guest_name!==input.guestName.trim()||(prior.availability_id??prior.catalogue_id)!==input.sourceId.toLowerCase())throw new ConflictException('Hold retry key conflict');return this.holdProjection(prior);}
   let source;
   if(input.kind==='reservation')source=(await c.query('SELECT catalogue_id,business_id,branch_id FROM business_availability WHERE id=$1',[input.sourceId])).rows[0];
   else source=(await c.query('SELECT id AS catalogue_id,business_id,branch_id FROM business_catalogue WHERE id=$1',[input.sourceId])).rows[0];
   if(!source)throw new NotFoundException('Offering unavailable');await this.ledger.lock(c,source.business_id);
   await this.ledger.environment(c,environment);
   const eligible=await c.query("SELECT 1 FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id WHERE b.id=$1 AND b.business_id=$2 AND b.active AND m.status='approved' FOR SHARE OF b,m",[source.branch_id,source.business_id]);
   if(!eligible.rowCount)throw new ConflictException('Merchant unavailable');
   const item=(await c.query('SELECT *,price_minor::text FROM business_catalogue WHERE id=$1 AND active AND published FOR SHARE',[source.catalogue_id])).rows[0];
   if(!item||item.currency!=='NGN'||item.kind!==(input.kind==='ticket'?'event':'service'))throw new ConflictException('Paid offering unavailable');
   const amount=minor((BigInt(item.price_minor)*BigInt(input.quantity)).toString()),policy=await this.ledger.policy(c,source.business_id);
   if(input.kind==='reservation'){
    const updated=await c.query("UPDATE business_availability SET reserved=reserved+$2 WHERE id=$1 AND active AND starts_at>now()+$3*interval '1 minute' AND reserved+$2<=capacity RETURNING id",[input.sourceId,input.quantity,policy.hold_minutes]);
    if(!updated.rowCount)throw new ConflictException('Slot unavailable');
   }else{
    const event=await c.query("SELECT 1 FROM business_event_config WHERE catalogue_id=$1 AND starts_at>now()+$2*interval '1 minute' FOR SHARE",[source.catalogue_id,policy.hold_minutes]);
    if(!event.rowCount)throw new ConflictException('Event unavailable');
    if(!(await c.query('UPDATE ticket_inventory SET held=held+$2 WHERE catalogue_id=$1 AND held+issued+$2<=capacity RETURNING catalogue_id',[source.catalogue_id,input.quantity])).rowCount)throw new ConflictException('Tickets exhausted');
   }
   const intent=randomUUID(),id=randomUUID();
   await c.query(`INSERT INTO payment_intents(id,customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
    VALUES($1,$2,$3,$4,$5,$6,$7,'NGN')`,[intent,who.subject,source.business_id,'hold-'+id,'faji-'+randomUUID(),environment,amount.toString()]);
   const p:FinanceIntent={id:intent,customer_subject:who.subject,business_id:source.business_id,amount_minor:amount.toString(),currency:'NGN',environment,provider_reference:'',status:'pending'};
   await this.ledger.terms(c,p,policy.id);
   const hold=(await c.query(`INSERT INTO paid_holds(id,intent_id,customer_subject,business_id,branch_id,catalogue_id,kind,availability_id,quantity,guest_name,request_key,expires_at,key_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()+$12*interval '1 minute',$13) RETURNING *`,[id,intent,who.subject,source.business_id,source.branch_id,source.catalogue_id,input.kind,input.kind==='reservation'?input.sourceId:null,input.quantity,input.guestName.trim(),input.requestKey,policy.hold_minutes,key])).rows[0];
   await this.ledger.event(c,'hold',id,'created',who.subject);return this.holdProjection({...hold,amount_minor:amount.toString(),currency:'NGN'});
  });
 }
 holdProjection(h:any){return {id:h.id,paymentIntentId:h.intent_id,kind:h.kind,status:h.status,quantity:h.quantity,expiresAt:h.expires_at,reservationId:h.reservation_id,businessId:h.business_id,branchId:h.branch_id,catalogueId:h.catalogue_id,availabilityId:h.availability_id,guestName:h.guest_name,createdAt:h.created_at,amountMinor:h.amount_minor,currency:h.currency};}
 async holds(subject:string,limit:number,offset:number){return (await this.ledger.pool.query('SELECT h.*,p.amount_minor::text,p.currency FROM paid_holds h JOIN payment_intents p ON p.id=h.intent_id WHERE h.customer_subject=$1 ORDER BY h.created_at DESC,h.id DESC LIMIT $2 OFFSET $3',[subject,limit,offset])).rows.map(h=>this.holdProjection(h));}
 async releaseHold(c:PoolClient,h:any,status:'expired'|'cancelled'|'late'){
  if(h.status!=='held')return;
  if(h.kind==='ticket')await c.query('UPDATE ticket_inventory SET held=held-$2 WHERE catalogue_id=$1',[h.catalogue_id,h.quantity]);
  else await c.query('UPDATE business_availability SET reserved=reserved-$2 WHERE id=$1',[h.availability_id,h.quantity]);
  await c.query('UPDATE paid_holds SET status=$2 WHERE id=$1',[h.id,status]);
 }
 async validatePurchase(c:PoolClient,p:FinanceIntent){
  const linked=(await c.query('SELECT order_id FROM finance_order_links WHERE intent_id=$1',[p.id])).rows[0];
  if(linked){const current=(await c.query('SELECT intent_id FROM payment_order_current WHERE order_id=$1',[linked.order_id])).rows[0];if(current&&current.intent_id!==p.id)throw new ConflictException('Payment attempt was superseded');}
  if(linked){const order=(await c.query('SELECT status,business_id,branch_id FROM business_orders WHERE id=$1 FOR UPDATE',[linked.order_id])).rows[0];if(!order||order.status!=='placed')throw new ConflictException('Order no longer payable');
   if(!(await c.query("SELECT 1 FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id WHERE b.id=$1 AND b.active AND m.status='approved' FOR SHARE OF b,m",[order.branch_id])).rowCount)throw new ConflictException('Merchant unavailable');return;
  }
  const h=(await c.query('SELECT *,expires_at>now() AS unexpired FROM paid_holds WHERE intent_id=$1 FOR UPDATE',[p.id])).rows[0];
  if(!h||h.status!=='held'||!h.unexpired)throw new ConflictException('Payment hold expired');
  if(!(await c.query("SELECT 1 FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id JOIN business_catalogue i ON i.branch_id=b.id WHERE i.id=$1 AND i.active AND i.published AND b.active AND m.status='approved' FOR SHARE OF b,m,i",[h.catalogue_id])).rowCount)throw new ConflictException('Offering unavailable');
  if(h.kind==='ticket'){ticketKey(h.key_id);if(!(await c.query('SELECT 1 FROM business_event_config WHERE catalogue_id=$1 AND starts_at>now() FOR SHARE',[h.catalogue_id])).rowCount)throw new ConflictException('Event has started');}
  else if(!(await c.query('SELECT 1 FROM business_availability WHERE id=$1 AND active AND starts_at>now() FOR UPDATE',[h.availability_id])).rowCount)throw new ConflictException('Slot no longer available');
 }
 async checkout(who:VerifiedIdentity,id:string,email:string){
  const callback=process.env.PAYMENT_CALLBACK_URL;
  if(!callback)throw new ServiceUnavailableException('Payment callback URL is not configured');const u=new URL(callback);
  if(u.protocol!=='https:'||u.username||u.password||u.hash)throw new ServiceUnavailableException('Invalid configured payment callback URL');
  const known=(await this.ledger.pool.query('SELECT business_id FROM payment_intents WHERE id=$1 AND customer_subject=$2',[id,who.subject])).rows[0];if(!known)throw new NotFoundException('Payment not found');
  const selected=await this.customers.withAccountTransaction(who,async c=>{
   await this.ledger.lock(c,known.business_id);
   const p=(await c.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 AND customer_subject=$2 FOR UPDATE',[id,who.subject])).rows[0];
   await this.ledger.environment(c,p.environment);
   if(p.status==='succeeded')return {paid:true,p};if(p.environment!==this.gateway.environment())throw new ConflictException('Payment environment changed');
   await this.validatePurchase(c,p);await this.ledger.terms(c,p);
   const old=(await c.query('SELECT * FROM checkout_sessions WHERE intent_id=$1',[id])).rows[0];
   if(old){if(old.email!==email.toLowerCase())throw new ConflictException('Checkout email differs from original attempt');return {old,p};}
   await c.query("INSERT INTO checkout_sessions(intent_id,email,state) VALUES($1,$2,'initializing')",[id,email.toLowerCase()]);
   await this.ledger.event(c,'checkout',id,'initialization_requested',who.subject);await this.ledger.enqueue(c,'payment',id,30);return {p};
  });
  if(selected.paid)return {paymentIntentId:id,state:'paid',checkoutEnabled:false};
  if(selected.old){const s=selected.old;return {paymentIntentId:id,state:s.state,checkoutEnabled:s.state==='ready',authorizationUrl:s.authorization_url??undefined,accessCode:s.access_code??undefined};}
  return this.initializeSelected(selected.p,email.toLowerCase(),callback,who.subject);
 }
 async initializeSelected(p:FinanceIntent,email:string,callback:string,actor:string){
  const id=p.id;
  try{
   const session=await this.gateway.initialize({reference:p.provider_reference,amount:p.amount_minor,email:email.toLowerCase(),callbackUrl:callback});
   // Save provider evidence even if eligibility changed while the provider was contacted; revalidate before disclosure.
   return await this.ledger.intentTx(id,async(c,p)=>{
    await c.query("UPDATE checkout_sessions SET state='ready',authorization_url=$2,access_code=$3 WHERE intent_id=$1",[id,session.authorizationUrl,session.accessCode]);
    try{await this.validatePurchase(c,p);}catch{await c.query("UPDATE checkout_sessions SET state='closed',authorization_url=NULL,access_code=NULL WHERE intent_id=$1",[id]);return {paymentIntentId:id,state:'closed',checkoutEnabled:false};}
    await this.ledger.event(c,'checkout',id,'initialized',actor);
    return {paymentIntentId:id,state:'ready',checkoutEnabled:true,...session};
   });
  }catch(e){await this.ledger.pool.query("UPDATE checkout_sessions SET state='uncertain',authorization_url=NULL,access_code=NULL WHERE intent_id=$1 AND state='initializing'",[id]);throw e;}
 }
 async captured(c:PoolClient,p:FinanceIntent){
  const terms=(await c.query('SELECT * FROM payment_terms WHERE intent_id=$1',[p.id])).rows[0];
  const link=(await c.query('SELECT order_id FROM finance_order_links WHERE intent_id=$1',[p.id])).rows[0];
  const h=(await c.query('SELECT *,expires_at>now() AS unexpired FROM paid_holds WHERE intent_id=$1 FOR UPDATE',[p.id])).rows[0];
  if(!terms&&!h&&!link)return; // Historical/operator fixture capture has no purchasable resource.
  try{await this.ledger.terms(c,p);}catch{await this.ledger.fullRefund(c,p,'Payment lacks an approved financial policy');return;}
  let eligible=true;
  try{await this.validatePurchase(c,p);}catch{eligible=false;}
  const customer=(await c.query('SELECT a.suspended,p.suspended AS profile_suspended FROM account_access a JOIN user_profiles p USING(identity_subject) WHERE a.identity_subject=$1',[p.customer_subject])).rows[0];
  if(!customer||customer.suspended||customer.profile_suspended)eligible=false;
  if(!eligible){if(h)await this.releaseHold(c,h,'late');await this.ledger.fullRefund(c,p,'Payment received after purchase eligibility ended');await this.ledger.event(c,'payment',p.id,'late_payment_refund_required','system:m5');return;}
  if(h?.kind==='reservation'){
   const r=(await c.query(`INSERT INTO business_reservations(business_id,branch_id,availability_id,customer_subject,guests,guest_name)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[h.business_id,h.branch_id,h.availability_id,h.customer_subject,h.quantity,h.guest_name])).rows[0];
   await c.query("UPDATE paid_holds SET status='confirmed',reservation_id=$2 WHERE id=$1",[h.id,r.id]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('business.reservation.confirmed',$1)",[JSON.stringify({businessId:h.business_id,resourceId:r.id,paymentIntentId:p.id})]);
  }else if(h?.kind==='ticket'){
   ticketKey(h.key_id);await c.query('UPDATE ticket_inventory SET held=held-$2,issued=issued+$2 WHERE catalogue_id=$1',[h.catalogue_id,h.quantity]);
   for(let n=1;n<=h.quantity;n++)await c.query('INSERT INTO issued_tickets(hold_id,ordinal,nonce,key_id) VALUES($1,$2,$3,$4) ON CONFLICT(hold_id,ordinal) DO NOTHING',[h.id,n,ticketNonce(),h.key_id]);
   await c.query("UPDATE paid_holds SET status='confirmed' WHERE id=$1",[h.id]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('tickets.issued',$1)",[JSON.stringify({holdId:h.id,paymentIntentId:p.id})]);
  }else await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('business.order.paid',$1)",[JSON.stringify({businessId:p.business_id,resourceId:link.order_id,paymentIntentId:p.id})]);
  await c.query("UPDATE payment_terms SET resolution='confirmed' WHERE intent_id=$1",[p.id]);
  await this.ledger.allocate(c,p);await this.ledger.event(c,'payment',p.id,'purchase_confirmed','system:m5');
 }
 async retryInitialization(actor:string,id:string){
  const callback=process.env.PAYMENT_CALLBACK_URL;if(!callback||new URL(callback).protocol!=='https:')throw new ServiceUnavailableException('Payment callback URL unavailable');
  const selected=await this.ledger.intentTx(id,async(c,p)=>{
   if(p.status==='succeeded')throw new ConflictException('Payment already captured');await this.validatePurchase(c,p);
   const old=(await c.query('SELECT *,attempted_at<now()-interval \'30 seconds\' AS retryable FROM checkout_sessions WHERE intent_id=$1 FOR UPDATE',[id])).rows[0];
   if(!old||!['uncertain','initializing'].includes(old.state)||!old.retryable)throw new ConflictException('Initialization is not eligible for a reconciled retry');
   if(p.environment!==this.gateway.environment())throw new ConflictException('Environment mismatch');
   await c.query("UPDATE checkout_sessions SET state='initializing',attempted_at=now(),authorization_url=NULL,access_code=NULL WHERE intent_id=$1",[id]);
   await this.ledger.event(c,'checkout',id,'same_reference_retry',actor);await this.ledger.enqueue(c,'payment',id,30);return {p,email:old.email};
  });return this.initializeSelected(selected.p,selected.email,callback,actor);
 }
 async retryOrder(who:VerifiedIdentity,orderId:string,previousId:string,key:string){
  const prior=(await this.ledger.pool.query(`SELECT p.id,p.amount_minor::text,p.currency,p.status,a.order_id,a.previous_intent_id FROM payment_intents p JOIN payment_order_attempts a ON a.intent_id=p.id WHERE p.customer_subject=$1 AND p.request_key=$2`,[who.subject,key])).rows[0];
  if(prior){if(prior.order_id!==orderId.toLowerCase()||prior.previous_intent_id!==previousId.toLowerCase())throw new ConflictException('Retry key conflict');return {paymentIntentId:prior.id,orderId:prior.order_id,amountMinor:prior.amount_minor,currency:prior.currency,status:prior.status,checkoutEnabled:false};}
  const old=(await this.ledger.pool.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 AND customer_subject=$2',[previousId,who.subject])).rows[0];if(!old)throw new NotFoundException('Payment not found');
  const provider=await this.gateway.transaction(old.provider_reference);
  if(!['failed','abandoned'].includes(provider.status)||provider.reference!==old.provider_reference||provider.domain!==old.environment||String(provider.amount)!==old.amount_minor||provider.currency!==old.currency)throw new ConflictException('Previous attempt is not independently verified as failed or abandoned');
  return this.customers.withAccountTransaction(who,async c=>{
   await this.ledger.lock(c,old.business_id);
   const replay=(await c.query('SELECT p.id,a.order_id,a.previous_intent_id FROM payment_intents p LEFT JOIN payment_order_attempts a ON a.intent_id=p.id WHERE p.customer_subject=$1 AND p.request_key=$2',[who.subject,key])).rows[0];
   if(replay){if(replay.order_id!==orderId.toLowerCase()||replay.previous_intent_id!==previousId.toLowerCase())throw new ConflictException('Retry key conflict');return {paymentIntentId:replay.id,orderId:replay.order_id,amountMinor:old.amount_minor,currency:old.currency,status:'pending',checkoutEnabled:false};}
   const current=(await c.query('SELECT coalesce(n.intent_id,l.intent_id) AS id FROM payment_order_links l LEFT JOIN payment_order_current n ON n.order_id=l.order_id WHERE l.order_id=$1',[orderId])).rows[0];
   if(current?.id!==previousId.toLowerCase())throw new ConflictException('Previous payment is not the current order attempt');
   const locked=(await c.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 FOR UPDATE',[previousId])).rows[0];
   if(locked.status!=='pending'||locked.environment!==this.gateway.environment())throw new ConflictException('Previous payment was captured or environment changed');
   await this.validatePurchase(c,locked);const id=randomUUID();
   await c.query("INSERT INTO payment_intents(id,customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[id,who.subject,old.business_id,key,'faji-'+randomUUID(),old.environment,old.amount_minor,old.currency]);
   await c.query('INSERT INTO payment_order_attempts(intent_id,order_id,previous_intent_id) VALUES($1,$2,$3)',[id,orderId,previousId]);
   await c.query('INSERT INTO payment_order_current(order_id,intent_id) VALUES($1,$2) ON CONFLICT(order_id) DO UPDATE SET intent_id=EXCLUDED.intent_id',[orderId,id]);
   await this.ledger.terms(c,{...locked,id});await this.ledger.event(c,'payment',id,'explicit_failed_attempt_retry',who.subject);
   return {paymentIntentId:id,orderId:orderId.toLowerCase(),amountMinor:old.amount_minor,currency:old.currency,status:'pending',checkoutEnabled:false};
  });
 }
 async cancel(who:VerifiedIdentity,id:string){
  const known=(await this.ledger.pool.query('SELECT intent_id,business_id FROM paid_holds WHERE id=$1 AND customer_subject=$2',[id,who.subject])).rows[0];if(!known)throw new NotFoundException('Hold not found');
  return this.customers.withAccountTransaction(who,async c=>{
   await this.ledger.lock(c,known.business_id);const p=(await c.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 FOR UPDATE',[known.intent_id])).rows[0];
   const h=(await c.query('SELECT * FROM paid_holds WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(['cancelled','expired','late'].includes(h.status))return this.holdProjection(h);
   if(h.status==='held'){await this.releaseHold(c,h,'cancelled');await this.ledger.event(c,'hold',id,'cancelled',who.subject);return this.holdProjection({...h,status:'cancelled'});}
   const policy=await this.ledger.terms(c,p);
   if(!(await c.query("SELECT 1 FROM payment_receipts WHERE intent_id=$1 AND verified_at+$2*interval '1 hour'>=now()",[p.id,policy.refund_window_hours])).rowCount)throw new ConflictException('Refund window closed; contact support');
   const allowed=h.kind==='ticket'?(await c.query("SELECT starts_at>now()+$2*interval '1 minute' AS allowed FROM business_event_config WHERE catalogue_id=$1",[h.catalogue_id,policy.cancellation_cutoff_minutes])).rows[0]?.allowed:(await c.query("SELECT starts_at>now()+$2*interval '1 minute' AS allowed FROM business_availability WHERE id=$1",[h.availability_id,policy.cancellation_cutoff_minutes])).rows[0]?.allowed;
   if(!allowed)throw new ConflictException('Cancellation cutoff passed; contact support');
   if(h.reservation_id){const r=(await c.query('SELECT status FROM business_reservations WHERE id=$1 FOR UPDATE',[h.reservation_id])).rows[0];if(r?.status!=='confirmed')throw new ConflictException('Reservation already in use');}
   if((await c.query("SELECT 1 FROM issued_tickets WHERE hold_id=$1 AND state='redeemed'",[h.id])).rowCount)throw new ConflictException('A ticket has already been redeemed');
   await this.revoke(c,p);await this.ledger.fullRefund(c,p,'Customer cancellation within configured cutoff');return this.holdProjection({...h,status:'cancelled'});
  });
 }
 async revoke(c:PoolClient,p:FinanceIntent){
  await c.query("UPDATE payment_terms SET resolution='cancelled' WHERE intent_id=$1",[p.id]);
  const order=(await c.query("UPDATE business_orders SET status='cancelled',updated_at=now() WHERE id IN (SELECT order_id FROM finance_order_links WHERE intent_id=$1) AND status IN ('placed','accepted','preparing','ready') RETURNING id",[p.id])).rows[0];
  if(order)await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('business.order.cancelled',$1)",[JSON.stringify({businessId:p.business_id,resourceId:order.id})]);
  const h=(await c.query('SELECT * FROM paid_holds WHERE intent_id=$1 FOR UPDATE',[p.id])).rows[0];if(!h||h.status==='cancelled')return;
  if(h.status==='held')await this.releaseHold(c,h,'cancelled');
  else if(h.status==='confirmed'){
   if(h.kind==='ticket'){
    const unused=await c.query("UPDATE issued_tickets SET state='revoked' WHERE hold_id=$1 AND state='issued' RETURNING id",[h.id]);
    await c.query('UPDATE ticket_inventory SET issued=issued-$2 WHERE catalogue_id=$1',[h.catalogue_id,unused.rowCount]);
   }else{const result=await c.query("UPDATE business_reservations SET status='cancelled',updated_at=now() WHERE id=$1 AND status='confirmed' RETURNING id",[h.reservation_id]);if(result.rowCount)await c.query('UPDATE business_availability SET reserved=reserved-$2 WHERE id=$1',[h.availability_id,h.quantity]);}
   await c.query("UPDATE paid_holds SET status='cancelled' WHERE id=$1",[h.id]);
  }
 }
 async expire(limit=100){
  const rows=(await this.ledger.pool.query("SELECT intent_id FROM paid_holds WHERE status='held' AND expires_at<=now() ORDER BY expires_at LIMIT $1",[limit])).rows;
  for(const row of rows)await this.ledger.intentTx(row.intent_id,async(c,p)=>{const h=(await c.query('SELECT *,expires_at<=now() AS due FROM paid_holds WHERE intent_id=$1 FOR UPDATE',[p.id])).rows[0];if(h?.status==='held'&&h.due){await this.releaseHold(c,h,'expired');await this.ledger.event(c,'hold',h.id,'expired','system:m5');}});
  return rows.length;
 }
 async merchant(c:PoolClient,subject:string,business:string,branch?:string,finance=false){
  if(!(await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[business])).rowCount)throw new ForbiddenException();
  const grants=(await c.query("SELECT role FROM resource_memberships WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2 AND active AND role=ANY($3::varchar[]) FOR SHARE",[subject,business,finance?['owner','manager']:['owner','manager','staff']])).rows;
  if(!grants.length)throw new ForbiddenException();
  if(branch&&!grants.some(g=>['owner','manager'].includes(g.role))&&!(await c.query("SELECT 1 FROM resource_memberships WHERE identity_subject=$1 AND resource_type='branch' AND resource_id=$2 AND role='staff' AND active FOR SHARE",[subject,branch])).rowCount)throw new ForbiddenException();
 }
 async inventory(who:VerifiedIdentity,business:string,branch:string,catalogue:string,capacity:number){
  return this.customers.withAccountTransaction(who,async c=>{await this.ledger.lock(c,business);await this.merchant(c,who.subject,business,branch,true);
   const event=(await c.query('SELECT e.max_guests FROM business_event_config e JOIN business_catalogue i ON i.id=e.catalogue_id WHERE e.catalogue_id=$1 AND e.business_id=$2 AND e.branch_id=$3 AND i.kind=\'event\' FOR SHARE OF e,i',[catalogue,business,branch])).rows[0];
   if(!event||capacity>event.max_guests)throw new ConflictException('Inventory exceeds event capacity');
   const r=await c.query('INSERT INTO ticket_inventory(catalogue_id,capacity) VALUES($1,$2) ON CONFLICT(catalogue_id) DO UPDATE SET capacity=EXCLUDED.capacity WHERE ticket_inventory.held+ticket_inventory.issued<=EXCLUDED.capacity RETURNING *',[catalogue,capacity]);
   if(!r.rowCount)throw new ConflictException('Capacity below reserved inventory');await this.ledger.event(c,'inventory',catalogue,'configured',who.subject);return r.rows[0];});
 }
 async tickets(subject:string,limit:number,offset:number){
  const rows=(await this.ledger.pool.query('SELECT t.id,t.nonce,t.key_id,t.state,t.redeemed_at,h.catalogue_id,h.id AS hold_id,e.starts_at,e.ends_at FROM issued_tickets t JOIN paid_holds h ON h.id=t.hold_id JOIN business_event_config e ON e.catalogue_id=h.catalogue_id WHERE h.customer_subject=$1 ORDER BY t.created_at DESC,t.id DESC LIMIT $2 OFFSET $3',[subject,limit,offset])).rows;
  return rows.map(t=>({id:t.id,holdId:t.hold_id,eventId:t.catalogue_id,status:t.state,startsAt:t.starts_at,endsAt:t.ends_at,redeemedAt:t.redeemed_at,qrToken:t.state==='issued'?ticketToken(t.id,t.nonce,t.key_id):undefined}));
 }
 async redeem(who:VerifiedIdentity,business:string,branch:string,token:string){
  const parsed=parseTicketToken(token);
  return this.customers.withAccountTransaction(who,async c=>{await this.ledger.lock(c,business);await this.merchant(c,who.subject,business,branch);
   const t=(await c.query(`SELECT t.*,h.business_id,h.branch_id,h.status AS hold_status,e.starts_at<=now() AS started,e.ends_at>now() AS open
    FROM issued_tickets t JOIN paid_holds h ON h.id=t.hold_id JOIN business_event_config e ON e.catalogue_id=h.catalogue_id
    WHERE t.id=$1 AND h.business_id=$2 AND h.branch_id=$3 FOR UPDATE OF t`,[parsed.id,business,branch])).rows[0];
   if(!t||t.nonce!==parsed.nonce||t.key_id!==parsed.keyId)throw new NotFoundException('Ticket not found');
   if(t.state!=='issued'||t.hold_status!=='confirmed'||!t.started||!t.open)throw new ConflictException('Ticket unavailable or already redeemed');
   await c.query("UPDATE issued_tickets SET state='redeemed',redeemed_at=now(),redeemed_by=$2 WHERE id=$1",[t.id,who.subject]);await this.ledger.event(c,'ticket',t.id,'redeemed',who.subject);return {id:t.id,status:'redeemed'};
  });
 }
}
