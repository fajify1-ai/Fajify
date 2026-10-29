import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BadRequestException,ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {ManagementService} from '../src/business/management.service';
import type {Pool} from 'pg';
import type {AccessService} from '../src/auth/access.service';
const business='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const branch='ae5d7bce-c422-4eae-bf45-e68e46c06c12';
function fixture(opts:{owner?:boolean;targetActive?:boolean;branchExists?:boolean;suspended?:boolean}={}){
 const queries:{sql:string;args?:unknown[]}[]=[];
 const c={query:async(sql:string,args?:unknown[])=>{
  queries.push({sql,args});
  if(sql.includes('FROM business_onboarding b JOIN resource_memberships'))return {rowCount:opts.owner===false?0:1,rows:[{id:business}]};
  if(sql.includes('FROM account_access a JOIN user_profiles'))return {rowCount:opts.targetActive===false?0:1,rows:[{}]};
  if(sql.includes('FROM business_branches WHERE'))return {rowCount:opts.branchExists===false?0:1,rows:[{}]};
  return {rowCount:1,rows:[{id:branch}]};
 },release(){}};
 const pool={connect:async()=>c} as unknown as Pool;
 const access={state:async()=>({suspended:opts.suspended??false,revokedAfter:null})} as unknown as AccessService;
 return {service:new ManagementService(pool,access),queries};
}
test('tenant owner is mandatory for granting memberships',async()=>{
 const {service,queries}=fixture({owner:false});
 await assert.rejects(()=>service.grant('owner',business,'staff-user','staff',branch),ForbiddenException);
 assert.ok(queries.some(q=>q.sql==='ROLLBACK'));
 assert.equal(queries.filter(q=>q.sql.includes('INSERT INTO resource_memberships')).length,0);
});
test('no manager grants with branch scope, no unscoped staff, no self escalation',async()=>{
 const {service}=fixture();
 await assert.rejects(()=>service.grant('owner',business,'target','manager',branch),BadRequestException);
 await assert.rejects(()=>service.grant('owner',business,'target','staff'),BadRequestException);
 await assert.rejects(()=>service.grant('owner',business,'owner','manager'),BadRequestException);
});
test('grant is blocked for disabled target and cross-tenant branch',async()=>{
 await assert.rejects(()=>fixture({targetActive:false}).service.grant('owner',business,'target','staff',branch),ConflictException);
 await assert.rejects(()=>fixture({branchExists:false}).service.grant('owner',business,'target','staff',branch),NotFoundException);
});
test('branch staff grant includes both business and branch scopes in one transaction',async()=>{
 const {service,queries}=fixture();
 const result=await service.grant('owner',business,'staff-user','staff',branch);
 assert.equal(result.active,true);
 const grants=queries.filter(q=>q.sql.includes('INSERT INTO resource_memberships'));
 assert.equal(grants.length,2);
 assert.deepEqual(grants.map(g=>g.args?.[1]),['business','branch']);
 assert.equal(queries.at(-1)?.sql,'COMMIT');
});
test('revoke one branch checks other active branch grants before removing business staff role',async()=>{
 const {service,queries}=fixture();
 await service.revoke('owner',business,'staff-user','staff',branch);
 assert.ok(queries.some(q=>q.sql.includes("resource_type='branch'")&&q.sql.includes("active=false")));
 assert.ok(queries.some(q=>q.sql.includes('business_branches b')&&q.sql.includes("m.role='staff'")));
 assert.equal(queries.at(-1)?.sql,'COMMIT');
});
