import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForbiddenException,ConflictException} from '@nestjs/common';
import type {Pool} from 'pg';
import type {VerifiedIdentity} from '../src/auth/identity.types';
import {AdminAccessService,PlatformAdminOwnerGuard} from '../src/admin/admin-access.service';
import type {AdminAccessInput} from '../src/admin/admin-access.dto';
import type {AdminCommandService} from '../src/admin/admin-command.service';
import {DATABASE_POOL} from '../src/tokens';

const identity:VerifiedIdentity={
 subject:'owner-subject',issuer:'https://identity.example',audience:['faji-api'],
 issuedAt:Math.floor(Date.now()/1000)-10,expiresAt:Math.floor(Date.now()/1000)+300,roles:['platform-admin']
};
const input:AdminAccessInput={
 email:'new-admin@example.com',platformAdmin:true,scopes:['operations.read','waitlist.read'],
 reason:'Grant waitlist review access',requestKey:'access-change-1'
};

function withOwnerEmail(){
 const original=process.env.FAJI_PLATFORM_ADMIN_OWNER_EMAIL;
 process.env.FAJI_PLATFORM_ADMIN_OWNER_EMAIL='fajify1@gmail.com';
 return ()=>{if(original===undefined)delete process.env.FAJI_PLATFORM_ADMIN_OWNER_EMAIL;else process.env.FAJI_PLATFORM_ADMIN_OWNER_EMAIL=original;};
}

test('only the configured, verified active platform admin passes the owner guard',async()=>{
 const restore=withOwnerEmail();
 const queries:Array<{sql:string;params:unknown[]|undefined}>=[];
 const pool={query:async(sql:string,params?:unknown[])=>{queries.push({sql,params});return {rows:[],rowCount:1};}} as unknown as Pool;
 const guard=new PlatformAdminOwnerGuard(pool);
 const context={
  switchToHttp:()=>({getRequest:()=>({identity})})
 } as unknown as import('@nestjs/common').ExecutionContext;
 try{
  assert.equal(await guard.canActivate(context),true);
  assert.deepEqual(queries[0].params,[identity.subject,'fajify1@gmail.com']);
  assert.match(queries[0].sql,/platform_admin_owner/);
  assert.match(queries[0].sql,/email_verified=true/);
  assert.match(queries[0].sql,/suspended=false/);
 }finally{restore();}
});

test('owner guard denies identities that do not match the configured owner record',async()=>{
 const restore=withOwnerEmail();
 const pool={query:async()=>({rows:[],rowCount:0})} as unknown as Pool;
 const guard=new PlatformAdminOwnerGuard(pool);
 const context={switchToHttp:()=>({getRequest:()=>({identity})})} as unknown as import('@nestjs/common').ExecutionContext;
 try{await assert.rejects(guard.canActivate(context),ForbiddenException);}
 finally{restore();}
});

test('admin access management resolves verified email and invokes the audited database command',async()=>{
 const queries:Array<{sql:string;params:unknown[]|undefined}>=[];
 const pool={query:async(sql:string,params?:unknown[])=>{
  queries.push({sql,params});
  return {rows:[{id:'target-subject',email_verified:true}],rowCount:1};
 }} as unknown as Pool;
 let command:Record<string,unknown>|undefined;
 const commands={
  execute:async(input:Record<string,unknown>,run:(client:unknown)=>Promise<unknown>)=>{
   command=input;
   return run({query:async(sql:string,params:unknown[])=>{
    queries.push({sql,params});
    return {rows:[{changed:true}],rowCount:1};
   }});
  }
 } as unknown as AdminCommandService;
 const service=new AdminAccessService(pool,commands);
 const result=await service.setAccess(identity,input);
 assert.deepEqual(result,{changed:true});
 assert.deepEqual(queries[0].params,['new-admin@example.com']);
 assert.deepEqual(queries[1].params,[
  identity.subject,'target-subject',true,['operations.read','waitlist.read'],'Grant waitlist review access'
 ]);
 assert.equal(command?.operation,'admin.access.set');
 assert.equal(command?.actor,identity.subject);
 assert.equal(command?.resourceId,'target-subject');
});

test('admin access management prevents self-change and rejects unverified accounts',async()=>{
 const pool={query:async(_sql:string,params?:unknown[])=>{
  if(params?.[0]==='owner@example.com')return {rows:[{id:identity.subject,email_verified:true}],rowCount:1};
  return {rows:[{id:'unverified-subject',email_verified:false}],rowCount:1};
 }} as unknown as Pool;
 const commands={execute:async()=>{throw new Error('must not execute');}} as unknown as AdminCommandService;
 const service=new AdminAccessService(pool,commands);
 await assert.rejects(service.setAccess(identity,{...input,email:'owner@example.com'}),ConflictException);
 await assert.rejects(service.setAccess(identity,input),ConflictException);
});
