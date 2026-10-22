import 'reflect-metadata';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {IdentityGuard} from '../src/auth/identity.guard';
import type {IdentityVerifier} from '../src/auth/identity.types';
const ctx=(authorization?:string)=>({switchToHttp:()=>({getRequest:()=>({headers:{authorization}})})}) as any;
test('identity guard rejects missing access token',async()=>{
 const verifier:IdentityVerifier={verifyAccessToken:async()=>{throw Error('must not call');}};
 await assert.rejects(new IdentityGuard(verifier).canActivate(ctx()),{status:401});
});
test('identity guard rejects forged or unverified bearer',async()=>{
 const verifier:IdentityVerifier={verifyAccessToken:async()=>{throw Error('bad signature');}};
 await assert.rejects(new IdentityGuard(verifier).canActivate(ctx('Bearer forged')), {status:401});
});
test('verified subject passes through dependency-injected verifier',async()=>{
 const identity={subject:'immutable-subject',issuer:'https://issuer.example',audience:['faji-api'],expiresAt:9999999999,roles:[]};
 const verifier:IdentityVerifier={verifyAccessToken:async(token)=>{assert.equal(token,'verified.jwt.token');return identity;}};
 const request={headers:{authorization:'Bearer verified.jwt.token'},identity:undefined as unknown};
 const context={switchToHttp:()=>({getRequest:()=>request})} as any;
 assert.equal(await new IdentityGuard(verifier).canActivate(context),true);
 assert.equal(request.identity,identity);
});
