import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {MarketplaceController, MerchantPublicController} from '../src/customer/marketplace.controller';
import {CustomerAccountController} from '../src/customer/account.controller';
import {MarketplaceService} from '../src/customer/marketplace.service';
import {CustomerAccountService} from '../src/customer/account.service';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {ResourceGuard} from '../src/auth/resource.guard';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {apiDocument, setupApi} from '../src/main';
const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
test('marketplace and account HTTP contracts validate public filters and preserve private signed ownership',async()=>{
 const calls:{method:string;args:unknown[]}[]=[];
 const mock=(names:string[])=>Object.fromEntries(names.map(method=>[method,(...args:unknown[])=>{calls.push({method,args});return {items:[],nextOffset:null};}]));
 const identity={subject:'customer-A',issuer:'https://example.invalid',audience:['faji-api'],roles:['customer'],issuedAt:1790000000,expiresAt:1990000000};
 const module=await Test.createTestingModule({controllers:[MarketplaceController,MerchantPublicController,CustomerAccountController],providers:[
  IdentityGuard,AccountGuard,ResourceGuard,{provide:CustomerWriteGuard,useValue:{canActivate:()=>true}},
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>identity}},
  {provide:AccessService,useValue:{state:async()=>({suspended:false,revokedAfter:null}),member:async()=>false}},
  {provide:MarketplaceService,useValue:mock(['venues','venue','reviews','plans','quote','publicProfile','replaceMedia','configurePackage'])},
  {provide:CustomerAccountService,useValue:mock(['profile','updateProfile','wishlist','save','unsave','review','reviews','withdrawReview','notifications','unread','readNotification','support','createSupport','supportDetail','messages','reply','closeSupport'])},
 ]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();const http=app.getHttpServer();
 const auth=(r:import('supertest').Test)=>r.set('Authorization','Bearer signed.jwt.token');
 try{
  assert.equal((await request(http).get('/api/v1/discovery/venues?latitude=6.5&longitude=3.3&radiusKm=10')).status,200);
  assert.equal((await request(http).get('/api/v1/discovery/plans?guests=2&currency=NGN&maxBudgetMinor=10000')).status,200);
  for(const query of ['guests=0','currency=ngn','maxBudgetMinor=1.5','startsAt=tomorrow','latitude=100','radiusKm=101'])assert.equal((await request(http).get('/api/v1/discovery/plans?'+query)).status,400);
  assert.equal((await request(http).post('/api/v1/discovery/plans/'+id+'/quote').send({guests:2,addOns:[]})).status,200);
  assert.equal((await request(http).post('/api/v1/discovery/plans/'+id+'/quote').send({guests:2,addOns:[],totalMinor:'1'})).status,400);
  for(const path of ['profile','wishlist','reviews','notifications','support']){
   assert.equal((await request(http).get('/api/v1/customer/'+path)).status,401);
   assert.equal((await auth(request(http).get('/api/v1/customer/'+path))).status,200);
   assert.equal(calls.at(-1)?.args[0],'customer-A');
  }
  assert.equal((await auth(request(http).patch('/api/v1/customer/profile').send({displayName:'Wilson',roles:['admin']}))).status,400);
  assert.equal((await auth(request(http).patch('/api/v1/customer/profile').send({displayName:'Wilson'}))).status,200);
  assert.deepEqual(calls.at(-1)?.args[0],identity);
  assert.equal((await auth(request(http).put('/api/v1/customer/orders/'+id+'/review').send({rating:6,body:'Review'}))).status,400);
  assert.equal((await auth(request(http).post('/api/v1/customer/support').send({requestKey:'case-request-001',category:'order',resourceId:id,subject:'Help',message:'Please check',customerSubject:'victim'}))).status,400);
  assert.equal((await auth(request(http).post('/api/v1/customer/support').send({requestKey:'case-request-001',category:'order',resourceId:id,subject:'Help',message:'Please check'}))).status,201);
  assert.deepEqual(calls.at(-1)?.args[0],identity);
  assert.equal((await auth(request(http).put('/api/v1/businesses/'+id+'/branches/'+id+'/public-profile').send({summary:'Welcome',city:'Lagos'}))).status,403);
  const doc=apiDocument(app);
  assert.deepEqual(doc.paths['/api/v1/customer/support'].post?.security,[{keycloak:[]}]);
  assert.equal(doc.paths['/api/v1/discovery/plans/{id}/quote'].post?.security,undefined);
  assert.ok(doc.components?.schemas?.VenueDetail);assert.ok(doc.components?.schemas?.SupportCaseView);
 }finally{await app.close();}
});
