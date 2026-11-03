import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {HttpException} from '@nestjs/common';
import request from 'supertest';
import {OrderIntentsController} from '../src/payments/order-intents.controller';
import {OrderIntentsService} from '../src/payments/order-intents.service';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';
import {apiDocument,setupApi} from '../src/main';
test('M5 HTTP: order-intent preparation requires active identity, strict body, quota and UUID',async()=>{
 const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';let suspended=false,limited=false,calls=0;
 const module=await Test.createTestingModule({controllers:[OrderIntentsController],providers:[IdentityGuard,AccountGuard,
  {provide:IDENTITY_VERIFIER,useValue:{verifyAccessToken:async()=>({subject:'signed-customer',issuedAt:Date.now()/1000,roles:['customer']})}},
  {provide:AccessService,useValue:{state:async()=>({suspended,revokedAfter:null})}},
  {provide:OrderIntentsService,useValue:{prepare:async(who:{subject:string},orderId:string,key:string)=>{calls++;assert.equal(who.subject,'signed-customer');assert.equal(orderId,id);assert.equal(key,'retry_key');return {orderId,checkoutEnabled:false};}}}
 ]}).overrideGuard(CustomerWriteGuard).useValue({canActivate:()=>{if(limited)throw new HttpException('Limited',429);return true;}}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 const url='/api/v1/customer/orders/'+id+'/payment-intent';
 const post=(path=url)=>request(app.getHttpServer()).post(path).set('Authorization','Bearer signed.jwt');
 try{
  assert.equal((await request(app.getHttpServer()).post(url)).status,401);
  suspended=true;assert.equal((await post().send({requestKey:'retry_key'})).status,403);suspended=false;
  limited=true;assert.equal((await post().send({requestKey:'retry_key'})).status,429);limited=false;
  assert.equal((await post('/api/v1/customer/orders/invalid/payment-intent').send({requestKey:'retry_key'})).status,400);
  for(const body of [{},{requestKey:'short'},{requestKey:'retry_key',amountMinor:1},{requestKey:'retry_key',customerSubject:'other'}])assert.equal((await post().send(body)).status,400);
  assert.equal(calls,0);const result=await post().send({requestKey:'retry_key'});assert.equal(result.status,200);
  assert.equal(result.body.checkoutEnabled,false);assert.equal(result.headers['cache-control'],'no-store');assert.equal(calls,1);
  assert.ok(apiDocument(app).paths['/api/v1/customer/orders/{id}/payment-intent']?.post?.requestBody);
 }finally{await app.close();}
});
