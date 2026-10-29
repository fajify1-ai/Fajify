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
  if(q.startsWith('UPDATE business_availability SET reserved=reserved+'))return {rowCount:options.capacity===false?0:1,rows:[{id:branch}]};
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
 assert.ok(sql.some(q=>q.includes('reserved+$4<=capacity')));
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
