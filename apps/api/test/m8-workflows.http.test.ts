import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import type {Pool} from 'pg';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {AdminScopeGuard,RequireAdminScope} from '../src/admin/admin-scope.guard';
import {AdminGovernanceController,AdminSupportController,AdminIncidentController} from '../src/admin/admin-workflows.controller';
import {AdminInsightsController} from '../src/admin/admin-insights.controller';
import {AdminGovernanceService} from '../src/admin/admin-governance.service';
import {AdminSupportService} from '../src/admin/admin-support.service';
import {AdminIncidentService} from '../src/admin/admin-incidents.service';
import {AdminInsightsService} from '../src/admin/admin-insights.service';
import {AdminMonitorService} from '../src/admin/admin-monitor.service';
import {apiDocument,setupApi} from '../src/main';

const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const now=Math.floor(Date.now()/1000);
const full={
 subject:'admin-A',issuer:'https://identity.invalid/realms/faji',audience:['faji-api'],issuedAt:now-10,
 expiresAt:now+300,roles:['platform-admin'],authorizedParty:'faji-admin-web',authContext:'faji-mfa',
 authTime:now-10,sessionId:'session-A'
};
const auth=(r:import('supertest').Test)=>r.set('Authorization','Bearer synthetic.verified.token');
test('M8 real scope guard requires an explicit active database grant',async()=>{
 const seen:unknown[][]=[];let permitted=false,offline=false;
 const pool={query:async(_sql:string,params:unknown[])=>{seen.push(params);if(offline)throw Error('offline');return {rowCount:permitted?1:0};}} as unknown as Pool;
 const guard=new AdminScopeGuard(pool);
 const handler=()=>null;
 Reflect.defineMetadata('faji:m8:required-admin-scope','governance.write',handler);
 const ctx={getHandler:()=>handler,switchToHttp:()=>({getRequest:()=>({identity:full})})} as any;
 await assert.rejects(guard.canActivate(ctx),{status:403});
 permitted=true;assert.equal(await guard.canActivate(ctx),true);
 assert.deepEqual(seen[1],['admin-A','governance.write']);
 offline=true;await assert.rejects(guard.canActivate(ctx),{status:503});
 const missing={...ctx,getHandler:()=>()=>null};
 await assert.rejects(guard.canActivate(missing),{status:403});
});

