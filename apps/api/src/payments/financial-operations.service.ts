import {randomUUID} from 'node:crypto';
import {ConflictException,Inject,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import type {VerifiedIdentity} from '../auth/identity.types';
import {FinanceLedger,minor,splitFunding,type FinanceIntent,type Funding} from './finance-ledger.service';
import {CommerceLifecycle} from './commerce-lifecycle.service';
import {PaystackGateway} from './paystack.gateway';
import {providerId} from './finance-provider';

export type PolicyInput={commissionBps:number;gatewayFeeBearer:'platform'|'merchant';payoutFeeBearer:'platform'|'merchant';settlementDelayHours:number;refundWindowHours:number;cancellationCutoffMinutes:number;holdMinutes:number};
@Injectable()
export class FinancialOperations {
 constructor(@Inject(FinanceLedger)readonly ledger:FinanceLedger,@Inject(CommerceLifecycle)readonly commerce:CommerceLifecycle,@Inject(PaystackGateway)readonly gateway:PaystackGateway){}
 async policy(actor:string,business:string,input:PolicyInput){
  business=business.toLowerCase();
  return this.ledger.tx(business,async c=>{
   if(!(await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[business])).rowCount)throw new ConflictException('Approved business required');
   const row=(await c.query(`INSERT INTO finance_policies(business_id,commission_bps,gateway_fee_bearer,settlement_delay_hours,refund_window_hours,cancellation_cutoff_minutes,hold_minutes,approved_by,payout_fee_bearer,version)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE(max(version),0)+1 FROM finance_policies WHERE business_id=$1 RETURNING *`,[business,input.commissionBps,input.gatewayFeeBearer,input.settlementDelayHours,input.refundWindowHours,input.cancellationCutoffMinutes,input.holdMinutes,actor,input.payoutFeeBearer])).rows[0];
   await this.ledger.event(c,'policy',row.id,'approved',actor);return this.policyView(row);
  });
 }
 policyView(p:any){return p?{id:p.id,version:p.version,commissionBps:p.commission_bps,gatewayFeeBearer:p.gateway_fee_bearer,payoutFeeBearer:p.payout_fee_bearer,settlementDelayHours:p.settlement_delay_hours,refundWindowHours:p.refund_window_hours,cancellationCutoffMinutes:p.cancellation_cutoff_minutes,holdMinutes:p.hold_minutes,createdAt:p.created_at}:null;}
 async policies(business:string,limit:number,offset:number){return (await this.ledger.pool.query('SELECT * FROM finance_policies WHERE business_id=$1 ORDER BY version DESC LIMIT $2 OFFSET $3',[business,limit,offset])).rows.map(p=>this.policyView(p));}
 refundView(r:any){return {id:r.id,paymentIntentId:r.intent_id,amountMinor:String(r.amount_minor),status:r.state,reason:r.reason,createdAt:r.created_at};}
 async requestRefund(who:VerifiedIdentity,id:string,input:{requestKey:string;amountMinor:string;reason:string}){
  const known=(await this.ledger.pool.query('SELECT business_id FROM payment_intents WHERE id=$1 AND customer_subject=$2',[id,who.subject])).rows[0];if(!known)throw new NotFoundException('Payment not found');
  return this.commerce.customers.withAccountTransaction(who,async c=>{
   await this.ledger.lock(c,known.business_id);const p=(await c.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 AND customer_subject=$2 FOR UPDATE',[id,who.subject])).rows[0];
   const prior=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE intent_id=$1 AND request_key=$2',[id,input.requestKey])).rows[0];
   if(prior){if(prior.amount_minor!==input.amountMinor||prior.reason!==input.reason.trim())throw new ConflictException('Refund retry conflict');return this.refundView(prior);}
   if(p.status!=='succeeded')throw new ConflictException('Verified capture required');
   const policy=await this.ledger.terms(c,p);
   if(!(await c.query("SELECT 1 FROM payment_receipts WHERE intent_id=$1 AND verified_at+($2*interval '1 hour')>=now()",[id,policy.refund_window_hours])).rowCount)throw new ConflictException('Refund window closed; contact support');
   const remaining=BigInt(p.amount_minor)-await this.ledger.refundReserved(c,id),amount=minor(input.amountMinor);
   if(amount>remaining)throw new ConflictException('Refund exceeds remaining payment');
   const hold=(await c.query('SELECT kind FROM paid_holds WHERE intent_id=$1',[id])).rows[0];
   if(hold?.kind==='ticket'&&amount!==remaining)throw new ConflictException('Ticket purchases require a full remaining refund');
   const r=(await c.query('INSERT INTO finance_refunds(intent_id,request_key,amount_minor,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *,amount_minor::text',[id,input.requestKey,input.amountMinor,input.reason.trim(),who.subject])).rows[0];
   await this.ledger.event(c,'refund',r.id,'requested',who.subject);return this.refundView(r);
  });
 }
 async adminRefund(actor:string,id:string,input:{requestKey:string;amountMinor:string;reason:string}){
  return this.ledger.intentTx(id,async(c,p)=>{
   if(p.status!=='succeeded'||minor(input.amountMinor)>BigInt(p.amount_minor))throw new ConflictException('Invalid refund');
   const old=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE intent_id=$1 AND request_key=$2',[id,input.requestKey])).rows[0];
   if(old){if(old.amount_minor!==input.amountMinor||old.reason!==input.reason.trim())throw new ConflictException('Refund retry conflict');return this.refundView(old);}
   const hold=(await c.query('SELECT kind FROM paid_holds WHERE intent_id=$1',[id])).rows[0];
   if(hold?.kind==='ticket'&&BigInt(input.amountMinor)!==BigInt(p.amount_minor)-await this.ledger.refundReserved(c,id))throw new ConflictException('Ticket refund must cover the remaining purchase');
   const r=(await c.query('INSERT INTO finance_refunds(intent_id,request_key,amount_minor,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *,amount_minor::text',[id,input.requestKey,input.amountMinor,input.reason.trim(),actor])).rows[0];await this.ledger.event(c,'refund',r.id,'admin_requested',actor);return this.refundView(r);
  });
 }
 async decision(actor:string,id:string,approve:boolean){
  const found=(await this.ledger.pool.query('SELECT intent_id FROM finance_refunds WHERE id=$1',[id])).rows[0];if(!found)throw new NotFoundException('Refund not found');
  return this.ledger.intentTx(found.intent_id,async(c,p)=>{
   const r=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(r.state!=='requested'){if((approve&&['approved','submitting','pending','processed','uncertain'].includes(r.state))||(!approve&&r.state==='rejected'))return this.refundView(r);throw new ConflictException('Refund decision is final');}
   if(!approve){await c.query("UPDATE finance_refunds SET state='rejected',decided_by=$2,updated_at=now() WHERE id=$1",[id,actor]);await this.ledger.event(c,'refund',id,'rejected',actor);return this.refundView({...r,state:'rejected'});}
   const next=await this.ledger.approveRefund(c,p,id,actor);
   if(await this.ledger.refundReserved(c,p.id)===BigInt(p.amount_minor))await this.commerce.revoke(c,p);
   return this.refundView(next);
  });
 }
 async submitRefund(id:string){
  const r=(await this.ledger.pool.query('SELECT intent_id FROM finance_refunds WHERE id=$1',[id])).rows[0];if(!r)throw new NotFoundException('Refund not found');
  const selected=await this.ledger.intentTx(r.intent_id,async(c,p)=>{
   const row=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(row.state!=='approved')return {row,p,send:false};
   if(p.environment!==this.gateway.environment())throw new ConflictException('Environment mismatch');
   await c.query("UPDATE finance_refunds SET state='submitting',updated_at=now() WHERE id=$1",[id]);await this.ledger.event(c,'refund',id,'provider_submission','system:m5');return {row,p,send:true};
  });
  if(!selected.send)return this.reconcileRefund(id);
  try{
   const result=await this.gateway.refund(selected.p.provider_reference,selected.row.amount_minor,id),provider=providerId(result.id);
   await this.ledger.intentTx(r.intent_id,async c=>{await c.query("UPDATE finance_refunds SET provider_id=$2,state='pending',updated_at=now() WHERE id=$1 AND state='submitting'",[id,provider]);});
  }catch{
   await this.ledger.pool.query("UPDATE finance_refunds SET state='uncertain',updated_at=now() WHERE id=$1 AND state='submitting'",[id]);return false;
  }return this.reconcileRefund(id);
 }
 async reconcileRefund(id:string,attachId?:string){
  const row=(await this.ledger.pool.query(`SELECT r.*,r.amount_minor::text,p.environment,x.provider_transaction_id FROM finance_refunds r JOIN payment_intents p ON p.id=r.intent_id
   JOIN payment_receipts x ON x.intent_id=p.id WHERE r.id=$1`,[id])).rows[0];if(!row)throw new NotFoundException('Refund not found');
  if(['requested','rejected','approved'].includes(row.state))return row.state==='rejected';
  if(['processed','failed'].includes(row.state))return true;
  let provider=attachId??row.provider_id;
  if(!provider)provider=await this.gateway.findRefund(row.provider_transaction_id,id);
  if(!provider)return false; // A lost POST response must not cause another non-idempotent POST.
  const result=await this.gateway.refundStatus(provider);
  const transaction=providerId(typeof result.transaction==='object'?result.transaction.id:result.transaction);
  if(transaction!==row.provider_transaction_id||String(result.amount)!==row.amount_minor||result.currency!=='NGN'||result.domain!==row.environment||(!row.external&&result.merchant_note!=='faji-refund-'+id))throw new ConflictException('Provider refund does not match obligation');
  return this.ledger.intentTx(row.intent_id,async(c,p)=>{
   const r=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(['processed','failed'].includes(r.state))return true;
   if(r.provider_id&&r.provider_id!==provider)throw new ConflictException('Refund provider identity changed');
   if(result.status==='processed'){
    await this.ledger.post(c,id+':processed',p.id,'refund_reserve','gateway_clearing',BigInt(r.amount_minor));
    await c.query("UPDATE finance_refunds SET provider_id=$2,state='processed',updated_at=now() WHERE id=$1",[id,provider]);
    await c.query("UPDATE finance_reconciliation_cases SET state='resolved' WHERE intent_id=$1 AND kind='external_refund' AND provider_id=$2",[p.id,provider]);
    await this.ledger.event(c,'refund',id,'provider_processed','system:m5');return true;
   }
   if(result.status==='failed'){
    await this.ledger.release(c,p,id,'refund_reserve',r.funding as Funding);
    await c.query("UPDATE finance_refunds SET provider_id=$2,state='failed',updated_at=now() WHERE id=$1",[id,provider]);await this.ledger.event(c,'refund',id,'provider_failed','system:m5');return true;
   }
   if(!['pending','processing','needs-attention'].includes(result.status))throw new ConflictException('Unknown refund state');
   await c.query("UPDATE finance_refunds SET provider_id=$2,state='pending',updated_at=now() WHERE id=$1",[id,provider]);return false;
  });
 }
 async adoptRefund(actor:string,intent:string,provider:string){
  const canonical=await this.gateway.refundStatus(provider);
  const created=await this.ledger.intentTx(intent,async(c,p)=>{
   const receipt=(await c.query('SELECT provider_transaction_id FROM payment_receipts WHERE intent_id=$1',[intent])).rows[0];
   if(!receipt||providerId(typeof canonical.transaction==='object'?canonical.transaction.id:canonical.transaction)!==receipt.provider_transaction_id||canonical.domain!==p.environment||canonical.currency!=='NGN')throw new ConflictException('Unrelated provider refund');
   const amount=minor(String(canonical.amount));
   const old=(await c.query('SELECT id FROM finance_refunds WHERE provider_id=$1',[provider])).rows[0];if(old)return old.id as string;
   if(await this.ledger.refundReserved(c,intent)+amount>BigInt(p.amount_minor))throw new ConflictException('Provider refund overlaps existing obligations; resolve the reconciliation case');
   const id=randomUUID();await c.query("INSERT INTO finance_refunds(id,intent_id,request_key,amount_minor,reason,created_by,external) VALUES($1,$2,$3,$4,'Provider-reported external refund',$5,true)",[id,intent,'provider-'+provider,amount.toString(),actor]);
   await this.ledger.approveRefund(c,p,id,actor);await c.query("UPDATE finance_refunds SET provider_id=$2,state='pending' WHERE id=$1",[id,provider]);
   if(await this.ledger.refundReserved(c,intent)===BigInt(p.amount_minor))await this.commerce.revoke(c,p);return id;
  });
  await this.reconcileRefund(created,provider);return {id:created};
 }
 async registerRecipient(actor:string,business:string,code:string){
  business=business.toLowerCase();
  await this.gateway.recipient(code);const environment=this.gateway.environment();
  return this.ledger.tx(business,async c=>{
   if(!(await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[business])).rowCount)throw new ConflictException('Approved merchant required');
   const r=(await c.query('INSERT INTO merchant_recipients(business_id,recipient_code,environment,verified_by) VALUES($1,$2,$3,$4) ON CONFLICT(business_id,recipient_code,environment) DO UPDATE SET active=true RETURNING id,recipient_code,environment,active',[business,code,environment,actor])).rows[0];
   await this.ledger.event(c,'recipient',r.id,'provider_verified',actor);return r;
  });
 }
 async disableRecipient(actor:string,id:string){const r=(await this.ledger.pool.query('SELECT business_id FROM merchant_recipients WHERE id=$1',[id])).rows[0];if(!r)throw new NotFoundException();return this.ledger.tx(r.business_id,async c=>{await c.query('UPDATE merchant_recipients SET active=false WHERE id=$1',[id]);await this.ledger.event(c,'recipient',id,'disabled',actor);return {id,active:false};});}
 async fulfilment(limit=100){
  const rows=(await this.ledger.pool.query(`SELECT p.id FROM payment_terms t JOIN payment_intents p ON p.id=t.intent_id
   WHERE t.resolution='confirmed' AND t.fulfilled_at IS NULL AND (
    EXISTS(SELECT 1 FROM finance_order_links l JOIN business_orders o ON o.id=l.order_id WHERE l.intent_id=p.id AND o.status='fulfilled') OR
    EXISTS(SELECT 1 FROM paid_holds h JOIN business_reservations r ON r.id=h.reservation_id WHERE h.intent_id=p.id AND h.status='confirmed' AND r.status='completed') OR
    EXISTS(SELECT 1 FROM paid_holds h JOIN business_event_config e ON e.catalogue_id=h.catalogue_id WHERE h.intent_id=p.id AND h.status='confirmed' AND h.kind='ticket' AND e.ends_at<=now()))
   ORDER BY p.created_at LIMIT $1`,[limit])).rows;
  for(const row of rows)await this.ledger.intentTx(row.id,async(c,p)=>{
   const completed=(await c.query(`SELECT coalesce(o.updated_at,r.updated_at,e.ends_at) AS at
    FROM payment_terms t LEFT JOIN finance_order_links l ON l.intent_id=t.intent_id LEFT JOIN business_orders o ON o.id=l.order_id AND o.status='fulfilled'
    LEFT JOIN paid_holds h ON h.intent_id=t.intent_id AND h.status='confirmed' LEFT JOIN business_reservations r ON r.id=h.reservation_id AND r.status='completed'
    LEFT JOIN business_event_config e ON e.catalogue_id=h.catalogue_id AND h.kind='ticket' AND e.ends_at<=now()
    WHERE t.intent_id=$1`,[p.id])).rows[0];
   if(completed?.at)await c.query("UPDATE payment_terms t SET fulfilled_at=$2,eligible_at=$2::timestamptz+(f.settlement_delay_hours*interval '1 hour') FROM finance_policies f WHERE t.intent_id=$1 AND f.id=t.policy_id AND t.fulfilled_at IS NULL",[p.id,completed.at]);
  });return rows.length;
 }
 async cancelResource(kind:'order'|'reservation',resource:string){
  if(typeof resource!=='string'||! /^[a-fA-F0-9-]{36}$/.test(resource))throw new ConflictException('Invalid cancellation event');
  const rows=kind==='order'?(await this.ledger.pool.query('SELECT intent_id FROM finance_order_links WHERE order_id=$1',[resource])).rows:(await this.ledger.pool.query('SELECT intent_id FROM paid_holds WHERE reservation_id=$1',[resource])).rows;
  for(const row of rows)await this.ledger.intentTx(row.intent_id,async(c,p)=>{
   if(p.status!=='succeeded')return;
   const terms=(await c.query('SELECT resolution FROM payment_terms WHERE intent_id=$1',[p.id])).rows[0];if(terms?.resolution==='refund_required')return;
   await this.commerce.revoke(c,p);await this.ledger.fullRefund(c,p,'Purchased resource was cancelled before fulfilment');
  });
 }
 async candidates(c:PoolClient,business:string,limit=100){
  const rows=(await c.query(`SELECT p.*,p.amount_minor::text,t.merchant_minor::text,t.commission_minor::text,t.recovered_minor::text,f.gateway_fee_bearer,fee.amount_minor::text AS fee_minor,
   COALESCE((SELECT sum(r.amount_minor) FROM finance_refunds r WHERE r.intent_id=p.id AND r.state IN ('approved','submitting','pending','processed','uncertain')),0)::text AS refunds,
   COALESCE((SELECT sum((part->>'amount')::bigint) FROM finance_refunds r,jsonb_array_elements(r.funding) part WHERE r.intent_id=p.id AND r.state IN ('approved','submitting','pending','processed','uncertain') AND part->>'account'='platform_revenue'),0)::text AS refund_commission,
   COALESCE((SELECT sum(COALESCE(d.resolved_amount_minor,d.amount_minor)) FROM finance_disputes d WHERE d.intent_id=p.id AND d.state='lost'),0)::text AS lost,
   COALESCE((SELECT sum((part->>'amount')::bigint) FROM finance_disputes d,jsonb_array_elements(COALESCE(d.resolved_funding,d.funding)) part WHERE d.intent_id=p.id AND d.state='lost' AND part->>'account'='platform_revenue'),0)::text AS lost_commission
   FROM payment_intents p JOIN payment_terms t ON t.intent_id=p.id JOIN finance_policies f ON f.id=t.policy_id JOIN payment_fees fee ON fee.intent_id=p.id
   WHERE p.business_id=$1 AND p.status='succeeded' AND t.allocated_at IS NOT NULL AND t.eligible_at<=now() AND t.resolution='confirmed'
   AND NOT EXISTS(SELECT 1 FROM settlement_claims s WHERE s.intent_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM finance_refunds r WHERE r.intent_id=p.id AND r.state='requested')
   AND NOT EXISTS(SELECT 1 FROM finance_disputes d WHERE d.intent_id=p.id AND d.state='open')
   AND NOT EXISTS(SELECT 1 FROM finance_reconciliation_cases x WHERE x.intent_id=p.id AND x.state='open')
   ORDER BY p.id LIMIT $2 FOR UPDATE OF p`,[business,limit])).rows;
  return rows.map(p=>({...p,net:BigInt(p.merchant_minor)-(p.gateway_fee_bearer==='merchant'?BigInt(p.fee_minor):0n)-BigInt(p.refunds)+BigInt(p.refund_commission)-BigInt(p.lost)+BigInt(p.lost_commission)-BigInt(p.recovered_minor)})).filter(p=>p.net>0n);
 }
 async batch(actor:string,business:string,recipientId:string,key:string){
  business=business.toLowerCase();
  await this.fulfilment();
  return this.ledger.tx(business,async c=>{
   const prior=(await c.query('SELECT *,amount_minor::text FROM settlement_batches WHERE business_id=$1 AND request_key=$2',[business,key])).rows[0];if(prior){if(prior.recipient_id!==recipientId)throw new ConflictException('Payout retry conflict');return this.batchView(prior);}
   const recipient=(await c.query('SELECT * FROM merchant_recipients WHERE id=$1 AND business_id=$2 AND active FOR SHARE',[recipientId,business])).rows[0];
   if(!(await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[business])).rowCount)throw new ConflictException('Approved merchant required');
   const policy=await this.ledger.policy(c,business);
   if(!recipient||recipient.environment!==this.gateway.environment())throw new ConflictException('Verified active recipient required');
   if((await c.query("SELECT 1 FROM finance_disputes d JOIN payment_intents p ON p.id=d.intent_id WHERE p.business_id=$1 AND d.state='open' UNION ALL SELECT 1 FROM finance_reconciliation_cases x JOIN payment_intents p ON p.id=x.intent_id WHERE p.business_id=$1 AND x.state='open' LIMIT 1",[business])).rowCount)throw new ConflictException('Resolve merchant financial exceptions first');
   const eligible=(await this.candidates(c,business)).filter(p=>p.environment===recipient.environment);
   let debt=-(await this.ledger.balance(c,'merchant_recoverable:'+business));
   if(debt<0n)debt=0n;
   const initialDebt=debt;
   for(const p of eligible){if(debt===0n)break;const take=p.net<debt?p.net:debt;await this.ledger.post(c,p.id+':recovery:'+(BigInt(p.recovered_minor)+take),p.id,'merchant_payable:'+business,'merchant_recoverable:'+business,take);await c.query('UPDATE payment_terms SET recovered_minor=recovered_minor+$2 WHERE intent_id=$1',[p.id,take.toString()]);p.net-=take;debt-=take;}
   const items=eligible.filter(p=>p.net>0n),amount=items.reduce((sum,p)=>sum+p.net,0n);
   const recovered=initialDebt-debt;
   if(amount===0n&&recovered===0n)throw new ConflictException('No eligible payable balance');if(amount>0n)minor(amount.toString());
   if(await this.ledger.balance(c,'merchant_payable:'+business)<amount)throw new ConflictException('Payable reconciliation mismatch');
   const id=randomUUID(),reference='faji-payout-'+randomUUID();
   const batch=(await c.query(`INSERT INTO settlement_batches(id,business_id,request_key,recipient_id,recipient_code,environment,provider_reference,amount_minor,created_by,recovered_minor,state,payout_fee_bearer)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *,amount_minor::text`,[id,business,key,recipientId,recipient.recipient_code,recipient.environment,reference,amount.toString(),actor,recovered.toString(),amount>0n?'approved':'recovered',policy.payout_fee_bearer])).rows[0];
   for(const p of items){await c.query('INSERT INTO settlement_items(batch_id,intent_id,amount_minor) VALUES($1,$2,$3)',[id,p.id,p.net.toString()]);await c.query('INSERT INTO settlement_claims(intent_id,batch_id) VALUES($1,$2)',[p.id,id]);await this.ledger.post(c,id+':reserve:'+p.id,p.id,'merchant_payable:'+business,'payout_reserve',p.net);}
   await this.ledger.event(c,'payout',id,amount>0n?'approved':'receivable_recovered',actor);if(amount>0n)await this.ledger.enqueue(c,'payout',id);return this.batchView(batch);
  });
 }
 batchView(b:any){return {id:b.id,businessId:b.business_id,amountMinor:String(b.amount_minor),recoveredMinor:String(b.recovered_minor??0),status:b.state,createdAt:b.created_at};}
 async payoutTx<T>(id:string,fn:(c:PoolClient,b:any)=>Promise<T>){const b=(await this.ledger.pool.query('SELECT business_id FROM settlement_batches WHERE id=$1',[id])).rows[0];if(!b)throw new NotFoundException('Payout not found');return this.ledger.tx(b.business_id,async c=>fn(c,(await c.query('SELECT *,amount_minor::text FROM settlement_batches WHERE id=$1 FOR UPDATE',[id])).rows[0]));}
 async submitPayout(id:string){
  const prior=(await this.ledger.pool.query('SELECT state FROM settlement_batches WHERE id=$1',[id])).rows[0];
  if(prior&&['uncertain','submitting'].includes(prior.state)){try{return await this.reconcilePayout(id);}catch(error){if(!(error instanceof ServiceUnavailableException))throw error;}}
  const selected=await this.payoutTx(id,async(c,b)=>{
   if(!['approved','uncertain','submitting'].includes(b.state))return {b,send:false};
   if(b.environment!==this.gateway.environment())throw new ConflictException('Payment environment mismatch');
   if(!(await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[b.business_id])).rowCount)throw new ConflictException('Merchant is no longer approved');
   if(!(await c.query('SELECT 1 FROM merchant_recipients WHERE id=$1 AND active',[b.recipient_id])).rowCount)throw new ConflictException('Recipient disabled');
   const blocked=(await c.query("SELECT 1 FROM finance_disputes d JOIN payment_intents p ON p.id=d.intent_id WHERE p.business_id=$1 AND d.state='open' UNION ALL SELECT 1 FROM finance_reconciliation_cases x JOIN payment_intents p ON p.id=x.intent_id WHERE p.business_id=$1 AND x.state='open' UNION ALL SELECT 1 FROM finance_refunds r JOIN settlement_items i ON i.intent_id=r.intent_id WHERE i.batch_id=$2 AND r.state='requested' LIMIT 1",[b.business_id,id])).rowCount;
   if(blocked){if(b.state!=='approved')return {b,send:false};throw new ConflictException('New financial exception blocks unsubmitted settlement; reconcile or cancel it');}
   await c.query("UPDATE settlement_batches SET state='submitting',updated_at=now() WHERE id=$1",[id]);await this.ledger.event(c,'payout',id,'provider_submission','system:m5');return {b,send:true};
  });
  if(!selected.send)return this.reconcilePayout(id);
  try{await this.gateway.recipient(selected.b.recipient_code);}catch{await this.ledger.pool.query("UPDATE settlement_batches SET state=$2 WHERE id=$1 AND state='submitting'",[id,selected.b.state]);return false;}
  try{
   const sent=await this.gateway.transfer(selected.b.provider_reference,selected.b.amount_minor,selected.b.recipient_code);
   if(sent.reference!==selected.b.provider_reference||typeof sent.transfer_code!=='string')throw new ConflictException('Transfer response mismatch');
   await this.payoutTx(id,async(c,b)=>{if(b.state==='submitting')await c.query("UPDATE settlement_batches SET transfer_code=$2,state=$3,updated_at=now() WHERE id=$1",[id,sent.transfer_code,sent.status==='otp'?'otp':'pending']);});
  }catch{await this.ledger.pool.query("UPDATE settlement_batches SET state='uncertain',updated_at=now() WHERE id=$1 AND state='submitting'",[id]);return false;}
  return this.reconcilePayout(id);
 }
 async reconcilePayout(id:string){
  const b=(await this.ledger.pool.query('SELECT *,amount_minor::text FROM settlement_batches WHERE id=$1',[id])).rows[0];if(!b)throw new NotFoundException('Payout not found');
  if(b.state==='recovered')return true;
  if(b.state==='approved')return false;
  const result=await this.gateway.transferStatus(b.provider_reference),recipient=typeof result.recipient==='object'?result.recipient.recipient_code:result.recipient;
  if(String(result.amount)!==b.amount_minor||result.currency!=='NGN'||result.domain!==b.environment||recipient!==b.recipient_code||(b.transfer_code&&result.transfer_code!==b.transfer_code))throw new ConflictException('Transfer verification mismatch');
  return this.payoutTx(id,async(c,current)=>{
   const items=(await c.query('SELECT *,amount_minor::text FROM settlement_items WHERE batch_id=$1',[id])).rows;
   if(['success','failed','reversed'].includes(result.status))await this.payoutFee(c,current,items[0]?.intent_id,result.fee_charged,result.status==='reversed');
   if(['failed','reversed'].includes(current.state)){if(result.status!==current.state)await this.ledger.case(c,items[0].intent_id,'payout_state_mismatch',b.provider_reference);return true;}
   if(result.status==='success'){
    if(current.state!=='succeeded'){for(const item of items)await this.ledger.post(c,id+':paid:'+item.intent_id,item.intent_id,'payout_reserve','gateway_clearing',BigInt(item.amount_minor));await c.query("UPDATE settlement_batches SET state='succeeded',transfer_code=$2,updated_at=now() WHERE id=$1",[id,result.transfer_code]);await this.ledger.event(c,'payout',id,'provider_succeeded','system:m5');}return true;
   }
   if(['failed','reversed'].includes(result.status)){
    const source=current.state==='succeeded'?'gateway_clearing':'payout_reserve';
    if(current.state==='succeeded'&&result.status!=='reversed')throw new ConflictException('Invalid successful payout regression');
    for(const item of items)await this.ledger.post(c,id+':returned:'+item.intent_id,item.intent_id,source,'merchant_payable:'+b.business_id,BigInt(item.amount_minor));
    await c.query('DELETE FROM settlement_claims WHERE batch_id=$1',[id]);await c.query('UPDATE settlement_batches SET state=$2,transfer_code=$3,updated_at=now() WHERE id=$1',[id,result.status,result.transfer_code]);await this.ledger.event(c,'payout',id,'provider_'+result.status,'system:m5');return true;
   }
   if(current.state==='succeeded')return true;
   if(!['pending','otp','received','processing'].includes(result.status))throw new ConflictException('Unknown transfer state');
   await c.query('UPDATE settlement_batches SET state=$2,transfer_code=$3,updated_at=now() WHERE id=$1',[id,result.status==='otp'?'otp':'pending',result.transfer_code]);return false;
  });
 }
 async finalize(actor:string,id:string,otp:string){
  const b=await this.payoutTx(id,async(c,b)=>{if(b.state!=='otp'||!b.transfer_code)throw new ConflictException('Payout does not require OTP');await this.ledger.event(c,'payout',id,'otp_submitted',actor);await c.query("UPDATE settlement_batches SET state='pending' WHERE id=$1",[id]);await this.ledger.enqueue(c,'payout',id,10);return b;});
  await this.gateway.finalizeTransfer(b.transfer_code,otp);
  return {id,pending:true};
 }
 async payoutFee(c:PoolClient,b:any,intent:string,fee:unknown,reversed:boolean){
  if(!intent)return;
  if(fee==null){await this.ledger.case(c,intent,'payout_fee_unverified',b.provider_reference);return;}
  if(typeof fee!=='number'||!Number.isSafeInteger(fee)||fee<0)throw new ConflictException('Invalid transfer fee');
  const old=(await c.query('SELECT amount_minor::text FROM settlement_fees WHERE batch_id=$1',[b.id])).rows[0];
  const account=b.payout_fee_bearer==='merchant'?'merchant_recoverable:'+b.business_id:'gateway_fee_expense';
  if(!old){await c.query('INSERT INTO settlement_fees(batch_id,amount_minor) VALUES($1,$2)',[b.id,String(fee)]);await this.ledger.post(c,b.id+':fee',intent,account,'gateway_clearing',BigInt(fee));}
  else if(old.amount_minor!==String(fee)){
   if(reversed&&BigInt(fee)<=BigInt(old.amount_minor)){
    const returned=BigInt(old.amount_minor)-BigInt(fee),prior=(await c.query('SELECT amount_minor::text FROM settlement_fee_returns WHERE batch_id=$1',[b.id])).rows[0];
    if(prior&&prior.amount_minor!==returned.toString())await this.ledger.case(c,intent,'payout_fee_mismatch',b.provider_reference);
    else if(!prior){await c.query('INSERT INTO settlement_fee_returns(batch_id,amount_minor) VALUES($1,$2)',[b.id,returned.toString()]);await this.ledger.post(c,b.id+':fee-return',intent,'gateway_clearing',account,returned);}
   }else await this.ledger.case(c,intent,'payout_fee_mismatch',b.provider_reference);
  }
  await c.query("UPDATE finance_reconciliation_cases SET state='resolved' WHERE intent_id=$1 AND kind='payout_fee_unverified' AND provider_id=$2",[intent,b.provider_reference]);
 }
 async cancelPayout(actor:string,id:string){return this.payoutTx(id,async(c,b)=>{
  if(b.state==='failed')return this.batchView(b);if(b.state!=='approved')throw new ConflictException('Only an unsubmitted payout can be cancelled');
  const items=(await c.query('SELECT *,amount_minor::text FROM settlement_items WHERE batch_id=$1',[id])).rows;
  for(const item of items)await this.ledger.post(c,id+':cancel:'+item.intent_id,item.intent_id,'payout_reserve','merchant_payable:'+b.business_id,BigInt(item.amount_minor));
  await c.query('DELETE FROM settlement_claims WHERE batch_id=$1',[id]);await c.query("UPDATE settlement_batches SET state='failed',updated_at=now() WHERE id=$1",[id]);await this.ledger.event(c,'payout',id,'cancelled_before_submission',actor);return this.batchView({...b,state:'failed'});
 });}
 async reconcileDispute(provider:string){
  const d=await this.gateway.dispute(provider),transaction=providerId(typeof d.transaction==='object'?d.transaction.id:d.transaction);
  const known=(await this.ledger.pool.query('SELECT intent_id FROM payment_receipts WHERE provider_transaction_id=$1',[transaction])).rows[0];if(!known)throw new NotFoundException('Disputed payment not found');
  return this.ledger.intentTx(known.intent_id,async(c,p)=>{
   if(d.currency!=='NGN'||d.domain!==p.environment)throw new ConflictException('Dispute identity mismatch');
   const amount=minor(p.amount_minor);
   if(amount>BigInt(p.amount_minor))throw new ConflictException('Dispute exceeds capture');
   let local=(await c.query('SELECT *,amount_minor::text FROM finance_disputes WHERE provider_id=$1 FOR UPDATE',[provider])).rows[0];
   if(!local){
    const t=(await c.query('SELECT commission_minor::text,allocated_at FROM payment_terms WHERE intent_id=$1',[p.id])).rows[0];
    const commission=t?.allocated_at?BigInt(t.commission_minor)*amount/BigInt(p.amount_minor):0n;
    const funding=await this.ledger.fundedParts(c,p,amount,commission);
    await this.ledger.reserve(c,p,'dispute-'+provider,'dispute_reserve',funding);
    local=(await c.query("INSERT INTO finance_disputes(provider_id,intent_id,amount_minor,state,funding) VALUES($1,$2,$3,'open',$4::jsonb) RETURNING *",[provider,p.id,amount.toString(),JSON.stringify(funding)])).rows[0];
    await this.ledger.event(c,'dispute',provider,'opened','system:m5');
   }else if(local.intent_id!==p.id||BigInt(local.amount_minor)!==amount)throw new ConflictException('Dispute evidence changed');
   if(local.state!=='open')return true;
   if(d.status==='resolved'){
    const lost=['merchant-accepted','accepted','auto-accepted'].includes(d.resolution),won=['declined','merchant-declined'].includes(d.resolution);
    if(!lost&&!won)throw new ConflictException('Unknown dispute resolution');
    let lossFunding:Funding=[];let loss=0n;
    if(lost){
     loss=minor(String(d.refund_amount??d.amount??p.amount_minor));if(loss>amount)throw new ConflictException('Resolved dispute exceeds reserved capture');
     lossFunding=splitFunding(local.funding as Funding,loss);
     const unused=(local.funding as Funding).map((part,i)=>({account:part.account,amount:(BigInt(part.amount)-BigInt(lossFunding[i].amount)).toString()}));
     await this.ledger.release(c,p,'dispute-'+provider+':unused','dispute_reserve',unused);
     await this.ledger.post(c,'dispute-'+provider+':lost',p.id,'dispute_reserve','gateway_clearing',loss);await this.commerce.revoke(c,p);
    }
    else await this.ledger.release(c,p,'dispute-'+provider,'dispute_reserve',local.funding as Funding);
    await c.query('UPDATE finance_disputes SET state=$2,resolution=$3,resolved_amount_minor=$4,resolved_funding=$5::jsonb,updated_at=now() WHERE provider_id=$1',[provider,lost?'lost':'won',d.resolution,loss.toString(),JSON.stringify(lossFunding)]);await this.ledger.event(c,'dispute',provider,lost?'lost':'won','system:m5');return true;
   }
   await this.ledger.enqueue(c,'dispute',provider,60);return false;
  });
 }
 async resolveDispute(actor:string,id:string,input:{resolution:'merchant-accepted'|'declined';amountMinor:string;message:string;uploadedFilename?:string}){
  const d=(await this.ledger.pool.query('SELECT * FROM finance_disputes WHERE provider_id=$1',[id])).rows[0];if(!d)throw new NotFoundException();
  if(d.state!=='open')return {id,status:d.state};if(minor(input.amountMinor)>BigInt(d.amount_minor))throw new ConflictException('Resolution exceeds reserved dispute exposure');
  if(input.resolution==='declined'&&!input.uploadedFilename)throw new ConflictException('Provider evidence filename required');
  await this.ledger.intentTx(d.intent_id,async c=>this.ledger.event(c,'dispute',id,'resolution_requested',actor));
  await this.gateway.resolveDispute(id,input.resolution,input.amountMinor,input.message,input.uploadedFilename);await this.reconcileDispute(id);return {id,pending:true};
 }
 async providerEvent(event:any){
  if(typeof event.event!=='string'||!event.data)return;
  if(event.event.startsWith('refund.')){
   const provider=providerId(event.data.id),r=(await this.ledger.pool.query('SELECT id FROM finance_refunds WHERE provider_id=$1',[provider])).rows[0];
   if(r){await this.reconcileRefund(r.id);const local=(await this.ledger.pool.query('SELECT intent_id,state,provider_id FROM finance_refunds WHERE id=$1',[r.id])).rows[0];if(['processed','failed'].includes(local.state)){const canonical=await this.gateway.refundStatus(provider);if(canonical.status!==local.state)await this.ledger.intentTx(local.intent_id,async c=>this.ledger.case(c,local.intent_id,'refund_state_mismatch',provider));}}else{
    const canonical=await this.gateway.refundStatus(provider),transaction=providerId(typeof canonical.transaction==='object'?canonical.transaction.id:canonical.transaction);
    const note=typeof canonical.merchant_note==='string'?canonical.merchant_note.match(/^faji-refund-([a-f0-9-]{36})$/):null;
    const pending=note?(await this.ledger.pool.query('SELECT id FROM finance_refunds WHERE id=$1',[note[1]])).rows[0]:null;
    if(pending)await this.reconcileRefund(pending.id,provider);
    else{const known=(await this.ledger.pool.query('SELECT intent_id FROM payment_receipts WHERE provider_transaction_id=$1',[transaction])).rows[0];if(known)await this.ledger.intentTx(known.intent_id,async(c,p)=>this.ledger.case(c,p.id,'external_refund',provider));}
   }
  }else if(event.event.startsWith('transfer.')){
   if(typeof event.data.reference!=='string')throw new ConflictException('Missing transfer reference');const b=(await this.ledger.pool.query('SELECT id FROM settlement_batches WHERE provider_reference=$1',[event.data.reference])).rows[0];if(b)await this.reconcilePayout(b.id);
  }else if(event.event.startsWith('charge.dispute.'))await this.reconcileDispute(providerId(event.data.id));
 }
 async reconcilePayment(id:string){
  const p=(await this.ledger.pool.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1',[id])).rows[0];if(!p)throw new NotFoundException();
  const d=await this.gateway.transaction(p.provider_reference);
  if(d.reference!==p.provider_reference||d.domain!==p.environment||String(d.amount)!==p.amount_minor||d.currency!=='NGN')throw new ConflictException('Provider payment mismatch');
  if(p.status!=='succeeded')return false;
  await this.ledger.intentTx(id,async(c,current)=>{
   await this.ledger.fee(c,current,d.fees??undefined);
   const t=(await c.query('SELECT resolution FROM payment_terms WHERE intent_id=$1',[id])).rows[0];if(t?.resolution==='confirmed')await this.ledger.allocate(c,current);
   if(['reversed','refunded'].includes(d.status)){
    const accounted=BigInt((await c.query("SELECT (COALESCE((SELECT sum(amount_minor) FROM finance_refunds WHERE intent_id=$1 AND state='processed'),0)+COALESCE((SELECT sum(resolved_amount_minor) FROM finance_disputes WHERE intent_id=$1 AND state='lost'),0))::text AS total",[id])).rows[0].total);
    if(accounted<BigInt(p.amount_minor))await this.ledger.case(c,id,'unaccounted_provider_reversal',providerId(d.id));
    else await c.query("UPDATE finance_reconciliation_cases SET state='resolved' WHERE intent_id=$1 AND kind='unaccounted_provider_reversal'",[id]);
   }
  });
  const disputes=await this.gateway.transactionDisputes(providerId(d.id));for(const dispute of disputes)await this.reconcileDispute(providerId(dispute.id));
  const refunds=await this.gateway.transactionRefunds(providerId(d.id));for(const refund of refunds)await this.providerEvent({event:'refund.reconciliation',data:{id:refund.id}});return true;
 }
 async customerRefunds(subject:string,limit:number,offset:number){return (await this.ledger.pool.query('SELECT r.*,r.amount_minor::text FROM finance_refunds r JOIN payment_intents p ON p.id=r.intent_id WHERE p.customer_subject=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT $2 OFFSET $3',[subject,limit,offset])).rows.map(r=>this.refundView(r));}
 async merchantFinance(who:VerifiedIdentity,business:string,limit:number,offset:number){
  business=business.toLowerCase();
  return this.commerce.customers.withAccountTransaction(who,async c=>{await this.ledger.lock(c,business);await this.commerce.merchant(c,who.subject,business,undefined,true);
   const payable=await this.ledger.balance(c,'merchant_payable:'+business),receivable=await this.ledger.balance(c,'merchant_recoverable:'+business);
   const payments=(await c.query(`SELECT p.id,p.amount_minor::text,p.status,t.commission_minor::text,t.merchant_minor::text,t.resolution,t.eligible_at,
    f.amount_minor::text AS gateway_fee_minor FROM payment_intents p LEFT JOIN payment_terms t ON t.intent_id=p.id LEFT JOIN payment_fees f ON f.intent_id=p.id
    WHERE p.business_id=$1 ORDER BY p.created_at DESC,p.id DESC LIMIT $2 OFFSET $3`,[business,limit,offset])).rows;
   const batches=(await c.query('SELECT id,business_id,amount_minor::text,recovered_minor::text,state,created_at FROM settlement_batches WHERE business_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3',[business,limit,offset])).rows.map(b=>this.batchView(b));
   const policy=(await c.query('SELECT * FROM finance_policies WHERE business_id=$1 ORDER BY version DESC LIMIT 1',[business])).rows[0];
   return {payableMinor:payable.toString(),recoveryDebtMinor:(receivable<0n?-receivable:0n).toString(),policy:this.policyView(policy),payments,batches};
  });
 }
 async overview(limit:number,offset:number){return {
  refunds:(await this.ledger.pool.query('SELECT id,intent_id,amount_minor::text,state,created_at FROM finance_refunds ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2',[limit,offset])).rows,
  payouts:(await this.ledger.pool.query('SELECT id,business_id,amount_minor::text,state,created_at FROM settlement_batches ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2',[limit,offset])).rows,
  disputes:(await this.ledger.pool.query('SELECT provider_id,intent_id,amount_minor::text,state,resolution FROM finance_disputes ORDER BY created_at DESC,provider_id DESC LIMIT $1 OFFSET $2',[limit,offset])).rows,
  exceptions:(await this.ledger.pool.query("SELECT id,intent_id,kind,provider_id FROM finance_reconciliation_cases WHERE state='open' ORDER BY created_at,id LIMIT $1 OFFSET $2",[limit,offset])).rows,
  jobs:(await this.ledger.pool.query("SELECT id,kind,resource_id,state,attempts,next_at,lease_until,last_error FROM finance_jobs WHERE state<>'done' ORDER BY CASE state WHEN 'dead' THEN 0 ELSE 1 END,next_at,id LIMIT $1 OFFSET $2",[limit,offset])).rows,
  jobCounts:(await this.ledger.pool.query("SELECT state,count(*)::int AS count FROM finance_jobs GROUP BY state")).rows
 };}
}
