import {createHash} from 'node:crypto';
import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {PaystackGateway} from './paystack.gateway';

type Intent={id:string;amount_minor:string;currency:string;environment:'test'|'live';status:'pending'|'succeeded'};
@Injectable()
export class PaymentsService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(PaystackGateway)private readonly gateway:PaystackGateway){}

 async webhook(raw:Buffer,signature:unknown){
  this.gateway.verifySignature(raw,signature);
  let event:{event?:unknown;data?:{reference?:unknown}};
  try{event=JSON.parse(raw.toString('utf8'));}catch{throw new BadRequestException('Invalid payment event');}
  if(!event||typeof event!=='object'||Array.isArray(event))throw new BadRequestException('Invalid payment event');
  if(event.event!=='charge.success')return {received:true};
  const reference=event.data?.reference;
  if(typeof reference!=='string'||! /^[A-Za-z0-9_-]{8,100}$/.test(reference))throw new BadRequestException('Invalid payment reference');
  // Look up before outbound verification; unknown references never create an intent.
  const known=await this.pool.query('SELECT id FROM payment_intents WHERE provider_reference=$1',[reference]);
  if(!known.rowCount)throw new NotFoundException('Payment intent not found');
  // A signed notification only triggers independent verification; its amount/status is not authority.
  const charge=await this.gateway.verify(reference);
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const result=await client.query<Intent>('SELECT id,amount_minor::text,currency,environment,status FROM payment_intents WHERE provider_reference=$1 FOR UPDATE',[reference]);
   const intent=result.rows[0];
   if(!intent)throw new NotFoundException('Payment intent not found');
   if(BigInt(intent.amount_minor)!==BigInt(charge.amountMinor)||intent.currency!==charge.currency||intent.environment!==charge.environment)
    throw new ConflictException('Verified payment does not match intent');
   const prior=await client.query<{provider_transaction_id:string}>('SELECT provider_transaction_id FROM payment_receipts WHERE intent_id=$1',[intent.id]);
   if(prior.rowCount){
    if(prior.rows[0].provider_transaction_id!==charge.id||intent.status!=='succeeded')throw new ConflictException('Payment receipt conflict');
    await client.query('COMMIT');return {received:true};
   }
   if(intent.status!=='pending')throw new ConflictException('Invalid payment transition');
   await client.query('INSERT INTO payment_receipts(intent_id,provider_transaction_id,payload_sha256) VALUES($1,$2,$3)',[intent.id,charge.id,createHash('sha256').update(raw).digest('hex')]);
   const journal=await client.query(`INSERT INTO ledger_entries(intent_id,debit_account_id,credit_account_id,currency,amount_minor)
    SELECT $1,d.id,c.id,$2,$3 FROM ledger_accounts d,ledger_accounts c
    WHERE d.code='gateway_clearing' AND c.code='customer_funds' AND d.currency=$2 AND c.currency=$2 RETURNING id`,[intent.id,intent.currency,intent.amount_minor]);
   if(journal.rowCount!==1)throw new ConflictException('Ledger accounts unavailable');
   await client.query("UPDATE payment_intents SET status='succeeded',verified_at=now() WHERE id=$1",[intent.id]);
   await client.query("INSERT INTO audit_events(action,resource_type,resource_id) VALUES('payment.verified','payment_intent',$1)",[intent.id]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('payment.verified',$1)",[JSON.stringify({paymentIntentId:intent.id})]);
   await client.query('COMMIT');
   return {received:true};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
