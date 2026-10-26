import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountGuard} from '../src/auth/account.guard';
import {ResourceGuard,RequireResource} from '../src/auth/resource.guard';
import {Reflector} from '@nestjs/core';
import type {AccessService} from '../src/auth/access.service';
const subject='user-123',id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const identity={subject,issuedAt:1800000000,roles:['merchant']};
const ctx=(method:()=>unknown)=>({getHandler:()=>method,getClass:()=>Policy, switchToHttp:()=>({getRequest:()=>({identity,params:{businessId:id}})})}) as any;
class Policy { @RequireResource('business','businessId','owner') restricted(){}}
test('suspended and revoked users are denied',async()=>{
 const access={state:async()=>({suspended:true,revokedAfter:null})} as unknown as AccessService;
 assert.equal(await new AccountGuard(access).canActivate(ctx(Policy.prototype.restricted)),false);
 const revoked={state:async()=>({suspended:false,revokedAfter:new Date((identity.issuedAt+2)*1000)})} as unknown as AccessService;
 assert.equal(await new AccountGuard(revoked).canActivate(ctx(Policy.prototype.restricted)),false);
});
test('current identity allowed when access state is active',async()=>{
 const access={state:async()=>({suspended:false,revokedAfter:null})} as unknown as AccessService;
 assert.equal(await new AccountGuard(access).canActivate(ctx(Policy.prototype.restricted)),true);
});
test('resource guard enforces database membership not token role alone',async()=>{
 let called=false;
 const access={state:async()=>({suspended:false,revokedAfter:null}),member:async(sub:string,type:string,resource:string,roles:readonly string[])=>{
  called=true;assert.equal(sub,subject);assert.equal(type,'business');assert.equal(resource,id);assert.deepEqual(roles,['owner']);return false;
 }} as unknown as AccessService;
 assert.equal(await new ResourceGuard(new Reflector(),access).canActivate(ctx(Policy.prototype.restricted)),false);
 assert.equal(called,true);
});

test('resource guard denies revoked tokens even when resource membership exists',async()=>{
 let membershipChecked=false;
 const access={state:async()=>({suspended:false,revokedAfter:new Date((identity.issuedAt+10)*1000)}),
  member:async()=>{membershipChecked=true;return true;}} as unknown as AccessService;
 assert.equal(await new ResourceGuard(new Reflector(),access).canActivate(ctx(Policy.prototype.restricted)),false);
 assert.equal(membershipChecked,false,'revoked bearer cannot reach membership lookup');
});
