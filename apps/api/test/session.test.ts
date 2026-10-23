import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {Controller,Get,INestApplication,Module,UseGuards,VersioningType} from '@nestjs/common';
import request from 'supertest';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {SessionController} from '../src/auth/session.controller';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,IdentityVerifier} from '../src/auth/identity.types';

const verified={subject:'real-subject',issuer:'https://identity.example',audience:['faji-api'],expiresAt:1900000000,issuedAt:1800000000,roles:['customer']};
const run=async(state:{suspended:boolean;revokedAfter:Date|null},tokenValid=true)=>{
 const verifier:IdentityVerifier={verifyAccessToken:async()=>{if(!tokenValid)throw Error('bad signature');return verified;}};
 const module=await Test.createTestingModule({controllers:[SessionController],providers:[
  IdentityGuard,AccountGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:{state:async()=>state}}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});await app.init();
 try {
  const server=app.getHttpServer();
  const noToken=await request(server).get('/api/v1/auth/me');
  assert.equal(noToken.status,401);
  const result=await request(server).get('/api/v1/auth/me').set('Authorization','Bearer signed.token.value');
  return result;
 }finally{await app.close();}
};
test('authenticated current account obtains server-verified identity',async()=>{
 const result=await run({suspended:false,revokedAfter:null});
 assert.equal(result.status,200);assert.equal(result.body.subject,'real-subject');
 assert.deepEqual(result.body.roles,['customer']);
});
test('suspended account is denied after successful JWT verification',async()=>{
 assert.equal((await run({suspended:true,revokedAfter:null})).status,403);
});
test('revoked access token is denied by issued-at cutoff',async()=>{
 assert.equal((await run({suspended:false,revokedAfter:new Date(1800000001000)})).status,403);
});
test('invalid JWT denied before account lookup',async()=>{
 assert.equal((await run({suspended:false,revokedAfter:null},false)).status,401);
});
