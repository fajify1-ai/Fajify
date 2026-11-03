import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {M5CustomerController,M5MerchantController,M5AdminController} from '../src/payments/m5-lifecycle.controller';
import {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import {FinancialOperations} from '../src/payments/financial-operations.service';
import {FinanceLedger} from '../src/payments/finance-ledger.service';
import {PaymentsService} from '../src/payments/payments.service';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {AccessService} from '../src/auth/access.service';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {DATABASE_POOL} from '../src/tokens';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {apiDocument,setupApi} from '../src/main';
import {M5_OPERATIONS} from '../src/payments/m5-contracts';
const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
async function fixture(){
 const calls:any[]=[];let used=0;const now=Math.floor(Date.now()/1000);
 const pool={query:async(sql:string,args:unknown[])=>{if(sql.includes('customer_request_buckets'))return {rows:[{used:++used}]};calls.push({sql,args});return {rows:[],rowCount:0};}};
 const commerce={ledger:{pool},hold:async(who:any,input:any)=>{calls.push({who,input});return {id,paymentIntentId:id,...input,status:'held'};},checkout:async(who:any,payment:string,email:string)=>{calls.push({who,payment,email});return {paymentIntentId:payment,state:'ready',checkoutEnabled:true};},holds:async()=>[],tickets:async()=>[],cancel:async()=>({id,status:'cancelled'})};
 const finance={policy:async(actor:string,business:string,input:any)=>{calls.push({actor,business,input});return {id,...input};},customerRefunds:async()=>[],overview:async()=>({}),policies:async()=>[]};
 const module=await Test.createTestingModule({controllers:[M5CustomerController,M5MerchantController,M5AdminController],providers:[IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,CustomerWriteGuard,
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async(token:string)=>({subject:token,issuedAt:now-2,expiresAt:now+600,sessionId:token,roles:token==='customer'?['customer']:['platform-admin'],authorizedParty:'faji-admin-web',authContext:token==='nomfa'?'1':'faji-mfa',authTime:token==='stale'?now-301:now-2})}},
  {provide:AccessService,useValue:{state:async(subject:string)=>({suspended:subject==='suspended',revokedAfter:null}),sessionRevoked:async(_s:string,session:string)=>session==='revoked',allowPrivilegedRequest:async(s:string)=>s!=='limited'}},
  {provide:DATABASE_POOL,useValue:pool},{provide:CommerceLifecycle,useValue:commerce},{provide:FinancialOperations,useValue:finance},{provide:FinanceLedger,useValue:{pool}},{provide:PaymentsService,useValue:{}}
 ]}).compile();const app=module.createNestApplication();setupApi(app);await app.init();return {app,calls,reset:()=>{used=0;}};
}
test('M5 lifecycle HTTP validates server-owned inputs and denies inactive identities before any financial work',async()=>{
 const {app,calls,reset}=await fixture(),url='/api/v1/customer/paid-holds',input={kind:'ticket',sourceId:id,quantity:1,guestName:'Fixture',requestKey:'fixture-key'};
 const post=(token='customer',path=url)=>request(app.getHttpServer()).post(path).set('Authorization','Bearer '+token);
 try{
  assert.equal((await request(app.getHttpServer()).post(url).send(input)).status,401);
  for(const who of ['suspended','revoked'])assert.equal((await post(who).send(input)).status,403);
  for(const body of [{...input,amountMinor:'1'},{...input,customerSubject:'other'},{...input,status:'confirmed'},{...input,quantity:51},{...input,quantity:'1'}, {...input,sourceId:'bad'}]){reset();assert.equal((await post().send(body)).status,400);}
  assert.equal(calls.length,0);reset();assert.equal((await post().send(input)).status,200);assert.equal(calls[0].who.subject,'customer');
  reset();assert.equal((await post('customer','/api/v1/customer/payments/'+id+'/checkout').send({email:'fixture@example.invalid',reference:'client-selected'})).status,400);
  reset();assert.equal((await post('customer','/api/v1/customer/payments/'+id+'/recheck').send({status:'succeeded'})).status,400);
  assert.equal((await request(app.getHttpServer()).get('/api/v1/customer/tickets?limit=101').set('Authorization','Bearer customer')).status,400);
  const page=await request(app.getHttpServer()).get('/api/v1/customer/tickets').set('Authorization','Bearer customer');assert.equal(page.status,200);assert.deepEqual(page.body,{items:[],nextOffset:null});assert.equal(page.headers['cache-control'],'no-store');
 }finally{await app.close();}
});
test('M5 lifecycle HTTP enforces database-backed payment budgets on rejected repeated writes',async()=>{
 const {app,calls}=await fixture();try{
  let status=0;for(let i=0;i<12;i++)status=(await request(app.getHttpServer()).post('/api/v1/customer/payments/'+id+'/checkout').set('Authorization','Bearer customer').send({email:'fixture@example.invalid'})).status;
  assert.equal(status,429);assert.ok(calls.filter(c=>c.email).length<12);
 }finally{await app.close();}
});
test('M5 finance administration requires fresh MFA and explicit complete commercial policy',async()=>{
 const {app,calls}=await fixture(),url='/api/v1/admin/finance/businesses/'+id+'/policies',input={commissionBps:137,gatewayFeeBearer:'merchant',payoutFeeBearer:'platform',settlementDelayHours:24,refundWindowHours:48,cancellationCutoffMinutes:30,holdMinutes:5};
 const post=(token:string)=>request(app.getHttpServer()).post(url).set('Authorization','Bearer '+token);
 try{
  for(const token of ['customer','nomfa','stale','suspended','revoked'])assert.equal((await post(token).send(input)).status,403);
  assert.equal((await post('limited').send(input)).status,429);
  assert.equal((await post('admin').send({...input,commissionBps:10001})).status,400);
  const {payoutFeeBearer:ignored,...incomplete}=input;void ignored;assert.equal((await post('admin').send(incomplete)).status,400);
  assert.equal(calls.length,0);assert.equal((await post('admin').send(input)).status,200);assert.equal(calls[0].actor,'admin');
 }finally{await app.close();}
});
test('M5 every lifecycle route exposes bearer, parameter, request and concrete response contracts',async()=>{
 const {app}=await fixture();try{const doc=apiDocument(app);for(const [path,method,body] of M5_OPERATIONS){const op=doc.paths[path]?.[method];assert.ok(op,method+' '+path);assert.ok(op.security?.some(s=>Object.hasOwn(s,'keycloak')));if(body)assert.ok(op.requestBody);const r=op.responses['200'];assert.ok(r&&'content' in r&&r.content?.['application/json']?.schema);for(const [,name]of path.matchAll(/\{([^}]+)\}/g))assert.ok(op.parameters?.some(p=>'name' in p&&p.name===name&&p.in==='path'&&p.required));}}finally{await app.close();}
});
