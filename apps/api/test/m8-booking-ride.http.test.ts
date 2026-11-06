import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {CustomerBookingRideService} from '../src/admin/customer-booking-ride.service';
import {BookingRideEmptyBodyGuard,CustomerBookingRideController} from '../src/admin/customer-booking-ride.controller';
import {apiDocument,setupApi} from '../src/main';

const reservation='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const ride='b98e06a6-e543-4b6e-9e52-736f23a0f04a';
const now=Math.floor(Date.now()/1000);
const identity={subject:'customer-link-owner',issuer:'https://identity.invalid/realms/faji',
 audience:['faji-api'],roles:['customer'],issuedAt:now-10,expiresAt:now+300,sessionId:'sid'};
const auth=(r:import('supertest').Test)=>r.set('Authorization','Bearer synthetic.jwt.access');

test('M8 booking-to-ride HTTP requires verified customer consent, ownership and strict input',async()=>{
 let revoked=false;const calls:{method:string;arguments:unknown[]}[]=[];
 const mock={
  bind:async(...args:unknown[])=>{calls.push({method:'bind',arguments:args});
   return {id:reservation,reservationId:reservation,rideId:ride,status:'active',createdAt:new Date().toISOString(),cancelledAt:null};},
  list:async(...args:unknown[])=>{calls.push({method:'list',arguments:args});return {items:[],nextOffset:null};},
  unlink:async(...args:unknown[])=>{calls.push({method:'unlink',arguments:args});return {id:reservation,status:'cancelled'};}
 };
 const module=await Test.createTestingModule({controllers:[CustomerBookingRideController],providers:[
  IdentityGuard,AccountGuard,
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>identity}},
  {provide:AccessService,useValue:{state:async()=>({suspended:false,revokedAfter:null}),sessionRevoked:async()=>revoked}},
  {provide:CustomerBookingRideService,useValue:mock},
  {provide:BookingRideEmptyBodyGuard,useClass:BookingRideEmptyBodyGuard}
 ]}).overrideGuard(CustomerWriteGuard).useValue({canActivate:()=>true}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 try{
  const server=app.getHttpServer();
  const url='/api/v1/customer/integrations/booking-rides';
  assert.equal((await request(server).get(url)).status,401);
  const input={reservationId:reservation,rideId:ride,requestKey:'m8-link-r001',consent:true};
  for(const invalid of [{...input,consent:false},{...input,customerSubject:'other'},
   {...input,reservationId:'not-uuid'},{...input,requestKey:'x'}]){
   assert.equal((await auth(request(server).post(url).send(invalid))).status,400);
  }
  assert.equal(calls.length,0);
  const linked=await auth(request(server).post(url).send(input));
  assert.equal(linked.status,200);
  assert.equal(linked.headers['cache-control'],'no-store');
  assert.equal(calls[0].method,'bind');
  assert.equal((calls[0].arguments[0] as typeof identity).subject,'customer-link-owner');
  for(const invalid of ['limit=55','offset=-1','customerSubject=other'])
   assert.equal((await auth(request(server).get(url+'?'+invalid))).status,400);
  assert.equal((await auth(request(server).get(url+'?limit=3'))).status,200);
  assert.equal((await auth(request(server).put(url+'/bad/unlink'))).status,400);
  assert.equal((await auth(request(server).put(url+'/'+reservation+'/unlink').send({other:'data'}))).status,400);
  assert.equal((await auth(request(server).put(url+'/'+reservation+'/unlink'))).status,200);
  revoked=true;assert.equal((await auth(request(server).get(url))).status,403);
  const doc=apiDocument(app);
  const ops=[['get',url],['post',url],['put',url+'/{id}/unlink']] as const;
  for(const [method,path] of ops){
   const operation=doc.paths[path]?.[method];
   assert.ok(operation?.security?.some(s=>Object.hasOwn(s,'keycloak')),path);
   assert.ok(operation?.responses['200'],path);
  }
 }finally{await app.close();}
});
