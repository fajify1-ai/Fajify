import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {NotFoundException} from '@nestjs/common';
import {CustomerPaymentsController,FinancePaymentsController} from '../src/payments/payment-reads.controller';
import {PaymentReadsService} from '../src/payments/payment-reads.service';
import {PaymentRecoveryController} from '../src/payments/payment-recovery.controller';
import {PaymentsService} from '../src/payments/payments.service';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';
import {setupApi,apiDocument} from '../src/main';

const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
async function fixture(){
 const calls:Array<[string,string,string]>=[];
 const now=Math.floor(Date.now()/1000);
 const verifier:IdentityVerifier={verifyAccessToken:async(token:string)=>({subject:token,issuer:'https://identity.example.invalid',audience:['faji-api'],
  issuedAt:now-5,expiresAt:now+100,sessionId:token,roles:token==='customer.jwt'||token==='foreign.jwt'?['customer']:['platform-admin'],
  authorizedParty:token==='wrongclient.jwt'?'faji-customer-mobile':'faji-admin-web',authContext:token==='nomfa.jwt'?'1':'faji-mfa',
  authTime:token==='stalemfa.jwt'?now-301:now-5})};
 const service={
  customerPayment:async(subject:string,paymentId:string)=>{calls.push(['customer',subject,paymentId]);if(subject!=='customer.jwt')throw new NotFoundException('Payment not found');return {paymentIntentId:paymentId,status:'pending',amountMinor:'100',currency:'NGN',createdAt:new Date().toISOString(),verifiedAt:null};},
  reconciliation:async(subject:string,paymentId:string)=>{calls.push(['admin',subject,paymentId]);return {paymentIntentId:paymentId,internalStatus:'consistent',scope:'internal_capture',providerReconciliation:'not_checked'};}
 };
 const access={state:async(subject:string)=>({suspended:subject==='suspended.jwt',revokedAfter:subject==='cutoff.jwt'?new Date(now*1000):null}),
  sessionRevoked:async(_subject:string,session:string)=>session==='revoked.jwt',allowPrivilegedRequest:async(subject:string)=>subject!=='limited.jwt'};
 const recovery={recheck:async(subject:string,paymentId:string)=>{calls.push(['recheck',subject,paymentId]);return {paymentIntentId:paymentId,status:'succeeded',replayed:false};}};
 const module=await Test.createTestingModule({controllers:[CustomerPaymentsController,FinancePaymentsController,PaymentRecoveryController],providers:[
  IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access},{provide:PaymentReadsService,useValue:service},{provide:PaymentsService,useValue:recovery}
 ]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 return {app,calls};
}
test('M5 HTTP: payment read requires active identity, valid UUID and current customer ownership',async()=>{
 const {app,calls}=await fixture();const url='/api/v1/customer/payments/'+id;
 const get=(token:string,path=url)=>request(app.getHttpServer()).get(path).set('Authorization','Bearer '+token);
 try{
  assert.equal((await request(app.getHttpServer()).get(url)).status,401);
  for(const token of ['suspended.jwt','revoked.jwt','cutoff.jwt'])assert.equal((await get(token)).status,403);
  assert.equal((await get('customer.jwt','/api/v1/customer/payments/invalid')).status,400);
  assert.equal(calls.length,0);
  assert.equal((await get('foreign.jwt')).status,404);
  const owned=await get('customer.jwt');assert.equal(owned.status,200);assert.equal(owned.body.verifiedAt,null);
  assert.equal(owned.headers['cache-control'],'no-store');
  assert.deepEqual(calls.at(-1),['customer','customer.jwt',id]);
 }finally{await app.close();}
});
test('M5 HTTP: admin reconciliation requires admin client, fresh MFA, active session and request quota',async()=>{
 const {app,calls}=await fixture();const url='/api/v1/admin/finance/payments/'+id+'/reconciliation';
 const get=(token:string)=>request(app.getHttpServer()).get(url).set('Authorization','Bearer '+token);
 try{
  assert.equal((await request(app.getHttpServer()).get(url)).status,401);
  for(const token of ['customer.jwt','wrongclient.jwt','nomfa.jwt','stalemfa.jwt','suspended.jwt','revoked.jwt','cutoff.jwt'])assert.equal((await get(token)).status,403);
  assert.equal((await get('limited.jwt')).status,429);assert.equal(calls.length,0);
  const allowed=await get('admin.jwt');assert.equal(allowed.status,200);
  assert.equal(allowed.headers['cache-control'],'no-store');assert.deepEqual(calls,[['admin','admin.jwt',id]]);
 }finally{await app.close();}
});
test('M5 HTTP: read operations publish bearer-protected response and identifier contracts',async()=>{
 const {app}=await fixture();
 try{
  const doc=apiDocument(app);
  for(const url of ['/api/v1/customer/payments/{id}','/api/v1/admin/finance/payments/{id}/reconciliation']){
   const operation=doc.paths[url]?.get;
   assert.ok(operation?.security?.some(s=>Object.hasOwn(s,'keycloak')));
   assert.ok(operation.responses?.['200']);
   assert.ok(operation.parameters?.some(p=>'in' in p&&p.in==='path'&&p.name==='id'&&p.required));
  }
  assert.ok(doc.components?.schemas?.PaymentStatusResponse);
  assert.ok(doc.components?.schemas?.CaptureReconciliationResponse);
  const recovery=doc.paths['/api/v1/admin/finance/payments/{id}/provider-recheck']?.post;
  assert.ok(recovery?.security?.some(s=>Object.hasOwn(s,'keycloak')));assert.ok(recovery.responses?.['200']);
  assert.ok(doc.components?.schemas?.PaymentRecheckResponse);
 }finally{await app.close();}
});

test('M5 HTTP: provider recovery rejects weak identities, malformed IDs and client-supplied payment details',async()=>{
 const {app,calls}=await fixture();const url='/api/v1/admin/finance/payments/'+id+'/provider-recheck';
 const post=(token:string,path=url)=>request(app.getHttpServer()).post(path).set('Authorization','Bearer '+token);
 try{
  assert.equal((await request(app.getHttpServer()).post(url)).status,401);
  for(const token of ['customer.jwt','nomfa.jwt','stalemfa.jwt','wrongclient.jwt','suspended.jwt','revoked.jwt','cutoff.jwt'])assert.equal((await post(token)).status,403);
  assert.equal((await post('limited.jwt')).status,429);
  assert.equal((await post('admin.jwt','/api/v1/admin/finance/payments/invalid/provider-recheck')).status,400);
  for(const details of [{amountMinor:1},{reference:'untrusted'},{status:'succeeded'},{actor:'other-admin'}])
   assert.equal((await post('admin.jwt').send(details)).status,400);
  assert.equal(calls.length,0);
  const result=await post('admin.jwt');assert.equal(result.status,200);
  assert.equal(result.headers['cache-control'],'no-store');
  assert.deepEqual(result.body,{paymentIntentId:id,status:'succeeded',replayed:false});
  assert.deepEqual(calls,[['recheck','admin.jwt',id]]);
 }finally{await app.close();}
});
