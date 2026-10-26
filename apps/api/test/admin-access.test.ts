import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {VersioningType} from '@nestjs/common';
import request from 'supertest';
import {AdminAccessController} from '../src/auth/admin-access.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AccessService} from '../src/auth/access.service';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';

const now=Math.floor(Date.now()/1000);
async function fixture(acr?:string,roles:string[]=['customer']){
 const events:{actor:string;subject:string;suspended:boolean}[]=[];
 const verifier:IdentityVerifier={verifyAccessToken:async()=>({
  subject:'admin-subject',issuer:'https://identity.example/realms/faji',audience:['faji-api'],
  expiresAt:now+300,issuedAt:now-10,roles,authorizedParty:'faji-admin-web',authContext:acr,authTime:now-10
 })};
 const access={
  state:async()=>({suspended:false,revokedAfter:null}),
  setSuspended:async(actor:string,subject:string,suspended:boolean)=>{events.push({actor,subject,suspended});}
 };
 const module=await Test.createTestingModule({controllers:[AdminAccessController],providers:[
  IdentityGuard,AccountGuard,PrivilegedGuard,
  {provide:IDENTITY_VERIFIER,useValue:verifier},{provide:AccessService,useValue:access}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 return {app,events};
}
test('admin mutation refuses a customer without privileged role and MFA',async()=>{
 const f=await fixture();
 try {
  const response=await request(f.app.getHttpServer()).post('/api/v1/admin/accounts/subject-2/suspension')
   .set('Authorization','Bearer synthetic.jwt.token').send({suspended:true});
  assert.equal(response.status,403);assert.equal(f.events.length,0);
 }finally{await f.app.close();}
});
test('admin mutation refuses platform-admin without enforced assurance claim',async()=>{
 const f=await fixture(undefined,['platform-admin']);
 try {
  const response=await request(f.app.getHttpServer()).post('/api/v1/admin/accounts/subject-2/suspension')
   .set('Authorization','Bearer synthetic.jwt.token').send({suspended:true});
  assert.equal(response.status,403);assert.equal(f.events.length,0);
 }finally{await f.app.close();}
});
test('privileged admin can suspend another provisioned account',async()=>{
 const f=await fixture('faji-mfa',['platform-admin']);
 try {
  const response=await request(f.app.getHttpServer()).post('/api/v1/admin/accounts/subject-2/suspension')
   .set('Authorization','Bearer synthetic.jwt.token').send({suspended:true});
  assert.equal(response.status,201);
  assert.deepEqual(f.events,[{actor:'admin-subject',subject:'subject-2',suspended:true}]);
 }finally{await f.app.close();}
});
