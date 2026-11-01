import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {ConflictException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {PaymentsService} from '../src/payments/payments.service';

const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11',reference='faji_stored_reference';
function fixture(options:{missing?:boolean;prior?:string;amount?:string;currency?:string;environment?:string;providerReference?:string;providerFails?:boolean;auditFails?:boolean;confirmedAuditFails?:boolean}={}){
 const calls:Array<{query:string;args?:unknown[]}>=[];
 let outbound=0;
 const charge={id:'123',reference:options.providerReference??reference,amountMinor:12500,currency:'NGN',environment:'test' as const};
 const client={query:async(query:string,args?:unknown[])=>{
  calls.push({query,args});
  if(query.startsWith('SELECT id,amount_minor'))return {rowCount:1,rows:[{id,amount_minor:options.amount??'12500',currency:options.currency??'NGN',environment:options.environment??'test',status:options.prior?'succeeded':'pending'}]};
  if(query.startsWith('SELECT provider_transaction_id'))return {rowCount:options.prior?1:0,rows:options.prior?[{provider_transaction_id:options.prior}]:[]};
  if(options.confirmedAuditFails&&query.includes('provider_recheck_confirmed'))throw Error('confirmation audit unavailable');
  return {rowCount:1,rows:[]};
 },release:()=>calls.push({query:'RELEASE'})};
 const pool={query:async(query:string,args?:unknown[])=>{
  calls.push({query,args});
  if(query.startsWith('SELECT provider_reference'))return {rows:options.missing?[]:[{provider_reference:reference}]};
  if(options.auditFails)throw Error('request audit unavailable');
  return {rows:[]};
 },connect:async()=>client} as unknown as Pool;
 const gateway=new PaystackGateway();
 gateway.verify=async(storedReference:string)=>{outbound++;assert.equal(storedReference,reference);if(options.providerFails)throw new ServiceUnavailableException();return charge;};
 return {service:new PaymentsService(pool,gateway),calls,charge,outbound:()=>outbound};
}
test('M5 recovery: selects stored reference, audits actor and posts normalized provider evidence',async()=>{
 const f=fixture();
 assert.deepEqual(await f.service.recheck('admin-subject',id),{paymentIntentId:id,status:'succeeded',replayed:false});
 assert.deepEqual(f.calls[0].args,[id]);
 assert.deepEqual(f.calls[1].args,['admin-subject',id]);
 assert.ok(f.calls[1].query.includes('provider_recheck_requested'));
 const receipt=f.calls.find(c=>c.query.startsWith('INSERT INTO payment_receipts'))!;
 assert.deepEqual(receipt.args,[id,'123',createHash('sha256').update(JSON.stringify(f.charge)).digest('hex'),'provider_recheck','admin-subject']);
 assert.ok(f.calls.some(c=>c.query.includes('provider_recheck_confirmed')));
 assert.deepEqual(f.calls.find(c=>c.query.includes("'payment.verified'"))?.args,['admin-subject',id]);
 assert.equal(f.outbound(),1);assert.deepEqual(f.calls.slice(-2).map(c=>c.query),['COMMIT','RELEASE']);
});
test('M5 recovery: matching replay remains auditable without reposting money or capture events',async()=>{
 const f=fixture({prior:'123'});
 assert.equal((await f.service.recheck('admin',id)).replayed,true);
 assert.ok(f.calls.some(c=>c.query.includes('provider_recheck_confirmed')));
 for(const table of ['payment_receipts','ledger_entries','outbox_events'])assert.ok(!f.calls.some(c=>c.query.startsWith('INSERT INTO '+table)));
 assert.ok(!f.calls.some(c=>c.query.startsWith('UPDATE payment_intents')));
});
test('M5 recovery: unknown intent or failed request audit prevents provider work',async()=>{
 for(const options of [{missing:true},{auditFails:true}]){
  const f=fixture(options);
  await assert.rejects(()=>f.service.recheck('admin',id),options.missing?NotFoundException:/request audit unavailable/);
  assert.equal(f.outbound(),0);assert.ok(!f.calls.some(c=>c.query==='BEGIN'));
 }
});
test('M5 recovery: unsuccessful provider verification records the request and posts no capture',async()=>{
 const f=fixture({providerFails:true});await assert.rejects(()=>f.service.recheck('admin',id),ServiceUnavailableException);
 assert.ok(f.calls.some(c=>c.query.includes('provider_recheck_requested')));
 assert.ok(!f.calls.some(c=>c.query==='BEGIN'||c.query.includes('provider_recheck_confirmed')));
});
test('M5 recovery: mismatches roll back and cannot mark local intent successful',async()=>{
 for(const options of [{prior:'999'},{amount:'12501'},{currency:'USD'},{environment:'live'},{providerReference:'different_reference'}]){
  const f=fixture(options);await assert.rejects(()=>f.service.recheck('admin',id),ConflictException);
  assert.ok(f.calls.some(c=>c.query==='ROLLBACK'));assert.ok(!f.calls.some(c=>c.query.startsWith('INSERT INTO payment_receipts')));
 }
});
test('M5 recovery: failed confirmation audit rolls back the capture and retains request provenance',async()=>{
 const f=fixture({confirmedAuditFails:true});
 await assert.rejects(()=>f.service.recheck('admin',id),/confirmation audit unavailable/);
 assert.ok(f.calls.some(c=>c.query==='ROLLBACK'));assert.ok(!f.calls.some(c=>c.query==='COMMIT'));
});
