import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {Reflector} from '@nestjs/core';
import {VersioningType,ValidationPipe} from '@nestjs/common';
import request from 'supertest';
import {BusinessController} from '../src/business/business.controller';
import {BusinessService} from '../src/business/business.service';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {ResourceGuard} from '../src/auth/resource.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';
const a='ae5d7bce-c422-4eae-bf45-e68e46c06c11',b='ae5d7bce-c422-4eae-bf45-e68e46c06c12';
test('merchant HTTP routes require active scoped JWT, reject foreign tenant and validate input',async()=>{
 let suspended=false,revoked=false;
 const identity={subject:'merchant-1',issuer:'https://example.invalid',audience:['faji-api'],roles:['merchant'],issuedAt:1790000000,expiresAt:1890000000,sessionId:'sid'};
 const verifier:IdentityVerifier={verifyAccessToken:async()=>identity};
 const access={state:async()=>({suspended,revokedAfter:null}),sessionRevoked:async()=>revoked,member:async(_subject:string,_type:string,id:string)=>id===a};
 const svc={branches:async()=>[{id:b}],createBranch:async()=>({id:b})};
 const module=await Test.createTestingModule({controllers:[BusinessController],providers:[
  Reflector,IdentityGuard,AccountGuard,ResourceGuard,
  {provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access},
  {provide:BusinessService,useValue:svc},
 ]}).compile();
 const app=module.createNestApplication();app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 await app.init();
 try{
  const url='/api/v1/businesses/'+a+'/branches';
  assert.equal((await request(app.getHttpServer()).get(url)).status,401);
  const auth=(r:request.Test)=>r.set('Authorization','Bearer signed.jwt.token');
  assert.equal((await auth(request(app.getHttpServer()).get(url))).status,200);
  assert.equal((await auth(request(app.getHttpServer()).get('/api/v1/businesses/'+b+'/branches'))).status,403);
  assert.equal((await auth(request(app.getHttpServer()).get('/api/v1/businesses/garbage/branches'))).status,400);
  assert.equal((await auth(request(app.getHttpServer()).post(url).send({name:'X'}))).status,400);
  assert.equal((await auth(request(app.getHttpServer()).post(url).send({name:'North',unknown:true}))).status,400);
  assert.equal((await auth(request(app.getHttpServer()).post(url).send({name:'North'}))).status,201);
  revoked=true;
  assert.equal((await auth(request(app.getHttpServer()).get(url))).status,403);
  revoked=false;suspended=true;
  assert.equal((await auth(request(app.getHttpServer()).get(url))).status,403);
 }finally{await app.close();}
});
