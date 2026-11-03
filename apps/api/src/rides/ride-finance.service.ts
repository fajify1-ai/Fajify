import {randomUUID} from 'node:crypto';
import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {FinanceLedger,type FinanceIntent} from '../payments/finance-ledger.service';
import {PaystackGateway} from '../payments/paystack.gateway';

const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function operatorBusiness(){
 const id=process.env.FAJI_RIDE_OPERATOR_BUSINESS_ID;
 if(!id||!validUuid.test(id))throw new ServiceUnavailableException('Ride operator finance business not configured');
 return id;
}
@Injectable()
export class RideFinanceService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(FinanceLedger)private readonly ledger:FinanceLedger,
 @Inject(PaystackGateway)private readonly gateway:PaystackGateway){}
 async prepare(subject:string,rideId:string){
  const business=operatorBusiness(),environment=this.gateway.environment();
  return this.ledger.tx(business,async c=>{
   await this.ledger.environment(c,environment);
   const account=await c.query("SELECT 1 FROM account_access a JOIN user_profiles p ON p.identity_subject=a.identity_subject WHERE a.identity_subject=$1 AND NOT a.suspended AND NOT p.suspended FOR SHARE OF a,p",[subject]);
   if(!account.rowCount)throw new ForbiddenException('Account not eligible');
   const ride=await c.query<{status:string;customer_subject:string;gross_minor:string;payment_intent_id:string|null}>(`SELECT r.status,r.customer_subject,f.gross_minor::text,f.payment_intent_id
     FROM ride_requests r JOIN ride_fares f ON f.ride_id=r.id WHERE r.id=$1 FOR UPDATE OF r,f`,[rideId]);
   if(!ride.rows[0]||ride.rows[0].customer_subject!==subject)throw new NotFoundException();
   if(ride.rows[0].status!=='completed'||BigInt(ride.rows[0].gross_minor)<1n)throw new ConflictException('Trip not payable');
   if(ride.rows[0].payment_intent_id)return {rideId,paymentIntentId:ride.rows[0].payment_intent_id,replayed:true};
   const active=await c.query("SELECT 1 FROM business_onboarding WHERE id=$1 AND status='approved' FOR SHARE",[business]);
   if(!active.rowCount)throw new ConflictException('Ride operator finance account unavailable');
   const policy=await this.ledger.policy(c,business);
   const id=randomUUID();
   const reference='faji-'+randomUUID();
   await c.query(`INSERT INTO payment_intents(id,customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7,'NGN')`,
      [id,subject,business,'ride-'+rideId,reference,environment,ride.rows[0].gross_minor]);
   await c.query('INSERT INTO ride_payment_links(ride_id,intent_id) VALUES($1,$2)',[rideId,id]);
   await c.query('UPDATE ride_fares SET payment_intent_id=$2 WHERE ride_id=$1',[rideId,id]);
   const intent:FinanceIntent={id,customer_subject:subject,business_id:business,request_key:'ride-'+rideId,amount_minor:ride.rows[0].gross_minor,currency:'NGN',environment,provider_reference:reference,status:'pending'};
   await this.ledger.terms(c,intent,policy.id);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.payment.prepared',$1)",[JSON.stringify({rideId,paymentIntentId:id})]);
   return {rideId,paymentIntentId:id,replayed:false};
  });
 }
 async earnings(subject:string,limit=20){
  return (await this.pool.query(`SELECT r.id AS ride_id,r.status AS ride_status,
    f.gross_minor::text,f.commission_minor::text,f.driver_minor::text,f.payment_state,f.settlement_state
   FROM ride_drivers d JOIN ride_requests r ON r.assigned_driver_id=d.id
   JOIN ride_fares f ON f.ride_id=r.id
   WHERE d.identity_subject=$1 ORDER BY r.created_at DESC LIMIT $2`,[subject,limit])).rows;
 }
 async reservePayout(actor:string,rideId:string){
  const business=operatorBusiness();
  return this.ledger.tx(business,async c=>{
   const f=await c.query<{id:string;driver_id:string;driver_minor:string;payment_intent_id:string;payment_state:string;settlement_state:string;status:string}>(`
    SELECT r.id,r.assigned_driver_id AS driver_id,f.driver_minor::text,f.payment_intent_id,f.payment_state,f.settlement_state,r.status
    FROM ride_requests r JOIN ride_fares f ON f.ride_id=r.id WHERE r.id=$1 FOR UPDATE OF r,f`,[rideId]);
   const row=f.rows[0];if(!row)throw new NotFoundException();
   const prior=await c.query<{id:string;state:string}>('SELECT id,state FROM ride_driver_payouts WHERE ride_id=$1',[rideId]);
   if(prior.rows[0])return {id:prior.rows[0].id,state:prior.rows[0].state,replayed:true};
   if(row.status!=='completed'||row.payment_state!=='verified'||!row.payment_intent_id||BigInt(row.driver_minor)<1n)
    throw new ConflictException('Verified completed trip required');
   const source=await c.query(`SELECT 1 FROM payment_intents p JOIN payment_receipts receipt ON receipt.intent_id=p.id
     JOIN payment_terms terms ON terms.intent_id=p.id AND terms.allocated_at IS NOT NULL
     WHERE p.id=$1 AND p.status='succeeded' AND p.business_id=$2 AND p.amount_minor=(
       SELECT gross_minor FROM ride_fares WHERE ride_id=$3)`,[row.payment_intent_id,business,rideId]);
   if(!source.rowCount)throw new ConflictException('Verified and allocated M5 capture required');
   const blocked=await c.query(`SELECT 1 FROM finance_disputes WHERE intent_id=$1 AND state IN ('open','lost')
     UNION SELECT 1 FROM finance_refunds WHERE intent_id=$1 AND state IN ('requested','approved','submitting','pending','processed','uncertain') LIMIT 1`,[row.payment_intent_id]);
   if(blocked.rowCount)throw new ConflictException('Refund or dispute exposure prevents settlement');
   const bank=await c.query<{payout_recipient_ref:string}>(`SELECT b.payout_recipient_ref FROM ride_driver_bank_refs b JOIN ride_drivers d ON d.id=b.driver_id
      WHERE b.driver_id=$1 AND b.verified AND d.status='approved'`,[row.driver_id]);
   if(!bank.rows[0])throw new ConflictException('Driver payout recipient not verified');
   if(await this.ledger.balance(c,'merchant_payable:'+business)<BigInt(row.driver_minor))
    throw new ConflictException('Insufficient verified payable balance');
   const id=randomUUID(),reference='faji-ride-'+id;
   await c.query(`INSERT INTO ride_driver_payouts(id,ride_id,driver_id,recipient_ref,amount_minor,provider_reference)
     VALUES($1,$2,$3,$4,$5,$6)`,[id,rideId,row.driver_id,bank.rows[0].payout_recipient_ref,row.driver_minor,reference]);
   await this.ledger.post(c,'ride:'+rideId+':driver-reserved',row.payment_intent_id,
       'merchant_payable:'+business,'payout_reserve',BigInt(row.driver_minor));
   await c.query("UPDATE ride_fares SET settlement_state='submitted' WHERE ride_id=$1",[rideId]);
   await c.query(`INSERT INTO ride_financial_events(ride_id,actor_subject,event_type,amount_minor,idempotency_key)
     VALUES($1,$2,'payout_reserved',$3,$4)`,[rideId,actor,row.driver_minor,'ride:'+rideId+':payout_reserved']);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.payout.reserved',$1)",[JSON.stringify({rideId,payoutId:id})]);
   return {id,state:'reserved',replayed:false};
  });
 }
 async submitPayout(actor:string,payoutId:string){
  if(process.env.FAJI_RIDE_PAYOUT_ENABLED!=='true')throw new ServiceUnavailableException('Ride payout execution disabled by operator');
  const business=operatorBusiness();
  const item=await this.ledger.tx(business,async c=>{
   const p=await c.query<{state:string;provider_reference:string;recipient_ref:string;amount_minor:string}>(`SELECT state,provider_reference,recipient_ref,amount_minor::text FROM ride_driver_payouts WHERE id=$1 FOR UPDATE`,[payoutId]);
   if(!p.rows[0])throw new NotFoundException();
   if(p.rows[0].state!=='reserved')throw new ConflictException('Payout already submitted or awaiting reconciliation');
   await c.query("UPDATE ride_driver_payouts SET state='submitting',updated_at=now() WHERE id=$1",[payoutId]);
   return p.rows[0];
  });
  // An ambiguous provider response is NOT retried. Recovery verifies the original reference.
  try{
   await this.gateway.transfer(item.provider_reference,item.amount_minor,item.recipient_ref);
  }finally{
   await this.ledger.tx(business,async c=>{
    await c.query("UPDATE ride_driver_payouts SET state='uncertain',updated_at=now() WHERE id=$1 AND state='submitting'",[payoutId]);
    await this.ledger.event(c,'ride_payout',payoutId,'provider_submission_uncertain',actor);
   });
  }
  return {payoutId,state:'uncertain'};
 }
 async reconcilePayout(actor:string,payoutId:string){
  const business=operatorBusiness();
  const identified=await this.pool.query<{provider_reference:string;recipient_ref:string;amount_minor:string}>(`SELECT provider_reference,recipient_ref,amount_minor::text FROM ride_driver_payouts WHERE id=$1`,[payoutId]);
  if(!identified.rows[0])throw new NotFoundException();
  const expected=identified.rows[0];
  const provider=await this.gateway.transferStatus(expected.provider_reference);
  if(provider.reference!==expected.provider_reference||provider.domain!==this.gateway.environment()||
     Number(provider.amount)!==Number(expected.amount_minor)||provider.recipient?.recipient_code!==expected.recipient_ref)
   throw new ConflictException('Payout evidence mismatch');
  return this.ledger.tx(business,async c=>{
   const r=await c.query<{state:string;ride_id:string;amount_minor:string;provider_reference:string}>(`SELECT state,ride_id,amount_minor::text,provider_reference FROM ride_driver_payouts WHERE id=$1 FOR UPDATE`,[payoutId]);
   const p=r.rows[0];if(!p||p.provider_reference!==expected.provider_reference)throw new ConflictException('Payout changed');
   if(p.state==='reconciled'||p.state==='failed')return {payoutId,state:p.state,replayed:true};
   if(!['submitting','uncertain'].includes(p.state))throw new ConflictException('Payout not yet submitted');
   if(!['success','failed'].includes(provider.status))return {payoutId,state:'uncertain',replayed:false};
   const fare=await c.query<{payment_intent_id:string}>(`SELECT payment_intent_id FROM ride_fares WHERE ride_id=$1 FOR UPDATE`,[p.ride_id]);
   const amount=BigInt(p.amount_minor),intent=fare.rows[0].payment_intent_id;
   if(provider.status==='success'){
    await this.ledger.post(c,'ride:'+p.ride_id+':driver-paid',intent,'payout_reserve','gateway_clearing',amount);
    await c.query("UPDATE ride_driver_payouts SET state='reconciled',updated_at=now() WHERE id=$1",[payoutId]);
    await c.query("UPDATE ride_fares SET settlement_state='reconciled' WHERE ride_id=$1",[p.ride_id]);
   }else{
    await this.ledger.post(c,'ride:'+p.ride_id+':driver-release',intent,'payout_reserve','merchant_payable:'+business,amount);
    await c.query("UPDATE ride_driver_payouts SET state='failed',updated_at=now() WHERE id=$1",[payoutId]);
    await c.query("UPDATE ride_fares SET settlement_state='blocked' WHERE ride_id=$1",[p.ride_id]);
   }
   await this.ledger.event(c,'ride_payout',payoutId,'provider_'+provider.status,actor);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.payout.reconciled',$1)",[JSON.stringify({rideId:p.ride_id,payoutId,status:provider.status})]);
   return {payoutId,state:provider.status==='success'?'reconciled':'failed',replayed:false};
  });
 }
}
