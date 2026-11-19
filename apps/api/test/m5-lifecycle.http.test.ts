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
 const pool={query:async(sql:string,args?:unknown[])=>{if(sql.includes('admin_scope_grants'))return {rows:[{scope:args?.[1]??'finance.write'}],rowCount:1};if(sql.includes('customer_request_buckets'))return {rows:[{used:++used}]};calls.push({sql,args});return {rows:[],rowCount:0};}};
 const commerce={ledger:{pool},hold:async(who:any,input:any)=>{calls.push({who,input});return {id,paymentIntentId:id,...input,status:'held'};},checkout:async(who:any,payment:string,email:string)=>{calls.push({who,payment,email});return {paymentIntentId:payment,state:'ready',checkoutEnabled:true};},holds:async()=>[],tickets:async()=>[],cancel:async()=>({id,status:'cancelled'})};
 const finance={policy:async(actor:string,business:string,input:any)=>{calls.push({actor,business,input});return {id,...input};},customerRefunds:async()=>[],overview:async()=>({}),policies:async()=>[]};
 const payments={simulate:async(actor:string,paymentId:string,outcome:string)=>{calls.push({actor,paymentId,outcome});return {paymentIntentId:paymentId,status:outcome,replayed:false,mode:'simulated'};}};
 const module=await Test.createTestingModule({controllers:[M5CustomerController,M5MerchantController,M5AdminController],providers:[IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,CustomerWriteGuard,
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async(token:string)=>({subject:token,issuedAt:token==='stale'?now-301:now-2,expiresAt:now+600,sessionId:token,roles:token==='customer'?['customer']:['platform-admin'],authorizedParty:'faji-admin-web',authContext:token==='nomfa'?'1':'faji-mfa',authTime:token==='stale'?now-301:now-2})}},
  {provide:AccessService,useValue:{state:async(subject:string)=>({suspended:subject==='suspended',revokedAfter:null}),sessionRevoked:async(_s:string,session:string)=>session==='revoked',allowPrivilegedRequest:async(s:string)=>s!=='limited'}},
  {provide:DATABASE_POOL,useValue:pool},{provide:CommerceLifecycle,useValue:commerce},{provide:FinancialOperations,useValue:finance},{provide:FinanceLedger,useValue:{pool}},{provide:PaymentsService,useValue:payments}
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
  reset();assert.equal((await post('customer','/api/v1/customer/payments/'+id+'/recheck').send({status:'succeeded'})).status,404);
  assert.equal((await request(app.getHttpServer()).get('/api/v1/customer/tickets?limit=101').set('Authorization','Bearer customer')).status,400);
  const page=await request(app.getHttpServer()).get('/api/v1/customer/tickets').set('Authorization','Bearer customer');assert.equal(page.status,200);assert.deepEqual(page.body,{items:[],nextOffset:null});assert.equal(page.headers['cache-control'],'no-store');
 }finally{await app.close();}
});
test('simulated payment outcomes require privileged finance write authorization and strict outcome input',async()=>{
 const {app,calls,reset}=await fixture(),url='/api/v1/admin/finance/payments/'+id+'/simulation';
 const post=(token?:string)=>{const req=request(app.getHttpServer()).post(url);return token?req.set('Authorization','Bearer '+token):req;};
 try{
  assert.equal((await post().send({outcome:'succeeded'})).status,401);
  assert.equal((await post('customer').send({outcome:'succeeded'})).status,403);
  assert.equal((await post('admin').send({outcome:'unknown'})).status,400);
  assert.equal((await post('admin').send({outcome:'succeeded',status:'succeeded'})).status,400);
  reset();const result=await post('admin').send({outcome:'failed'});
  assert.equal(result.status,200);assert.deepEqual(result.body,{paymentIntentId:id,status:'failed',replayed:false,mode:'simulated'});
  assert.deepEqual(calls.at(-1),{actor:'admin',paymentId:id,outcome:'failed'});
 }finally{await app.close();}
});
test('simulated-payment queue requires finance-read scope, simulation mode and audits the read',async()=>{
 const {app,calls}=await fixture(),prior=process.env.FAJI_PAYMENT_MODE;
 process.env.FAJI_PAYMENT_MODE='simulated';
 try{
  const result=await request(app.getHttpServer()).get('/api/v1/admin/finance/simulations?limit=20&offset=0').set('Authorization','Bearer admin');
  assert.equal(result.status,200);assert.deepEqual(result.body,{items:[],nextOffset:null});assert.equal(result.headers['cache-control'],'no-store');
  assert.ok(calls.some(call=>call.sql.includes('INSERT INTO finance_operation_events')&&call.args?.[0]==='operations'&&call.args?.[1]==='simulations'&&call.args?.[2]==='admin'));
  assert.ok(calls.some(call=>call.sql.includes("execution_mode='simulated'")&&call.sql.includes("status='pending'")));
  delete process.env.FAJI_PAYMENT_MODE;
  const disabled=await request(app.getHttpServer()).get('/api/v1/admin/finance/simulations').set('Authorization','Bearer admin');
  assert.equal(disabled.status,503);
 }finally{
  if(prior===undefined)delete process.env.FAJI_PAYMENT_MODE;else process.env.FAJI_PAYMENT_MODE=prior;
  await app.close();
 }
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
  for(const token of ['customer','stale','suspended','revoked'])assert.equal((await post(token).send(input)).status,403);
  assert.equal((await post('limited').send(input)).status,429);
  assert.equal((await post('admin').send({...input,commissionBps:10001})).status,400);
  const {payoutFeeBearer:ignored,...incomplete}=input;void ignored;assert.equal((await post('admin').send(incomplete)).status,400);
  assert.equal(calls.length,0);assert.equal((await post('admin').send(input)).status,200);assert.equal(calls[0].actor,'admin');
 }finally{await app.close();}
});
test('M5 every lifecycle route exposes bearer, parameter, request and concrete response contracts',async()=>{
 const {app}=await fixture();try{const doc=apiDocument(app);for(const [path,method,body] of M5_OPERATIONS){const op=doc.paths[path]?.[method];assert.ok(op,method+' '+path);assert.ok(op.security?.some(s=>Object.hasOwn(s,'session')));if(body)assert.ok(op.requestBody);const r=op.responses['200'];assert.ok(r&&'content' in r&&r.content?.['application/json']?.schema);for(const [,name]of path.matchAll(/\{([^}]+)\}/g))assert.ok(op.parameters?.some(p=>'name' in p&&p.name===name&&p.in==='path'&&p.required));}}finally{await app.close();}
});
