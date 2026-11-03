import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {ConflictException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {CustomerService, searchPattern} from '../src/customer/customer.service';
import type {VerifiedIdentity} from '../src/auth/identity.types';

const identity:VerifiedIdentity={subject:'customer-A',issuer:'https://example.invalid',audience:['faji-api'],roles:[],issuedAt:1790000000,expiresAt:1990000000,sessionId:'sid'};
function fixture(run:(sql:string,args:unknown[])=>unknown){
 const queries:{sql:string;args:unknown[]}[]=[];
 const client={query:async(sql:string,args:unknown[]=[])=>{
  queries.push({sql,args});
  if(sql.includes('FROM account_access'))return {rowCount:1,rows:[{suspended:false,profile_suspended:false,revoked_after:null}]};
  return run(sql,args)??{rowCount:0,rows:[]};
 },release(){}};
 return {service:new CustomerService({query:client.query,connect:async()=>client} as unknown as Pool),queries};
}
test('discovery escapes wildcards, parameterizes input and publishes only explicit public fields',async()=>{
 const {service,queries}=fixture(()=>({rowCount:3,rows:[{id:'a'},{id:'b'},{id:'c'}]}));
 const result=await service.discover({limit:2,offset:0,q:"cafe%' OR 1=1--",location:'Lagos',category:'product'});
 assert.deepEqual(result,{items:[{id:'a'},{id:'b'}],nextOffset:2});
 assert.equal(searchPattern('  50%_off\\  '),'%50\\%\\_off\\\\%');
 assert.ok(!queries[0].sql.includes('OR 1=1--'));
 assert.match(queries[0].sql,/m.status='approved'/);assert.match(queries[0].sql,/i.active AND i.published AND b.active/);
 assert.ok(!queries[0].sql.includes('SELECT *'));
 assert.ok(!queries[0].sql.includes('contact_email'));
});
test('history and detail are scoped to the current subject, including a foreign ID',async()=>{
 const {service,queries}=fixture(()=>({rows:[],rowCount:0}));
 await service.orders('customer-A',{limit:20,offset:0});
 assert.deepEqual(queries[0].args,['customer-A',21,0]);
 await assert.rejects(()=>service.orderDetail('customer-A','foreign-id'),NotFoundException);
 assert.deepEqual(queries[1].args,['foreign-id','customer-A']);
 assert.equal(queries.length,2,'foreign order lines must never be queried');
});
test('idempotency mismatch rolls back before consuming capacity',async()=>{
 const {service,queries}=fixture(sql=>sql.includes('FROM customer_request_keys')?{rowCount:1,rows:[{resource_id:'prior',fingerprint:'different'}]}:undefined);
 await assert.rejects(()=>service.reserve(identity,{availabilityId:'slot',guests:1,guestName:'Wilson',requestKey:'request-key-001'}),ConflictException);
 assert.equal(queries.at(-1)?.sql,'ROLLBACK');assert.ok(!queries.some(q=>q.sql.includes('UPDATE business_availability')));
});
test('revoked session and expired identity cannot write after the guard',async()=>{
 for(const revoked of [true,false]){
  const {service,queries}=fixture(sql=>sql.includes('FROM revoked_identity_sessions')?{rowCount:revoked?1:0,rows:[]}:undefined);
  await assert.rejects(()=>service.cancelOrder(revoked?identity:{...identity,expiresAt:1},'order-id'),ForbiddenException);
  assert.ok(!queries.some(q=>q.sql.startsWith('UPDATE')));assert.equal(queries.at(-1)?.sql,'ROLLBACK');
 }
});
test('a changed displayed price cannot place an order or emit an event',async()=>{
 const {service,queries}=fixture(sql=>{
  if(sql.includes('SELECT b.business_id'))return {rowCount:1,rows:[{business_id:'business'}]};
  if(sql.includes('FROM business_catalogue WHERE branch_id'))return {rowCount:1,rows:[{id:'item',price_minor:'3000',currency:'NGN'}]};
 });
 await assert.rejects(()=>service.placeOrder(identity,{branchId:'branch',requestKey:'request-key-002',items:[{catalogueId:'item',quantity:2,expectedPriceMinor:'2500'}]}),ConflictException);
 assert.ok(!queries.some(q=>q.sql.startsWith('INSERT')));assert.equal(queries.at(-1)?.sql,'ROLLBACK');
});
test('paid service cannot bypass M5 confirmation',async()=>{
 const {service,queries}=fixture(sql=>{
  if(sql.startsWith('SELECT branch_id'))return {rowCount:1,rows:[{branch_id:'branch',catalogue_id:'item'}]};
  if(sql.includes('SELECT b.business_id'))return {rowCount:1,rows:[{business_id:'business'}]};
  if(sql.includes('SELECT price_minor::text,kind'))return {rowCount:1,rows:[{price_minor:'1000',kind:'service'}]};
 });
 await assert.rejects(()=>service.reserve(identity,{availabilityId:'slot',guests:1,guestName:'Wilson',requestKey:'request-key-003'}),ConflictException);
 assert.ok(!queries.some(q=>q.sql.startsWith('UPDATE')));
});
