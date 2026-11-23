import 'reflect-metadata';
import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import type {Pool} from 'pg';
import {AccountGuard} from '../src/auth/account.guard';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {IdentityGuard} from '../src/auth/identity.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AdminScopeGuard} from '../src/admin/admin-scope.guard';
import {AdminReadAuditGuard} from '../src/admin/admin-read-audit.guard';
import {AdminWaitlistController,WaitlistController} from '../src/admin/waitlist.controller';
import {WAITLIST_CONSENT_VERSION,WaitlistService,waitlistClientAddress} from '../src/admin/waitlist.service';
import {setupApi} from '../src/main';

const originalOrigins=process.env.FAJI_WEB_ORIGINS;
const originalSecret=process.env.BETTER_AUTH_SECRET;
after(()=>{
 if(originalOrigins===undefined)delete process.env.FAJI_WEB_ORIGINS;
 else process.env.FAJI_WEB_ORIGINS=originalOrigins;
 if(originalSecret===undefined)delete process.env.BETTER_AUTH_SECRET;
 else process.env.BETTER_AUTH_SECRET=originalSecret;
});

test('waitlist signup normalizes contact data and stores consent idempotently',async()=>{
 process.env.BETTER_AUTH_SECRET='waitlist-test-secret'.padEnd(32,'x');
 const calls:{sql:string;params?:unknown[]}[]=[];
 const pool={query:async(sql:string,params?:unknown[])=>{
  calls.push({sql,params});
  if(sql.includes('INSERT INTO waitlist_rate_buckets'))return {rows:[{used:1}]};
  return {rows:[],rowCount:0};
 }} as unknown as Pool;
 const service=new WaitlistService(pool);
 assert.deepEqual(await service.signup({email:' Person@Example.com ',whatsapp:'08012345678',consent:true},'203.0.113.8'),{accepted:true});
 const rate=calls.find(call=>call.sql.includes('waitlist_rate_buckets'));
 assert.ok(rate);
 assert.equal((rate.params?.[0] as string).length,64);
 assert.ok(!(rate.params?.includes('203.0.113.8')));
 const insert=calls.find(call=>call.sql.includes('INSERT INTO waitlist_signups'));
 assert.ok(insert?.sql.includes('ON CONFLICT(email_normalized) DO NOTHING'));
 assert.deepEqual(insert?.params,['person@example.com','+2348012345678',WAITLIST_CONSENT_VERSION]);
 assert.deepEqual(await service.signup({email:'person@example.com',whatsapp:'08012345678',consent:true},'203.0.113.8'),{accepted:true});
 assert.equal(calls.filter(call=>call.sql.includes('INSERT INTO waitlist_signups')).length,2);
});

test('waitlist signup rejects invalid phone, unavailable configuration and rate-limit overflow',async()=>{
 process.env.BETTER_AUTH_SECRET='waitlist-test-secret'.padEnd(32,'x');
 let used=1,signupWrites=0;
 const pool={query:async(sql:string)=>{
  if(sql.includes('INSERT INTO waitlist_rate_buckets'))return {rows:[{used}]};
  if(sql.includes('INSERT INTO waitlist_signups'))signupWrites++;
  return {rows:[],rowCount:0};
 }} as unknown as Pool;
 const service=new WaitlistService(pool);
 await assert.rejects(service.signup({email:'person@example.com',whatsapp:'1111111111',consent:true},'203.0.113.8'),{status:400});
 assert.equal(signupWrites,0);
 used=6;
 await assert.rejects(service.signup({email:'person@example.com',whatsapp:'8012345678',consent:true},'203.0.113.8'),{status:429});
 assert.equal(signupWrites,0);
 delete process.env.BETTER_AUTH_SECRET;
 await assert.rejects(service.signup({email:'person@example.com',whatsapp:'8012345678',consent:true},'203.0.113.8'),{status:503});
});