test('M8 HTTP: guards, strict admin commands, bounded inputs and secured response contracts',async()=>{
 let identity={...full};let suspended=false,revoked=false,rate=true;
 const calls:{moderation:unknown[];support:unknown[];incidents:unknown[]}={moderation:[],support:[],incidents:[]};
 const governance={
  applications:async()=>({items:[],nextOffset:null}),reviews:async()=>({items:[],nextOffset:null}),
  restrictions:async()=>({items:[],nextOffset:null}),
  moderation:async(...args:unknown[])=>{calls.moderation.push(args);return {id,changed:true,moderationStatus:'hidden'};},
  restriction:async()=>({id,changed:true,restricted:true,resourceType:'branch'})
 };
 const support={
  cases:async()=>({items:[],nextOffset:null}),detail:async()=>({id,messages:{items:[],nextOffset:null}}),
  assign:async(...args:unknown[])=>{calls.support.push(args);return {id,changed:true,priority:'high'};},
  reply:async()=>({id,body:'Response'}),status:async()=>({id,status:'closed',changed:true})
 };
 const incident={
  list:async()=>({items:[],nextOffset:null}),
  create:async(...args:unknown[])=>{calls.incidents.push(args);return {id,state:'open'};},
  transition:async()=>({id,state:'investigating',changed:true})
 };
 const insights={
  finance:async()=>({capturedMinor:'0',refundedMinor:'0',settledMinor:'0',openReconciliationCases:0,openDisputes:0,uncertainRefunds:0}),
  report:async()=>({days:30,customers:0,approvedBusinesses:0,createdOrders:0,createdReservations:0,issuedTickets:0,verifiedCaptureMinor:'0',ledgerPlatformRevenueMinor:'0',currency:'NGN'}),
  monitoring:async()=>({deadFinanceJobs:0,expiredFinanceLeases:0,overdueFinanceJobs:0,openFinanceExceptions:0,staleOutboxEvents:0,providerHealth:'unverified',checkedAt:new Date().toISOString()}),
  commandAudit:async()=>({items:[],nextOffset:null}),
  activity:async()=>({items:[],nextOffset:null})
 };
 const monitor={tick:async()=>({opened:[],cleared:[]}),alerts:async()=>({items:[],nextOffset:null}),acknowledge:async()=>({id,changed:true})};
 const module=await Test.createTestingModule({
  controllers:[AdminGovernanceController,AdminSupportController,AdminIncidentController,AdminInsightsController],
  providers:[
   IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,
   {provide:AdminScopeGuard,useValue:{canActivate:()=>true}},
   {provide:AccessService,useValue:{
    state:async()=>({suspended,revokedAfter:null}),sessionRevoked:async()=>revoked,
    allowPrivilegedRequest:async()=>rate}},
   {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>identity}},
   {provide:AdminGovernanceService,useValue:governance},
   {provide:AdminSupportService,useValue:support},
   {provide:AdminIncidentService,useValue:incident},
   {provide:AdminInsightsService,useValue:insights},
   {provide:AdminMonitorService,useValue:monitor},
  ]
 }).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();const server=app.getHttpServer();
 try{
  assert.equal((await request(server).get('/api/v1/admin/finance/summary')).status,401);
  identity={...full,roles:['customer']};
  assert.equal((await auth(request(server).get('/api/v1/admin/finance/summary'))).status,403);
  identity={...full,authTime:now-301};
  assert.equal((await auth(request(server).get('/api/v1/admin/finance/summary'))).status,403);
  identity={...full};revoked=true;
  assert.equal((await auth(request(server).get('/api/v1/admin/finance/summary'))).status,403);
  revoked=false;suspended=true;
  assert.equal((await auth(request(server).get('/api/v1/admin/finance/summary'))).status,403);
  suspended=false;rate=false;
  assert.equal((await auth(request(server).get('/api/v1/admin/finance/summary'))).status,429);
  rate=true;
  const finance=await auth(request(server).get('/api/v1/admin/finance/summary'));
  assert.equal(finance.status,200);assert.equal(finance.headers['cache-control'],'no-store');
  for(const query of ['limit=51','offset=-1','unexpected=value'])
   assert.equal((await auth(request(server).get('/api/v1/admin/governance/reviews?'+query))).status,400,query);
  assert.equal((await auth(request(server).get('/api/v1/admin/reports/overview?days=91'))).status,400);
  const good={requestKey:'admin-key-001',visibility:'hidden',reason:'Confirmed policy violation'};
  for(const bad of [{...good,visibility:'unknown'},{...good,reason:'short'},
    {...good,customerSubject:'other'}]){
   assert.equal((await auth(request(server).post('/api/v1/admin/governance/reviews/'+id+'/moderation').send(bad))).status,400);
  }
  assert.equal((await auth(request(server).post('/api/v1/admin/governance/reviews/not-uuid/moderation').send(good))).status,400);
  assert.equal((await auth(request(server).post('/api/v1/admin/governance/reviews/'+id+'/moderation').send(good))).status,200);
  assert.equal(calls.moderation.length,1);
  assert.equal((await auth(request(server).post('/api/v1/admin/support/cases/'+id+'/assignment').send({
   requestKey:'assign-001',priority:'high',reason:'Urgent escalation review',assignee:'support-agent'
  }))).status,200);
  assert.equal(calls.support.length,1);
  assert.equal((await auth(request(server).post('/api/v1/admin/incidents').send({
   requestKey:'incident-001',incidentType:'security',severity:'critical',summary:'Suspicious repeated request'
  }))).status,201);
  assert.equal(calls.incidents.length,1);
  const doc=apiDocument(app);
  for(const path of ['/api/v1/admin/governance/reviews/{id}/moderation',
   '/api/v1/admin/support/cases/{id}/assignment','/api/v1/admin/incidents',
   '/api/v1/admin/monitoring/status','/api/v1/admin/finance/summary']){
   const verb=path.includes('moderation')||path.includes('assignment')||path.endsWith('/incidents')?'post':'get';
   const op=doc.paths[path]?.[verb];
   assert.ok(op?.security?.some(s=>Object.hasOwn(s,'keycloak')),path);
   assert.ok(op.responses?.[verb==='post'&&path.endsWith('/incidents')?'201':'200'],path);
  }
 }finally{await app.close();}
});
