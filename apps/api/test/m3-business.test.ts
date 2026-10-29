import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForbiddenException,ConflictException} from '@nestjs/common';
import {BusinessService} from '../src/business/business.service';
import type {Pool} from 'pg';
import type {AccessService} from '../src/auth/access.service';
const business='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const branch='ae5d7bce-c422-4eae-bf45-e68e46c06c12';
function fixture(options:{approved?:boolean;member?:boolean;capacity?:boolean;state?:string;suspended?:boolean}={}){
 const sql:string[]=[];
 const client={query:async(q:string,params?:unknown[])=>{
  sql.push(q);
  if(q.includes('FROM business_onboarding'))return {rowCount:options.approved===false?0:1,rows:[{id:business}]};
  if(q.includes('FROM resource_memberships'))return {rowCount:options.member===false?0:1,rows:[{role:'owner'}]};
  if(q.startsWith('SELECT id,availability_id,guests FROM business_reservations')||q.startsWith('SELECT id FROM business_orders WHERE'))return {rowCount:0,rows:[]};
  if(q.startsWith('UPDATE business_availability a SET reserved='))return {rowCount:options.capacity===false?0:1,rows:[{id:branch}]};
  if(q.startsWith('SELECT status FROM business_orders'))return {rowCount:1,rows:[{status:options.state??'placed'}]};
  if(q.startsWith('SELECT status,guests'))return {rowCount:1,rows:[{status:options.state??'confirmed',guests:2,availability_id:branch}]};
  if(q.startsWith('SELECT id,price_minor'))return {rowCount:1,rows:[{id:branch,price_minor:'2500',currency:'NGN'}]};
  if(q.startsWith('INSERT INTO business_orders'))return {rowCount:1,rows:[{id:branch,total_minor:'5000'}]};
  if(q.startsWith('INSERT INTO business_reservations'))return {rowCount:1,rows:[{id:branch}]};
  return {rowCount:1,rows:[{id:branch}]};
 },release(){}};
 const pool={connect:async()=>client} as unknown as Pool;
 const access={state:async()=>({suspended:options.suspended??false,revokedAfter:null})} as unknown as AccessService;
 return {service:new BusinessService(pool,access),sql};
}
test('rejects unapproved and foreign tenant membership; rolls back',async()=>{
 for(const opts of [{approved:false},{member:false},{suspended:true}]){
  const {service,sql}=fixture(opts);
  await assert.rejects(()=>service.createBranch('actor',business,{name:'Main'}),ForbiddenException);
  assert.ok(sql.includes('ROLLBACK'));assert.ok(!sql.some(q=>q.startsWith('INSERT INTO business_branches')));
 }
});
test('capacity exhaustion cannot create a reservation',async()=>{
 const {service,sql}=fixture({capacity:false});
 await assert.rejects(()=>service.reserve('actor',business,branch,{availabilityId:branch,customerSubject:'customer',guests:2}),ConflictException);
 assert.ok(sql.some(q=>q.includes('reserved+$4<=a.capacity')));
 assert.ok(!sql.some(q=>q.startsWith('INSERT INTO business_reservations')));
 assert.ok(sql.includes('ROLLBACK'));
});
test('state transitions reject skipping and terminal rewrites',async()=>{
 const {service,sql}=fixture({state:'placed'});
 await assert.rejects(()=>service.orderStatus('actor',business,branch,branch,'fulfilled'),ConflictException);
 assert.ok(sql.includes('ROLLBACK'));
 const terminal=fixture({state:'completed'});
 await assert.rejects(()=>terminal.service.reservationStatus('actor',business,branch,branch,'cancelled'),ConflictException);
});
test('snapshot orders compute totals server-side',async()=>{
 const {service,sql}=fixture();
 const value=await service.placeOrder('actor',business,branch,{customerSubject:'customer',items:[{catalogueId:branch,quantity:2}]});
 assert.equal(value.total_minor,'5000');
 assert.ok(sql.some(q=>q.includes('FOR SHARE')));
 assert.equal(sql.at(-1),'COMMIT');
});
test('duplicate catalogue lines and invalid time windows rejected',async()=>{
 const {service}=fixture();
 await assert.rejects(()=>service.placeOrder('actor',business,branch,{customerSubject:'customer',items:[{catalogueId:branch,quantity:1},{catalogueId:branch,quantity:1}]}));
 await assert.rejects(()=>service.createSlot('actor',business,branch,{catalogueId:branch,startsAt:'2026-12-01T12:00:00Z',endsAt:'2026-12-01T11:00:00Z',capacity:1}));
});

