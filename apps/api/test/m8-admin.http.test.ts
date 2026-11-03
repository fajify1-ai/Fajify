import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import type {Pool} from 'pg';
import {AdminOperationsController} from '../src/admin/admin.controller';
import {AdminOperationsService} from '../src/admin/admin.service';
import {AdminScopeGuard} from '../src/admin/admin-scope.guard';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';
import {apiDocument,setupApi} from '../src/main';

const now=Math.floor(Date.now()/1000);
const elevated={
 subject:'admin-A',issuer:'https://identity.example/realms/faji',audience:['faji-api'],
 issuedAt:now-10,expiresAt:now+300,roles:['platform-admin'],
 authorizedParty:'faji-admin-web',authContext:'faji-mfa',authTime:now-10,sessionId:'session-1'
};
async function fixture(){
 let identity={...elevated};
 let suspended=false,revoked=false,allowed=true;
 const calls:{audit:Array<{limit:number;offset:number}>;overview:number}={audit:[],overview:0};
 const verifier:IdentityVerifier={verifyAccessToken:async()=>identity};
 const service={
  overview:async()=>{calls.overview++;return {pendingBusinessApprovals:2,openSupportCases:3,hiddenReviews:1};},
  audit:async(input:{limit:number;offset:number})=>{
   calls.audit.push(input);
   return {items:[{id:'ae5d7bce-c422-4eae-bf45-e68e46c06c11',actorSubject:'admin-A',eventType:'account_suspended',occurredAt:new Date().toISOString()}],nextOffset:null};
  },
 };
 const access={
  state:async()=>({suspended,revokedAfter:null}),
  sessionRevoked:async()=>revoked,
  allowPrivilegedRequest:async()=>allowed
 };
 const module=await Test.createTestingModule({controllers:[AdminOperationsController],providers:[
  IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,
  {provide:AdminScopeGuard,useValue:{canActivate:()=>true}},
  {provide:AccessService,useValue:access},{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AdminOperationsService,useValue:service}
 ]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 return {app,calls,setIdentity:(value:typeof elevated)=>{identity=value;},
  setSuspended:(value:boolean)=>{suspended=value;},setRevoked:(value:boolean)=>{revoked=value;},
  setAllowed:(value:boolean)=>{allowed=value;}};
}
const auth=(req:import('supertest').Test)=>req.set('Authorization','Bearer verified.synthetic.token');

test('M8 admin operations enforce signed identity, platform role, admin client, recent MFA and active session',async()=>{
 const f=await fixture(),http=f.app.getHttpServer();
 try{
  assert.equal((await request(http).get('/api/v1/admin/operations/overview')).status,401);
  f.setIdentity({...elevated,roles:['customer']});
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  f.setIdentity({...elevated,authorizedParty:'faji-customer-mobile'});
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  f.setIdentity({...elevated,authContext:'password'});
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  f.setIdentity({...elevated,authTime:now-301});
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  f.setIdentity({...elevated});f.setRevoked(true);
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  f.setRevoked(false);f.setSuspended(true);
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/overview'))).status,403);
  assert.equal(f.calls.overview,0);
  f.setSuspended(false);
  const ok=await auth(request(http).get('/api/v1/admin/operations/overview'));
  assert.equal(ok.status,200);assert.equal(ok.headers['cache-control'],'no-store');
  assert.deepEqual(ok.body,{pendingBusinessApprovals:2,openSupportCases:3,hiddenReviews:1});
  assert.equal(f.calls.overview,1);
 }finally{await f.app.close();}
});

test('M8 audit feed validates pagination and rejects unauthorized or over-budget reads',async()=>{
 const f=await fixture(),http=f.app.getHttpServer();
 try{
  for(const query of ['limit=51','limit=0','limit=abc','offset=-1','offset=10001','details=private'])
   assert.equal((await auth(request(http).get('/api/v1/admin/operations/audit?'+query))).status,400,query);
  assert.equal(f.calls.audit.length,0);
  f.setAllowed(false);
  assert.equal((await auth(request(http).get('/api/v1/admin/operations/audit'))).status,429);
  f.setAllowed(true);
  const ok=await auth(request(http).get('/api/v1/admin/operations/audit?limit=3&offset=2'));
  assert.equal(ok.status,200);assert.equal(ok.headers['cache-control'],'no-store');
  assert.deepEqual(f.calls.audit,[{limit:3,offset:2}]);
  assert.equal(Object.hasOwn(ok.body.items[0],'details'),false);
  const doc=apiDocument(f.app);
  for(const path of ['/api/v1/admin/operations/overview','/api/v1/admin/operations/audit']){
   const op=doc.paths[path]?.get;
   assert.ok(op?.security?.some(s=>Object.hasOwn(s,'keycloak')));
   assert.ok(op.responses?.['200']);
  }
  assert.ok(doc.paths['/api/v1/admin/operations/audit'].get?.parameters?.some(p=>'name' in p&&p.name==='limit'));
 }finally{await f.app.close();}
});

test('M8 audit service uses bounded parameterized reads and excludes raw details',async()=>{
 const queries:Array<{sql:string;params?:unknown[]}>=[],stamp=new Date('2026-11-03T00:00:00.000Z');
 const pool={query:async(sql:string,params?:unknown[])=>{
  queries.push({sql,params});
  if(sql.includes('identity_security_events'))return {rows:[{id:'ae5d7bce-c422-4eae-bf45-e68e46c06c11',actorSubject:'admin-A',eventType:'account_suspended',occurredAt:stamp}]};
  return {rows:[{pendingBusinessApprovals:1,openSupportCases:4,hiddenReviews:0}]};
 }} as unknown as Pool;
 const service=new AdminOperationsService(pool);
 assert.deepEqual(await service.overview(),{pendingBusinessApprovals:1,openSupportCases:4,hiddenReviews:0});
 const result=await service.audit({limit:20,offset:0});
 assert.deepEqual(result,{items:[{id:'ae5d7bce-c422-4eae-bf45-e68e46c06c11',actorSubject:'admin-A',eventType:'account_suspended',occurredAt:'2026-11-03T00:00:00.000Z'}],nextOffset:null});
 assert.deepEqual(queries[1].params,[21,0]);
 assert.ok(!/\bdetails\b/i.test(queries[1].sql));
 assert.match(queries[1].sql,/ORDER BY occurred_at DESC,id DESC LIMIT \$1 OFFSET \$2/);
});
