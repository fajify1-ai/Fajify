import {randomUUID} from 'node:crypto';
import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {CustomerService} from '../customer/customer.service';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PaystackGateway} from './paystack.gateway';

type PreparedIntent={id:string;order_id:string|null;request_key:string;amount_minor:string;currency:string;environment:string;status:'pending'|'succeeded'};
function response(row:PreparedIntent){
 return {paymentIntentId:row.id,orderId:row.order_id!,amountMinor:row.amount_minor,currency:row.currency,
  status:row.status,checkoutEnabled:false as const};
}
/** Prepare a single durable intent from the persisted M4 order; no provider charge or checkout URL yet. */
@Injectable()
export class OrderIntentsService {
 constructor(@Inject(CustomerService)private readonly customers:CustomerService,@Inject(PaystackGateway)private readonly gateway:PaystackGateway){}
 async prepare(identity:VerifiedIdentity,orderId:string,key:string){
  if(!/^[A-Za-z0-9_-]{8,100}$/.test(key))throw new BadRequestException('Invalid request key');
  const environment=this.gateway.environment();
  return this.customers.withAccountTransaction(identity,async c=>{
   // M4's account transaction locks serialize this customer's writes and recheck revocation.
   const prior=await c.query<PreparedIntent>(`SELECT p.id,l.order_id,p.request_key,p.amount_minor::text,p.currency,p.environment,p.status
    FROM payment_intents p LEFT JOIN payment_order_links l ON l.intent_id=p.id
    WHERE p.customer_subject=$1 AND p.request_key=$2 FOR UPDATE OF p`,[identity.subject,key]);
   if(prior.rows[0]){
    if(prior.rows[0].order_id!==orderId.toLowerCase()||prior.rows[0].environment!==environment)
     throw new ConflictException('Request key belongs to a different purchase or payment environment');
    return response(prior.rows[0]);
   }
   const locator=await c.query('SELECT business_id,branch_id FROM business_orders WHERE id=$1 AND customer_subject=$2',[orderId,identity.subject]);
   const location=locator.rows[0];if(!location)throw new NotFoundException('Order not found');
   const eligible=await c.query(`SELECT b.id FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id
    WHERE b.id=$1 AND b.business_id=$2 AND b.active AND m.status='approved' FOR SHARE OF m,b`,[location.branch_id,location.business_id]);
   if(!eligible.rowCount)throw new ConflictException('Merchant or branch unavailable');
   const order=await c.query<{business_id:string;total_minor:string;currency:string;status:string}>(`SELECT business_id,total_minor::text,currency,status FROM business_orders
    WHERE id=$1 AND customer_subject=$2 AND business_id=$3 AND branch_id=$4 FOR UPDATE`,[orderId,identity.subject,location.business_id,location.branch_id]);
   const purchase=order.rows[0];if(!purchase)throw new NotFoundException('Order not found');
   const linked=await c.query('SELECT intent_id FROM payment_order_links WHERE order_id=$1',[orderId]);
   if(linked.rowCount)throw new ConflictException('Order already has a payment intent; reuse its original request key');
   if(purchase.status!=='placed'||purchase.currency!=='NGN'||BigInt(purchase.total_minor)<1n||BigInt(purchase.total_minor)>9007199254740991n)
    throw new ConflictException('Order is not eligible for payment preparation');
   const id=randomUUID();
   await c.query(`INSERT INTO payment_intents(id,customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,identity.subject,purchase.business_id,key,'faji-'+randomUUID(),environment,purchase.total_minor,purchase.currency]);
   await c.query('INSERT INTO payment_order_links(order_id,intent_id) VALUES($1,$2)',[orderId,id]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'payment.intent_prepared','payment_intent',$2)",[identity.subject,id]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('payment.intent_prepared',$1)",[JSON.stringify({paymentIntentId:id,orderId:orderId.toLowerCase()})]);
   return response({id,order_id:orderId.toLowerCase(),request_key:key,amount_minor:purchase.total_minor,currency:purchase.currency,environment,status:'pending'});
  });
 }
}