test('waitlist listing escapes wildcard search and returns bounded pagination',async()=>{
 let observed:{sql:string;params?:unknown[]}|undefined;
 const rows=[
  {id:'one',email:'person@example.com',whatsapp:'+2348012345678',consentVersion:WAITLIST_CONSENT_VERSION,consentedAt:'2026-01-01',createdAt:'2026-01-01'},
  {id:'two',email:'another@example.com',whatsapp:'+2349012345678',consentVersion:WAITLIST_CONSENT_VERSION,consentedAt:'2026-01-02',createdAt:'2026-01-02'}
 ];
 const pool={query:async(sql:string,params?:unknown[])=>{observed={sql,params};return {rows};}} as unknown as Pool;
 const result=await new WaitlistService(pool).list({limit:1,offset:0,search:'%_'});
 assert.equal(result.items.length,1);
 assert.equal(result.nextOffset,1);
 assert.equal(observed?.params?.[0],'\\%\\_');
 assert.equal(observed?.params?.[1],2);
 assert.equal(observed?.params?.[2],0);
 assert.match(observed?.sql??'',/ORDER BY created_at DESC,id DESC/);
});

test('waitlist rate limiting uses only valid ingress or socket addresses',()=>{
 assert.equal(waitlistClientAddress({headers:{'x-faji-client-ip':'203.0.113.8'},socket:{remoteAddress:'10.0.0.2'}}),'203.0.113.8');
 assert.equal(waitlistClientAddress({headers:{'x-forwarded-for':'203.0.113.8'},socket:{remoteAddress:'10.0.0.2'}}),'10.0.0.2');
 assert.throws(()=>waitlistClientAddress({headers:{'x-faji-client-ip':'not-an-ip'},socket:{remoteAddress:'10.0.0.2'}}),{status:503});
 assert.throws(()=>waitlistClientAddress({headers:{}}),{status:503});
});

test('waitlist HTTP accepts only configured origins and requires validated consent',async()=>{
 process.env.FAJI_WEB_ORIGINS='https://preview.fajify.com';
 let submitted=0;
 let listedQuery:{limit:number;offset:number;search?:string}|undefined;
 const service={
  signup:async()=>{submitted++;return {accepted:true};},
  list:async(query:{limit:number;offset:number;search?:string})=>{listedQuery=query;return {items:[],nextOffset:null};}
 };
 const guard={canActivate:()=>true};
 const testing=Test.createTestingModule({
  controllers:[WaitlistController,AdminWaitlistController],
  providers:[
   {provide:WaitlistService,useValue:service},
  ]
 });
 testing.overrideGuard(IdentityGuard).useValue(guard);
 testing.overrideGuard(AccountGuard).useValue(guard);
 testing.overrideGuard(PrivilegedGuard).useValue(guard);
 testing.overrideGuard(AdminScopeGuard).useValue(guard);
 testing.overrideGuard(AdminRateGuard).useValue(guard);
 testing.overrideGuard(AdminReadAuditGuard).useValue(guard);
 const module=await testing.compile();
 const app=module.createNestApplication();
 setupApi(app);
 await app.init();
 const server=app.getHttpServer();
 const body={email:'person@example.com',whatsapp:'8012345678',consent:true};
 try{
  assert.equal((await request(server).post('/api/v1/waitlist').send(body)).status,403);
  assert.equal((await request(server).post('/api/v1/waitlist').set('Origin','https://evil.example').send(body)).status,403);
  assert.equal((await request(server).post('/api/v1/waitlist').set('Origin','https://preview.fajify.com').send({...body,consent:false})).status,400);
  const accepted=await request(server).post('/api/v1/waitlist').set('Origin','https://preview.fajify.com').send(body);
  assert.equal(accepted.status,201);
  assert.deepEqual(accepted.body,{accepted:true});
  assert.equal(submitted,1);
  assert.equal(Reflect.getMetadata('faji:m8:required-admin-scope',AdminWaitlistController.prototype.list),'waitlist.read');
  const list=await request(server).get('/api/v1/admin/waitlist?limit=20&offset=0&search=person').set('Authorization','Bearer fixture');
  assert.equal(list.status,200);
  assert.equal(list.headers['cache-control'],'no-store');
  assert.equal(listedQuery?.limit,20);
  assert.equal(listedQuery?.offset,0);
  assert.equal(listedQuery?.search,'person');
  const result=await request(server).get('/api/v1/admin/waitlist?limit=51').set('Authorization','Bearer fixture');
  assert.equal(result.status,400);
  process.env.FAJI_WEB_ORIGINS='';
  const configurationFailure=await request(server).post('/api/v1/waitlist').set('Origin','https://preview.fajify.com').send(body);
  assert.equal(configurationFailure.status,503);
 }finally{await app.close();}
});
