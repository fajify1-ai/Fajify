import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForbiddenException} from '@nestjs/common';
import type {Pool} from 'pg';
import {BusinessService} from '../src/business/business.service';

test('unverified owner can enter business setup but cannot create business transactions',async()=>{
 const statements:string[]=[];
 const client={query:async(sql:string)=>{
  statements.push(sql);
  if(sql.startsWith('SELECT status FROM business_onboarding'))return {rowCount:1,rows:[{status:'pending'}]};
  if(sql.startsWith('SELECT role FROM resource_memberships'))return {rowCount:1,rows:[{role:'owner'}]};
  if(sql.startsWith('INSERT INTO business_branches'))return {rowCount:1,rows:[{id:'branch-id'}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 const pool={connect:async()=>client} as unknown as Pool;
 const access={state:async()=>({suspended:false,revokedAfter:null})};
 const service=new BusinessService(pool,access as never);
 const branch=await service.createBranch('owner-subject','business-id',{name:'My first branch'});
 assert.equal(branch.id,'branch-id');
 await assert.rejects(service.reserve('owner-subject','business-id','branch-id',{availabilityId:'slot',customerSubject:'customer',guests:1}),ForbiddenException);
 assert.ok(statements.some(sql=>sql==='COMMIT'));
 assert.ok(statements.some(sql=>sql==='ROLLBACK'));
});
