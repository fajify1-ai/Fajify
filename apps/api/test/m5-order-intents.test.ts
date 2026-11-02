import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {CustomerService} from '../src/customer/customer.service';
import type {VerifiedIdentity} from '../src/auth/identity.types';
import {OrderIntentsService} from '../src/payments/order-intents.service';
import {PaystackGateway} from '../src/payments/paystack.gateway';
const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11',other='ae5d7bce-c422-4eae-bf45-e68e46c06c12';
const identity={subject:'customer'} as VerifiedIdentity;
function fixture(options:{missing?:boolean;eligible?:boolean;amount?:string;currency?:string;status?:string;linked?:boolean;priorOrder?:string|null;priorEnvironment?:string}={}){
 const queries:Array<{sql:string;args?:unknown[]}>=[];
 const client={query:async(sql:string,args?:unknown[])=>{
  queries.push({sql,args});
  if(sql.includes('LEFT JOIN payment_order_links'))return {rows:options.priorOrder!==undefined?[{id:other,order_id:options.priorOrder,amount_minor:'12500',currency:'NGN',environment:options.priorEnvironment??'test',status:'pending',request_key:'retry_key'}]:[],rowCount:options.priorOrder!==undefined?1:0};
  if(sql.startsWith('SELECT business_id,branch_id'))return {rows:options.missing?[]:[{business_id:other,branch_id:id}]};
  if(sql.includes('JOIN business_onboarding'))return {rows:[],rowCount:options.eligible===false?0:1};
  if(sql.startsWith('SELECT business_id,total_minor'))return {rows:[{business_id:other,total_minor:options.amount??'12500',currency:options.currency??'NGN',status:options.status??'placed'}]};
  if(sql.startsWith('SELECT intent_id'))return {rows:[],rowCount:options.linked?1:0};
  return {rows:[],rowCount:1};
 }} as unknown as PoolClient;
 const customers={withAccountTransaction:async<T>(who:VerifiedIdentity,run:(c:PoolClient)=>Promise<T>)=>{assert.equal(who,identity);return run(client);}} as CustomerService;
 const gateway={environment:()=> 'test'} as unknown as PaystackGateway;
 return {service:new OrderIntentsService(customers,gateway),queries};
}
test('M5 order intents: persist server total, owner, reference and link without charging or changing the order',async()=>{
 const f=fixture({amount:'9007199254740991'});const result=await f.service.prepare(identity,id,'retry_key');
 assert.equal(result.orderId,id);assert.equal(result.amountMinor,'9007199254740991');
 assert.equal(result.checkoutEnabled,false);assert.equal(result.status,'pending');
 const created=f.queries.find(q=>q.sql.startsWith('INSERT INTO payment_intents'))!;
 assert.deepEqual(created.args?.slice(1,4),['customer',other,'retry_key']);
 assert.match(String(created.args?.[4]),/^faji_[a-f0-9-]+$/);
 assert.equal(created.args?.[6],'9007199254740991');
 assert.ok(f.queries.some(q=>q.sql.startsWith('INSERT INTO payment_order_links')));
 assert.ok(f.queries.some(q=>q.sql.includes('payment.intent_prepared')));
 assert.ok(!f.queries.some(q=>/UPDATE business_orders|INSERT INTO ledger_entries|INSERT INTO payment_receipts/.test(q.sql)));
});
test('M5 order intents: exact retry returns original preparation with no new side effects',async()=>{
 const f=fixture({priorOrder:id});const result=await f.service.prepare(identity,id.toUpperCase(),'retry_key');
 assert.equal(result.paymentIntentId,other);assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT')));
});
test('M5 order intents: key conflict, unbound legacy intent and environment changes are rejected',async()=>{
 for(const opts of [{priorOrder:other},{priorOrder:null},{priorOrder:id,priorEnvironment:'live'}]){
  const f=fixture(opts);await assert.rejects(()=>f.service.prepare(identity,id,'retry_key'),ConflictException);
  assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT')));
 }
});
test('M5 order intents: absent/foreign orders and unavailable merchants cannot create intents',async()=>{
 for(const opts of [{missing:true},{eligible:false}]){
  const f=fixture(opts);await assert.rejects(()=>f.service.prepare(identity,id,'retry_key'),opts.missing?NotFoundException:ConflictException);
  assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT')));
 }
});
test('M5 order intents: one intent per order and only positive bounded NGN placed orders',async()=>{
 for(const opts of [{linked:true},{amount:'0'},{amount:'-1'},{amount:'9007199254740992'},{currency:'USD'},...['accepted','cancelled','fulfilled'].map(status=>({status}))]){
  const f=fixture(opts);await assert.rejects(()=>f.service.prepare(identity,id,'retry_key'),ConflictException);
  assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT')));
 }
});
test('M5 order intents: invalid retry key is rejected before the account transaction',async()=>{
 const f=fixture();await assert.rejects(()=>f.service.prepare(identity,id,'short'),BadRequestException);assert.equal(f.queries.length,0);
});
