import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {BadRequestException,ConflictException,NotFoundException,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import type {Pool} from 'pg';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {PaymentsService} from '../src/payments/payments.service';

const secret='sk_test_fixture123',reference='faji_fixture123';
const payload=Buffer.from(JSON.stringify({event:'charge.success',data:{reference,amount:1,status:'failure'}}));
const signature=(raw:Buffer)=>createHmac('sha512',secret).update(raw).digest('hex');
function fixture(options:{amount?:string;currency?:string;environment?:string;prior?:string;known?:boolean;ledger?:boolean;fail?:boolean}={}){
 const queries:string[]=[];
 const client={query:async(q:string)=>{
  queries.push(q);
  if(q.startsWith('SELECT id,amount_minor'))return {rows:[{id:'intent-id',amount_minor:options.amount??'12500',currency:options.currency??'NGN',environment:options.environment??'test',status:options.prior?'succeeded':'pending'}],rowCount:1};
  if(q.startsWith('SELECT provider_transaction_id'))return {rows:options.prior?[{provider_transaction_id:options.prior}]:[],rowCount:options.prior?1:0};
  if(q.includes('INSERT INTO ledger_entries'))return {rows:[],rowCount:options.ledger===false?0:1};
  return {rows:[],rowCount:1};
 },release:()=>{queries.push('RELEASE');}};
 const pool={query:async()=>({rowCount:options.known===false?0:1}),connect:async()=>client} as unknown as Pool;
 let verifies=0;
 const gateway=new PaystackGateway();
 gateway.verify=async()=>{verifies++;if(options.fail)throw new ServiceUnavailableException();return {id:'123',reference,amountMinor:12500,currency:'NGN',environment:'test'};};
 return {service:new PaymentsService(pool,gateway),queries,verifies:()=>verifies};
}

test('M5: raw signature is required and binds exact bytes before database or provider work',async()=>{
 process.env.PAYSTACK_SECRET_KEY=secret;
 const f=fixture();
 for(const sig of [undefined,'garbage','0'.repeat(128),[signature(payload)]])await assert.rejects(()=>f.service.webhook(payload,sig),UnauthorizedException);
 await assert.rejects(()=>f.service.webhook(Buffer.concat([payload,Buffer.from(' ')]),signature(payload)),UnauthorizedException);
 assert.equal(f.verifies(),0);assert.deepEqual(f.queries,[]);
});
test('M5: signed malformed JSON is rejected; unrelated events have no side effects',async()=>{
 const f=fixture();const bad=Buffer.from('{');
 await assert.rejects(()=>f.service.webhook(bad,signature(bad)),BadRequestException);
 for(const body of ['null','[]']){
  const raw=Buffer.from(body);
  await assert.rejects(()=>f.service.webhook(raw,signature(raw)),BadRequestException);
 }
 const other=Buffer.from('{"event":"transfer.success"}');
 assert.deepEqual(await f.service.webhook(other,signature(other)),{received:true});
 assert.equal(f.verifies(),0);
});
test('M5: unknown references cannot create payments',async()=>{
 const f=fixture({known:false});
 await assert.rejects(()=>f.service.webhook(payload,signature(payload)),NotFoundException);
 assert.equal(f.verifies(),0);assert.deepEqual(f.queries,[]);
});
test('M5: verified charge, journal, audit and outbox commit together',async()=>{
 const f=fixture();await f.service.webhook(payload,signature(payload));
 assert.equal(f.verifies(),1);
 for(const name of ['payment_receipts','ledger_entries','audit_events','outbox_events'])assert.ok(f.queries.some(q=>q.includes('INSERT INTO '+name)));
 assert.ok(f.queries.some(q=>q.includes('FOR UPDATE')));
 assert.deepEqual(f.queries.slice(-2),['COMMIT','RELEASE']);
});
test('M5: amount, currency and environment mismatches roll back',async()=>{
 for(const options of [{amount:'12501'},{currency:'USD'},{environment:'live'}]){
  const f=fixture(options);await assert.rejects(()=>f.service.webhook(payload,signature(payload)),ConflictException);
  assert.ok(f.queries.includes('ROLLBACK'));assert.ok(!f.queries.some(q=>q.startsWith('INSERT')));
 }
});
test('M5: repeated charge is acknowledged without second posting; conflicting identity is rejected',async()=>{
 const f=fixture({prior:'123'});await f.service.webhook(payload,signature(payload));
 assert.ok(!f.queries.some(q=>q.startsWith('INSERT')));
 const conflict=fixture({prior:'999'});await assert.rejects(()=>conflict.service.webhook(payload,signature(payload)),ConflictException);
 assert.ok(conflict.queries.includes('ROLLBACK'));
});
test('M5: provider outage cannot mark success; missing ledger accounts roll back',async()=>{
 const unavailable=fixture({fail:true});
 await assert.rejects(()=>unavailable.service.webhook(payload,signature(payload)),ServiceUnavailableException);
 assert.deepEqual(unavailable.queries,[]);
 const ledger=fixture({ledger:false});await assert.rejects(()=>ledger.service.webhook(payload,signature(payload)),ConflictException);
 assert.ok(ledger.queries.includes('ROLLBACK'));assert.ok(!ledger.queries.some(q=>q.startsWith('UPDATE payment_intents')));
});
test('M5: Paystack response validation fails closed without leaking provider details',async()=>{
 process.env.PAYSTACK_SECRET_KEY=secret;
 const gateway=new PaystackGateway();
 const data={status:'success',id:123,reference,amount:12500,currency:'NGN',domain:'test'};
 const response=(body:unknown)=>async(url:unknown,init?:RequestInit)=>{
  assert.equal(url,'https://api.paystack.co/transaction/verify/'+reference);
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer '+secret);
  assert.equal(init?.redirect,'error');
  return new Response(JSON.stringify(body));
 };
 assert.deepEqual(await gateway.verify(reference,response({status:true,data}) as typeof fetch),{id:'123',reference,amountMinor:12500,currency:'NGN',environment:'test'});
 for(const change of [{status:'failed'},{reference:'other'},{amount:-1},{amount:1.5},{amount:Number.MAX_SAFE_INTEGER+1},{domain:'live'},{id:1.1}])
  await assert.rejects(()=>gateway.verify(reference,response({status:true,data:{...data,...change}}) as typeof fetch),ServiceUnavailableException);
 await assert.rejects(()=>gateway.verify(reference,response(null) as typeof fetch),ServiceUnavailableException);
 delete process.env.PAYSTACK_SECRET_KEY;
 assert.throws(()=>gateway.verifySignature(payload,signature(payload)),ServiceUnavailableException);
});
