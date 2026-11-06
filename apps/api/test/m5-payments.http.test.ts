import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {Test} from '@nestjs/testing';
import {UnauthorizedException} from '@nestjs/common';
import request from 'supertest';
import {PaymentsController} from '../src/payments/payments.controller';
import {PaymentsService} from '../src/payments/payments.service';
import {setupApi,apiDocument} from '../src/main';

test('M5: webhook preserves raw bytes, rejects unsigned events and exports the versioned route',async()=>{
 const raw='{ "event": "charge.success", "data": {"reference":"fixture123"} }';
 const sig=createHmac('sha512','fixture').update(raw).digest('hex');
 let calls=0;
 const module=await Test.createTestingModule({controllers:[PaymentsController],providers:[{provide:PaymentsService,useValue:{webhook:async(body:Buffer,signature:unknown)=>{
  assert.equal(body.toString(),raw);if(signature!==sig)throw new UnauthorizedException();calls++;return {received:true};
 }}}]}).compile();
 const app=module.createNestApplication({rawBody:true});setupApi(app);await app.init();
 try{
  const url='/api/v1/payments/webhooks/paystack';
  assert.equal((await request(app.getHttpServer()).post(url).set('Content-Type','application/json').send(raw)).status,401);
  assert.equal((await request(app.getHttpServer()).post(url).set('Content-Type','application/json').set('x-paystack-signature',sig).send(raw)).status,200);
  assert.equal(calls,1);assert.ok(apiDocument(app).paths[url]?.post);
 }finally{await app.close();}
});
