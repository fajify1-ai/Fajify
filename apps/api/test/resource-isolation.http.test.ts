import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Controller,Get,Param,UseGuards,VersioningType} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {Reflector} from '@nestjs/core';
import request from 'supertest';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {ResourceGuard,RequireResource} from '../src/auth/resource.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';

const tenantA='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const tenantB='ae5d7bce-c422-4eae-bf45-e68e46c06c12';

@Controller({path:'security-test/businesses',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,ResourceGuard)
class SecuredBusinessFixture {
 @Get(':businessId')
 @RequireResource('business','businessId','owner','manager')
 read(@Param('businessId') businessId:string){return {businessId};}
}

test('HTTP scoped business endpoint blocks cross-tenant access and revoked membership',async()=>{
 let suspended=false,revoked=false;
 const memberships=new Set([tenantA]);
 const identity={subject:'business-operator',issuer:'https://issuer.example/realms/faji',
  audience:['faji-api'],roles:['merchant'],issuedAt:1800000000,expiresAt:1900000000,sessionId:'sid-1'};
 const verifier:IdentityVerifier={verifyAccessToken:async()=>identity};
 const access={
  state:async()=>({suspended,revokedAfter:null}),
  sessionRevoked:async()=>revoked,
  member:async(subject:string,type:string,id:string,roles:readonly string[])=>
   subject===identity.subject&&type==='business'&&roles.includes('manager')&&memberships.has(id)
 };
 const module=await Test.createTestingModule({controllers:[SecuredBusinessFixture],providers:[
  Reflector,IdentityGuard,AccountGuard,ResourceGuard,
  {provide:IDENTITY_VERIFIER,useValue:verifier},{provide:AccessService,useValue:access}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});await app.init();
 try{
  const get=(id:string)=>request(app.getHttpServer()).get('/api/v1/security-test/businesses/'+id)
   .set('Authorization','Bearer signed.jwt.value');
  assert.equal((await get(tenantA)).status,200);
  assert.equal((await get(tenantB)).status,403,'tenant A credential must not access tenant B');
  assert.equal((await get('invalid-id')).status,400);
  memberships.clear();
  assert.equal((await get(tenantA)).status,403,'revoked membership must immediately stop access');
  memberships.add(tenantA);
  revoked=true;
  assert.equal((await get(tenantA)).status,403,'revoked Keycloak session cannot use a retained membership');
  revoked=false;suspended=true;
  assert.equal((await get(tenantA)).status,403,'suspended account cannot use a retained membership');
 }finally{await app.close();}
});
