import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AdminGovernanceService} from '../src/admin/admin-governance.service';
import {AdminGovernanceController} from '../src/admin/admin-workflows.controller';
import {AccessService} from '../src/auth/access.service';
import {BusinessApprovalController} from '../src/auth/business-approval.controller';
import {BusinessApprovalService} from '../src/auth/business-approval.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {setupApi} from '../src/main';
import {DATABASE_POOL} from '../src/tokens';

test('pending merchant reads require governance.read independently of legacy review authorization',async()=>{
 const now=Math.floor(Date.now()/1000);
 const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
 const calls={read:0,review:0};
 let granted=false;
 const module=await Test.createTestingModule({
  controllers:[AdminGovernanceController,BusinessApprovalController],
  providers:[
   {provide:DATABASE_POOL,useValue:{query:async(sql:string,parameters:string[])=>{
    if(sql.includes('admin_scope_grants')){
     assert.deepEqual(parameters,['admin','governance.read']);
     return {rowCount:granted?1:0};
    }
    assert.match(sql,/admin\.read_requested/);
    return {rowCount:1};
   }}},
   {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async(token:string)=>({
    subject:'admin',roles:token==='admin.token.test'?['platform-admin']:['customer'],
    issuedAt:now,authorizedParty:'faji-admin-web',authContext:'faji-mfa',authTime:now,
   })}},
   {provide:AccessService,useValue:{state:async()=>({suspended:false}),allowPrivilegedRequest:async()=>true}},
   {provide:AdminGovernanceService,useValue:{applications:async(query:{limit:number;offset:number})=>{
    calls.read++;
    assert.deepEqual({limit:query.limit,offset:query.offset},{limit:20,offset:0});
    return {items:[{id,displayName:'Synthetic merchant',status:'pending',createdAt:'2026-11-13T10:00:00Z'}],nextOffset:null};
   }}},
   {provide:BusinessApprovalService,useValue:{review:async(actor:string,application:string,decision:string)=>{
    calls.review++;
    assert.equal(actor,'admin');
    assert.equal(application,id);
    return {id,status:decision};
   }}},
  ],
 }).compile();
 const app=module.createNestApplication();
 setupApi(app);
 await app.init();
 try{
  const http=request(app.getHttpServer());
  const queue=()=>http.get('/api/v1/admin/governance/approvals?limit=20&offset=0').set('Authorization','Bearer admin.token.test');
  const review=()=>http.post(`/api/v1/business/onboarding/${id}/review`).send({decision:'approved'});
  await review().expect(401);
  await review().set('Authorization','Bearer customer.token.test').expect(403);
  await queue().expect(403);
  assert.deepEqual(calls,{read:0,review:0});
  await review().set('Authorization','Bearer admin.token.test').expect(201,{id,status:'approved'});
  granted=true;
  const response=await queue().expect(200);
  assert.equal(response.body.items[0].id,id);
  assert.deepEqual(calls,{read:1,review:1});
 }finally{await app.close();}
});
