import {createHash} from 'node:crypto';
import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {PaystackGateway,type VerifiedCharge} from './paystack.gateway';
import {CommerceLifecycle} from './commerce-lifecycle.service';
import {FinancialOperations} from './financial-operations.service';
import {parseProviderJson} from './finance-provider';
import type {FinanceIntent} from './finance-ledger.service';
import {requireSimulatedPayments} from './payment-mode';

type Intent=FinanceIntent & {execution_mode:'legacy'|'simulated'};
export type SimulatedOutcome='succeeded'|'failed'|'cancelled';
@Injectable()
export class PaymentsService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(PaystackGateway)private readonly gateway:PaystackGateway,
  @Inject(CommerceLifecycle)private readonly commerce:CommerceLifecycle,@Inject(FinancialOperations)private readonly operations:FinancialOperations){}

 async webhook(raw:Buffer,signature:unknown){
  this.gateway.verifySignature(raw,signature);
  let event:{event?:unknown;data?:{reference?:unknown}};
  try{event=parseProviderJson(raw.toString('utf8'));}catch{throw new BadRequestException('Invalid payment event');}
  if(!event||typeof event!=='object'||Array.isArray(event))throw new BadRequestException('Invalid payment event');
  if(event.event!=='charge.success'){await this.operations.providerEvent(event);return {received:true};}
  const reference=event.data?.reference;
  if(typeof reference!=='string'||! /^[A-Za-z0-9_-]{8,100}$/.test(reference))throw new BadRequestException('Invalid payment reference');
  // Look up before outbound verification; unknown references never create an intent.
  const known=await this.pool.query('SELECT id FROM payment_intents WHERE provider_reference=$1',[reference]);
  if(!known.rowCount)throw new NotFoundException('Payment intent not found');
  // A signed notification only triggers independent verification; its amount/status is not authority.
  const charge=await this.gateway.verify(reference);
  await this.capture(reference,charge,{hash:createHash('sha256').update(raw).digest('hex'),source:'webhook',actor:null});
  return {received:true};
 }

 /** Recovery from a missed notification. The caller selects a local intent, never a provider reference or amount. */
 async recheck(actor:string,id:string){
  const known=await this.pool.query<{provider_reference:string}>('SELECT provider_reference FROM payment_intents WHERE id=$1',[id]);
  const intent=known.rows[0];
  if(!intent)throw new NotFoundException('Payment intent not found');
  // Persist intent to contact the provider before making an outbound request. Audit failure fails closed.
  await this.pool.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'payment.provider_recheck_requested','payment_intent',$2)",[actor,id]);
  const charge=await this.gateway.verify(intent.provider_reference);
  return this.capture(intent.provider_reference,charge,{
   hash:createHash('sha256').update(JSON.stringify(charge)).digest('hex'),source:'provider_recheck',actor
  });
 }

 async simulate(actor:string,id:string,outcome:SimulatedOutcome){
  requireSimulatedPayments();
  const known=(await this.pool.query<{business_id:string;execution_mode:string}>(
   'SELECT business_id,execution_mode FROM payment_intents WHERE id=$1',[id])).rows[0];
  if(!known)throw new NotFoundException('Payment not found');
  if(known.execution_mode!=='simulated')throw new ConflictException('Payment is not a simulated payment');
  if(outcome==='succeeded'){
   const intent=(await this.pool.query<{provider_reference:string;amount_minor:string;currency:string;environment:'test'|'live'}>(
    'SELECT provider_reference,amount_minor::text,currency,environment FROM payment_intents WHERE id=$1',[id])).rows[0];
   if(!intent)throw new NotFoundException('Payment not found');
   const charge:VerifiedCharge={id:'sim-'+id,reference:intent.provider_reference,amountMinor:intent.amount_minor,
    currency:intent.currency,environment:intent.environment,feeMinor:0};
   return {...await this.capture(intent.provider_reference,charge,{
    hash:createHash('sha256').update(JSON.stringify({source:'simulation',paymentIntentId:id,outcome})).digest('hex'),
    source:'simulation',actor
   }),mode:'simulated' as const};
  }
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await this.commerce.ledger.lock(client,known.business_id);
   const result=await client.query<Intent>(
    'SELECT id,amount_minor::text,currency,environment,status,business_id,customer_subject,provider_reference,execution_mode FROM payment_intents WHERE id=$1 FOR UPDATE',[id]);
   const intent=result.rows[0];
   if(!intent)throw new NotFoundException('Payment not found');
   if(intent.execution_mode!=='simulated')throw new ConflictException('Payment is not a simulated payment');
   if(intent.status===outcome){await client.query('COMMIT');return {paymentIntentId:id,status:outcome,replayed:true,mode:'simulated' as const};}
   if(intent.status!=='pending')throw new ConflictException('Payment is already in a terminal state');
   if(!(await client.query("SELECT 1 FROM checkout_sessions WHERE intent_id=$1 AND state='simulated' FOR UPDATE",[id])).rowCount)
    throw new ConflictException('Simulated checkout has not been started');
   const hold=(await client.query('SELECT * FROM paid_holds WHERE intent_id=$1 FOR UPDATE',[id])).rows[0];
   if(hold)await this.commerce.releaseHold(client,hold,'cancelled');
   await client.query("UPDATE payment_intents SET status=$2,updated_at=now() WHERE id=$1",[id,outcome]);
   await client.query("UPDATE checkout_sessions SET state='closed',authorization_url=NULL,access_code=NULL WHERE intent_id=$1",[id]);
   await client.query("UPDATE payment_terms SET resolution='cancelled' WHERE intent_id=$1 AND resolution='pending'",[id]);
   const event=outcome==='failed'?'simulated_failure':'simulated_cancellation';
   await this.lifecycleEvent(client,id,event,'pending',outcome,actor);
   const action=outcome==='failed'?'payment.simulated.failed':'payment.simulated.cancelled';
   await client.query('INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,\'payment_intent\',$3)',[actor,action,id]);
   await this.commerce.ledger.event(client,'payment',id,action,actor);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)",[action,JSON.stringify({paymentIntentId:id})]);
   await client.query('COMMIT');
   return {paymentIntentId:id,status:outcome,replayed:false,mode:'simulated' as const};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }

 private async lifecycleEvent(client:PoolClient,id:string,event:string,previous:string,resulting:string,actor:string){
  const key='payment:'+id+':'+event;
  await client.query(`INSERT INTO payment_lifecycle_events(intent_id,event_type,previous_status,resulting_status,actor_subject,source,idempotency_key)
   VALUES($1,$2,$3,$4,$5,'simulation',$6) ON CONFLICT(idempotency_key) DO NOTHING`,[id,event,previous,resulting,actor,key]);
 }

 private async capture(reference:string,charge:VerifiedCharge,evidence:{hash:string;source:'webhook'|'provider_recheck'|'simulation';actor:string|null}){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const scope=(await client.query('SELECT business_id FROM payment_intents WHERE provider_reference=$1',[reference])).rows[0];
   if(!scope)throw new NotFoundException('Payment intent not found');
   await this.commerce.ledger.lock(client,scope.business_id);
   const result=await client.query<Intent>('SELECT id,amount_minor::text,currency,environment,status,business_id,customer_subject,provider_reference,execution_mode FROM payment_intents WHERE provider_reference=$1 FOR UPDATE',[reference]);
   const intent=result.rows[0];
   if(!intent)throw new NotFoundException('Payment intent not found');
   if((evidence.source==='simulation')!==(intent.execution_mode==='simulated'))
    throw new ConflictException('Payment execution mode mismatch');
   if(reference!==charge.reference||BigInt(intent.amount_minor)!==BigInt(charge.amountMinor)||intent.currency!==charge.currency||intent.environment!==charge.environment)
    throw new ConflictException('Verified payment does not match intent');
   const prior=await client.query<{provider_transaction_id:string}>('SELECT provider_transaction_id FROM payment_receipts WHERE intent_id=$1',[intent.id]);
   if(prior.rowCount){
    if(prior.rows[0].provider_transaction_id!==charge.id||intent.status!=='succeeded')throw new ConflictException('Payment receipt conflict');
    if(evidence.source==='provider_recheck'&&evidence.actor)await this.auditRecheck(client,evidence.actor,intent.id);
    await client.query('COMMIT');return {paymentIntentId:intent.id,status:'succeeded' as const,replayed:true};
   }
   if(evidence.source==='simulation'){
    const checkout=(await client.query("SELECT 1 FROM checkout_sessions WHERE intent_id=$1 AND state='simulated' FOR UPDATE",[intent.id])).rowCount;
    if(!checkout)throw new ConflictException('Simulated checkout has not been started');
    await this.commerce.validatePurchase(client,intent);
    const customer=(await client.query('SELECT a.suspended,p.suspended AS profile_suspended FROM account_access a JOIN user_profiles p USING(identity_subject) WHERE a.identity_subject=$1',[intent.customer_subject])).rows[0];
    if(!customer||customer.suspended||customer.profile_suspended)throw new ConflictException('Customer account is not eligible');
   }
   if(intent.status!=='pending')throw new ConflictException('Invalid payment transition');
   await client.query('INSERT INTO payment_receipts(intent_id,provider_transaction_id,payload_sha256,evidence_source,verification_actor) VALUES($1,$2,$3,$4,$5)',[intent.id,charge.id,evidence.hash,evidence.source,evidence.actor]);
   const journal=await client.query(`INSERT INTO ledger_entries(intent_id,debit_account_id,credit_account_id,currency,amount_minor)
    SELECT $1::uuid,d.id,c.id,d.currency,$3::bigint FROM ledger_accounts d,ledger_accounts c
    WHERE d.code='gateway_clearing' AND c.code='customer_funds' AND d.currency=$2::varchar(3) AND c.currency=d.currency RETURNING id`,[intent.id,intent.currency,intent.amount_minor]);
   if(journal.rowCount!==1)throw new ConflictException('Ledger accounts unavailable');
   await client.query("UPDATE payment_intents SET status='succeeded',verified_at=now(),updated_at=now() WHERE id=$1",[intent.id]);
   const captured={...intent,status:'succeeded'};
   await this.commerce.ledger.environment(client,intent.environment);
   await this.commerce.ledger.fee(client,captured,charge.feeMinor);
   await this.commerce.captured(client,captured);
   const successAction=evidence.source==='simulation'?'payment.simulated.succeeded':'payment.verified';
   await client.query('INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,\'payment_intent\',$3)',[evidence.actor,successAction,intent.id]);
   await client.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',[successAction,JSON.stringify({paymentIntentId:intent.id})]);
   if(evidence.source==='simulation'){
    await this.lifecycleEvent(client,intent.id,'simulated_success','pending','succeeded',evidence.actor!);
    await this.commerce.ledger.event(client,'payment',intent.id,'payment.simulated.succeeded',evidence.actor!);
   }
   if(evidence.actor)await this.auditRecheck(client,evidence.actor,intent.id);
   if(evidence.source!=='simulation')await this.commerce.ledger.enqueue(client,'payment',intent.id,30);
   await client.query('COMMIT');
   return {paymentIntentId:intent.id,status:'succeeded' as const,replayed:false};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 private auditRecheck(client:import('pg').PoolClient,actor:string,id:string){
  return client.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'payment.provider_recheck_confirmed','payment_intent',$2)",[actor,id]);
 }
}
