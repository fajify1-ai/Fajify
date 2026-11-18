import 'reflect-metadata';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {IdentityGuard} from '../src/auth/identity.guard';
import {normalizeAuthenticationOrigin,normalizeAuthenticationOrigins} from '../src/auth/auth-origins';
import type {IdentityVerifier} from '../src/auth/identity.types';
import {Test} from '@nestjs/testing';
import {IdentityModule} from '../src/auth/identity.module';
import {DATABASE_POOL} from '../src/tokens';
import {DatabaseModule} from '../src/database.module';
const ctx=(authorization?:string)=>({switchToHttp:()=>({getRequest:()=>({headers:{authorization}})})}) as any;
test('Better Auth identity module denies unverified bearer tokens',async()=>{
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule]})
  .overrideProvider(DATABASE_POOL)
  .useValue({query:async()=>{throw Error('Database must not be queried by invalid token');},end:async()=>{}})
  .compile();
 try{await assert.rejects(module.get(IdentityGuard).canActivate(ctx('Bearer forged.jwt.token')),{status:401});}
 finally{await module.close();}
});
test('identity guard rejects missing access token',async()=>{
 const verifier:IdentityVerifier={verifyAccessToken:async()=>{throw Error('must not call');}};
 await assert.rejects(new IdentityGuard(verifier).canActivate(ctx()),{status:401});
});
test('identity guard rejects forged or unverified bearer',async()=>{
 const verifier:IdentityVerifier={verifyAccessToken:async()=>{throw Error('bad signature');}};
 await assert.rejects(new IdentityGuard(verifier).canActivate(ctx('Bearer forged')), {status:401});
});
test('verified subject passes through dependency-injected verifier',async()=>{
 const identity={subject:'immutable-subject',issuer:'https://issuer.example',audience:['faji-api'],expiresAt:9999999999,issuedAt:1700000000,roles:[]};
 const verifier:IdentityVerifier={verifyAccessToken:async(token)=>{assert.equal(token,'verified.jwt.token');return identity;}};
 const request={headers:{authorization:'Bearer verified.jwt.token'},identity:undefined as unknown};
 const context={switchToHttp:()=>({getRequest:()=>request})} as any;
 assert.equal(await new IdentityGuard(verifier).canActivate(context),true);
 assert.equal(request.identity,identity);
});
test('Better Auth canonicalizes explicit HTTPS origins and trailing slashes',()=>{
 assert.equal(normalizeAuthenticationOrigin('https://api.fajify.com/'),'https://api.fajify.com');
 assert.deepEqual(normalizeAuthenticationOrigins('https://preview.fajify.com/, https://preview.fajify.com'),
  ['https://preview.fajify.com']);
});
test('Better Auth rejects missing, wildcard, credentialed, queried, or path-based origins',()=>{
 for(const value of ['', '*', 'https://user:pass@preview.fajify.com', 'https://preview.fajify.com/path',
  'https://preview.fajify.com?next=evil', 'https://preview.fajify.com#fragment']){
  assert.throws(()=>normalizeAuthenticationOrigin(value));
 }
 assert.throws(()=>normalizeAuthenticationOrigins('https://preview.fajify.com,'));
});
test('cookie-authenticated API mutations accept the canonical origin from a trailing-slash allowlist only',async()=>{
 const previous=process.env.FAJI_WEB_ORIGINS;
 process.env.FAJI_WEB_ORIGINS='https://preview.fajify.com/';
 const identity={subject:'customer-subject',issuer:'https://api.fajify.com',audience:['faji-api'],expiresAt:9999999999,issuedAt:1700000000,roles:['customer']};
 const verifier:IdentityVerifier={verifyAccessToken:async()=>identity,verifyHeaders:async()=>identity};
 const request={method:'POST',headers:{origin:'https://preview.fajify.com',cookie:'better-auth.session_token=opaque'},identity:undefined as unknown};
 const context={switchToHttp:()=>({getRequest:()=>request})} as any;
 try{
  assert.equal(await new IdentityGuard(verifier).canActivate(context),true);
  request.headers.origin='https://api.fajify.com';
  await assert.rejects(new IdentityGuard(verifier).canActivate(context),{status:401});
 }finally{
  if(previous===undefined)delete process.env.FAJI_WEB_ORIGINS;else process.env.FAJI_WEB_ORIGINS=previous;
 }
});
