import {DATABASE_POOL} from '../src/tokens';
import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BusinessApprovalService} from '../src/auth/business-approval.service';
import type {Pool} from 'pg';
test('approved business review confirms owner membership only after verification checks pass',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string)=>{
  queries.push(sql);
  if(sql.startsWith('SELECT applicant_subject'))return {rowCount:1,rows:[{applicant_subject:'owner',status:'pending'}]};
  if(sql.includes('account_kyc_verifications'))return {rowCount:1,rows:[{status:'verified'}]};
  if(sql.includes('count(*) FILTER'))return {rowCount:1,rows:[{registration:1,photos:1}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 const business=new BusinessApprovalService({connect:async()=>client} as unknown as Pool);
 await business.review('admin','ae5d7bce-c422-4eae-bf45-e68e46c06c11','approved');
 assert.ok(queries.some(q=>q.includes("VALUES($1,'business'")),'approved business grants owner membership');
 assert.equal(queries.at(-1),'COMMIT');
});
test('rejected business review does not grant approval membership',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string)=>{
  queries.push(sql);
  if(sql.startsWith('SELECT applicant_subject'))return {rowCount:1,rows:[{applicant_subject:'owner',status:'pending'}]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 await new BusinessApprovalService({connect:async()=>client} as unknown as Pool).review('admin','ae5d7bce-c422-4eae-bf45-e68e46c06c11','rejected','Documentation does not match');
 assert.equal(queries.some(q=>q.includes('INSERT INTO resource_memberships')),false);
 assert.equal(queries.at(-1),'COMMIT');
});
