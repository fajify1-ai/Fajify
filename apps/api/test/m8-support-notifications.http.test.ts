import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import type {Pool} from 'pg';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {CustomerService} from '../src/customer/customer.service';
import {CustomerSupportNotificationsController} from '../src/admin/customer-support-notifications.controller';
import {CustomerSupportNotificationsService} from '../src/admin/customer-support-notifications.service';
import {setupApi,apiDocument} from '../src/main';

const noticeId='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const now=Math.floor(Date.now()/1000);
const identity={subject:'customer-A',issuer:'https://identity.invalid/realms/faji',audience:['faji-api'],
 issuedAt:now-5,expiresAt:now+300,roles:['customer'],sessionId:'session-customer'};
const auth=(r:import('supertest').Test)=>r.set('Authorization','Bearer synthetic.verified.token');
test('M8 support notifications are protected and bind customer identity from a verified token',async()=>{
 let revoked=false;
 const calls:Array<{subject:string;input:unknown}>=[];
 const service={
  list:async(subject:string,input:unknown)=>{calls.push({subject,input});return {items:[],nextOffset:null};},
  read:async(verified:typeof identity,id:string)=>{calls.push({subject:verified.subject,input:id});
   return {id,caseId:noticeId,title:'Support replied',readAt:new Date().toISOString(),createdAt:new Date().toISOString()};}
 };
 const module=await Test.createTestingModule({controllers:[CustomerSupportNotificationsController],providers:[
  IdentityGuard,AccountGuard,
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>identity}},
  {provide:AccessService,useValue:{state:async()=>({suspended:false,revokedAfter:null}),sessionRevoked:async()=>revoked}},
  {provide:CustomerSupportNotificationsService,useValue:service}
 ]}).overrideGuard(CustomerWriteGuard).useValue({canActivate:()=>true}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 try{
  const server=app.getHttpServer();
  assert.equal((await request(server).get('/api/v1/customer/support-notifications')).status,401);
  assert.equal((await auth(request(server).get('/api/v1/customer/support-notifications?customerSubject=customer-B'))).status,400);
  assert.equal((await auth(request(server).get('/api/v1/customer/support-notifications?limit=999'))).status,400);
  const list=await auth(request(server).get('/api/v1/customer/support-notifications?limit=2'));
  assert.equal(list.status,200);assert.equal(list.headers['cache-control'],'no-store');
  assert.equal(calls[0].subject,'customer-A');
  assert.equal((await auth(request(server).put('/api/v1/customer/support-notifications/not-a-uuid/read'))).status,400);
  const read=await auth(request(server).put('/api/v1/customer/support-notifications/'+noticeId+'/read'));
  assert.equal(read.status,200);assert.equal(calls[1].subject,'customer-A');
  revoked=true;
  assert.equal((await auth(request(server).get('/api/v1/customer/support-notifications'))).status,403);
  const doc=apiDocument(app);
  for(const [path,verb] of [
   ['/api/v1/customer/support-notifications','get'],
   ['/api/v1/customer/support-notifications/{id}/read','put']
  ] as const){
   const operation=doc.paths[path]?.[verb];
   assert.ok(operation?.security?.some(s=>Object.hasOwn(s,'keycloak')),path);
   assert.ok(operation.responses['200'],path);
  }
 }finally{await app.close();}
});

test('M8 support notifications use bounded owner-scoped SQL and account-safe read update',async()=>{
 const seen:Array<{sql:string;args?:unknown[]}>=[],timestamp=new Date('2026-11-03T09:00:00Z');
 const pool={query:async(sql:string,args:unknown[])=>{
  seen.push({sql,args});return {rows:[{id:noticeId,caseId:noticeId,readAt:null,createdAt:timestamp}],rowCount:1};
 }} as unknown as Pool;
 const customer={withAccountTransaction:async(_identity:unknown,run:(c:{query:(sql:string,args:unknown[])=>Promise<unknown>})=>Promise<unknown>)=>
  run({query:async(sql:string,args:unknown[])=>{seen.push({sql,args});return {rows:[{id:noticeId}],rowCount:1};}})} as CustomerService;
 const service=new CustomerSupportNotificationsService(pool,customer);
 const listed=await service.list('customer-A',{limit:5,offset:3});
 assert.equal(listed.items.length,1);
 assert.deepEqual(seen[0].args,['customer-A',6,3]);
 assert.ok(seen[0].sql.includes('WHERE customer_subject=$1'));
 await service.read(identity,noticeId);
 assert.deepEqual(seen[1].args,[noticeId,'customer-A']);
 assert.ok(seen[1].sql.includes('AND customer_subject=$2'));
});
