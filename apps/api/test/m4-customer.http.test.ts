import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {CustomerController, DiscoveryController} from '../src/customer/customer.controller';
import {CustomerService} from '../src/customer/customer.service';
import {MarketplaceService} from '../src/customer/marketplace.service';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {apiDocument, setupApi} from '../src/main';

const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
test('customer HTTP contract: public filters, strict input, signed ownership, revoked access',async()=>{
 let revoked=false,suspended=false;const calls:{method:string;args:unknown[]}[]=[];
 const identity={subject:'customer-A',issuer:'https://example.invalid',audience:['faji-api'],roles:['customer'],issuedAt:1790000000,expiresAt:1990000000,sessionId:'sid'};
 const service=Object.fromEntries(['discover','detail','slots','reserve','reservations','reservationDetail','cancelReservation','placeOrder','orders','orderDetail','cancelOrder'].map(method=>[method,(...args:unknown[])=>{calls.push({method,args});return {items:[],nextOffset:null};}]));
 const module=await Test.createTestingModule({controllers:[DiscoveryController,CustomerController],providers:[
  IdentityGuard,AccountGuard,{provide:CustomerService,useValue:service},
  {provide:MarketplaceService,useValue:{offering:async()=>({id})}},
  {provide:CustomerWriteGuard,useValue:{canActivate:()=>true}},
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>identity}},
  {provide:AccessService,useValue:{state:async()=>({suspended,revokedAfter:null}),sessionRevoked:async()=>revoked}},
 ]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 const http=app.getHttpServer();
 const auth=(r:import('supertest').Test)=>r.set('Authorization','Bearer signed.jwt.token');
 try{
  assert.equal((await request(http).get('/api/v1/discovery/offerings?q=cafe&location=Lagos&category=product&limit=5')).status,200);
  assert.deepEqual({...calls.at(-1)?.args[0] as object},{limit:5,offset:0,branchId:undefined,q:'cafe',location:'Lagos',category:'product'});
  for(const query of ['limit=51','offset=-1','category=private','unknown=x','limit=abc','q=a&q=b'])
   assert.equal((await request(http).get('/api/v1/discovery/offerings?'+query)).status,400,query);
  assert.equal((await request(http).get('/api/v1/discovery/offerings/not-a-uuid')).status,400);
  assert.equal((await request(http).get('/api/v1/customer/orders')).status,401);
  assert.equal((await auth(request(http).get('/api/v1/customer/orders'))).status,200);
  assert.equal(calls.at(-1)?.args[0],'customer-A');
  const reservation={availabilityId:id,guests:1,guestName:'Wilson',requestKey:'customer-retry-001'};
  assert.equal((await auth(request(http).post('/api/v1/customer/reservations').send(reservation))).status,201);
  assert.deepEqual(calls.at(-1)?.args[0],identity);
  for(const body of [{...reservation,customerSubject:'victim'},{...reservation,guests:0},{...reservation,guestName:' '},{...reservation,requestKey:'bad'}])
   assert.equal((await auth(request(http).post('/api/v1/customer/reservations').send(body))).status,400);
  const order={branchId:id,requestKey:'order-retry-001',items:[{catalogueId:id,quantity:2,expectedPriceMinor:'2500'}]};
  assert.equal((await auth(request(http).post('/api/v1/customer/orders').send(order))).status,201);
  for(const body of [{...order,totalMinor:'1'},{...order,items:[{...order.items[0],unitPriceMinor:'1'}]},{...order,items:[]},{...order,items:[{...order.items[0],quantity:1.5}]},{...order,items:[{...order.items[0],expectedPriceMinor:2500}]}])
   assert.equal((await auth(request(http).post('/api/v1/customer/orders').send(body))).status,400);
  revoked=true;assert.equal((await auth(request(http).get('/api/v1/customer/orders'))).status,403);
  revoked=false;suspended=true;assert.equal((await auth(request(http).get('/api/v1/customer/reservations'))).status,403);
  const doc=apiDocument(app);
  assert.equal(doc.paths['/api/v1/discovery/offerings'].get?.security,undefined);
  assert.deepEqual(doc.paths['/api/v1/customer/orders'].post?.security,[{keycloak:[]}]);
  assert.ok(doc.paths['/api/v1/customer/orders'].post?.responses['201']);
  assert.ok(doc.components?.schemas?.CustomerOrderInput);
  assert.ok(doc.components?.schemas?.OrderDetail);
  assert.ok(doc.paths['/api/v1/discovery/offerings'].get?.parameters?.some(p=>'name' in p&&p.name==='branchId'));
  assert.ok(doc.paths['/api/v1/customer/orders/{id}'].get?.parameters?.some(p=>'name' in p&&p.in==='path'&&p.name==='id'&&p.required));
 }finally{await app.close();}
});
