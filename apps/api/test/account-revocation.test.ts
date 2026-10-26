import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService,type AccessState} from '../src/auth/access.service';
import type {VerifiedIdentity} from '../src/auth/identity.types';

const issuedAt=1800000000;
const identity={
 subject:'synthetic-subject',issuer:'https://issuer.example/realms/faji',
 audience:['faji-api'],issuedAt,expiresAt:issuedAt+300,roles:['customer']
} satisfies VerifiedIdentity;

const check=async(state:AccessState, token=identity)=>{
 const access={state:async(subject:string)=>{assert.equal(subject,identity.subject);return state;}} as AccessService;
 const context={switchToHttp:()=>({getRequest:()=>({identity:token})})} as any;
 return new AccountGuard(access).canActivate(context);
};

test('account guard permits active account without cutoff',async()=>{
 assert.equal(await check({suspended:false,revokedAfter:null}),true);
});

test('account guard denies access after suspension even with a formerly valid bearer',async()=>{
 assert.equal(await check({suspended:true,revokedAfter:new Date((issuedAt+30)*1000)}),false);
});

test('revocation cutoff rejects issued-before token after reinstatement',async()=>{
 assert.equal(await check({suspended:false,revokedAfter:new Date((issuedAt+30)*1000)}),false);
});

test('revocation cutoff permits later token after reinstatement',async()=>{
 assert.equal(await check({suspended:false,revokedAfter:new Date((issuedAt-30)*1000)}),true);
});

test('revocation boundary fails closed for tokens issued in cutoff second',async()=>{
 assert.equal(await check({suspended:false,revokedAfter:new Date(issuedAt*1000)}),false);
});

test('account guard fails closed when database state is unavailable',async()=>{
 const access={state:async()=>{throw Error('database unavailable');}} as unknown as AccessService;
 const context={switchToHttp:()=>({getRequest:()=>({identity})})} as any;
 assert.equal(await new AccountGuard(access).canActivate(context),false);
});
