import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {VersioningType} from '@nestjs/common';
import request from 'supertest';
import {OnboardingController} from '../src/auth/onboarding.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';

test('enrollment requires verified identity and uses the signed subject, never supplied identity',async()=>{
 const saved:string[]=[];
 const verifier:IdentityVerifier={verifyAccessToken:async(token)=>{
  if(token!=='verified.jwt.token')throw Error('invalid bearer');
  return {subject:'keycloak-immutable-id',issuer:'https://issuer.test',audience:['faji-api'],
   expiresAt:1900000000,issuedAt:1800000000,roles:['customer']};
 }};
 const module=await Test.createTestingModule({controllers:[OnboardingController],providers:[
  IdentityGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:{provisionSubject:async(subject:string)=>{saved.push(subject);}}}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 try{
  const noAuth=await request(app.getHttpServer()).post('/api/v1/auth/enroll').send({subject:'attacker'});
  assert.equal(noAuth.status,401);
  const bad=await request(app.getHttpServer()).post('/api/v1/auth/enroll')
    .set('Authorization','Bearer bad.jwt.token').send({});
  assert.equal(bad.status,401);
  const good=await request(app.getHttpServer()).post('/api/v1/auth/enroll')
    .set('Authorization','Bearer verified.jwt.token').send({subject:'attacker'});
  assert.equal(good.status,201);
  assert.equal(good.body.status,'pending_approval');
  assert.deepEqual(saved,['keycloak-immutable-id']);
 }finally{await app.close();}
});