test('reservation retries serialize on request key before attempting capacity mutation',async()=>{
 const {service,sql}=fixture();
 await service.reserve('actor',business,branch,{availabilityId:branch,customerSubject:'customer',guests:1,requestKey:'retry-unique-001'});
 const lock=sql.findIndex(q=>q.includes('pg_advisory_xact_lock'));
 const capacity=sql.findIndex(q=>q.includes('UPDATE business_availability SET reserved')||q.includes('UPDATE business_availability a SET reserved'));
 assert.ok(lock>=0&&capacity>lock);
 assert.ok(sql.some(q=>q.includes('request_key')));
});
test('order retries serialize before published catalogue lookup',async()=>{
 const {service,sql}=fixture();
 await service.placeOrder('actor',business,branch,{customerSubject:'customer',items:[{catalogueId:branch,quantity:2}],requestKey:'retry-unique-002'});
 const lock=sql.findIndex(q=>q.includes('pg_advisory_xact_lock'));
 const catalogue=sql.findIndex(q=>q.includes('price_minor::text'));
 assert.ok(lock>=0&&catalogue>lock);
});
test('invalid retry key is rejected before any database writes',async()=>{
 const {service,sql}=fixture();
 await assert.rejects(()=>service.reserve('actor',business,branch,{availabilityId:branch,customerSubject:'customer',guests:1,requestKey:'bad'}));
 assert.equal(sql.length,0);
});

test('authorization membership reads are row locked against concurrent revocation',async()=>{
 const {service,sql}=fixture();
 await service.branches('actor',business);
 assert.ok(sql.some(q=>q.includes('FROM resource_memberships')&&q.includes('FOR SHARE')));
});
test('invalid request key in order is rejected without SQL writes',async()=>{
 const {service,sql}=fixture();
 await assert.rejects(()=>service.placeOrder('actor',business,branch,{customerSubject:'customer',items:[{catalogueId:branch,quantity:1}],requestKey:'bad'}));
 assert.equal(sql.length,0);
});

test('staff branch membership is checked under a share lock',async()=>{
 const {service,sql}=fixture();
 await service.items('actor',business,branch);
 assert.ok(sql.some(q=>q.includes("resource_type='branch'")&&q.includes('FOR SHARE')));
});
test('malformed order line is rejected before opening a transaction',async()=>{
 const {service,sql}=fixture();
 await assert.rejects(()=>service.placeOrder('actor',business,branch,{customerSubject:'customer',items:[null as unknown as {catalogueId:string;quantity:number}]}));
 assert.equal(sql.length,0);
});

test('reservation replay performs a scoped full-record lookup',async()=>{
 const {service,sql}=fixture();
 await service.reserve('actor',business,branch,{availabilityId:branch,customerSubject:'customer',guests:1,requestKey:'retry-record-001'});
 assert.ok(sql.some(q=>q.includes('request_key')));
});
test('reservation cancellation scopes seat release to business and branch',async()=>{
 const {service,sql}=fixture();
 await service.reservationStatus('actor',business,branch,branch,'cancelled');
 assert.ok(sql.some(q=>q.includes('UPDATE business_availability SET reserved=reserved-$4 WHERE id=$1 AND business_id=$2 AND branch_id=$3')));
});
