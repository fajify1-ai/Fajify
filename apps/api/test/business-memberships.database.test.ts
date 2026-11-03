import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import {VersioningType,type INestApplication} from '@nestjs/common';
import request from 'supertest';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {AccessService} from '../src/auth/access.service';
import {SessionController} from '../src/auth/session.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';

test('approved /auth/me business memberships enforce real PostgreSQL identity, approval, revocation and account/profile suspension',async()=>{
 assert.ok(process.env.FAJI_DATABASE_URL);assert.ok(process.env.FAJI_RUNTIME_DATABASE_URL);
 const migrationUrl=new URL(process.env.FAJI_DATABASE_URL!),runtimeUrl=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);
 assert.equal(migrationUrl.host,runtimeUrl.host);assert.equal(migrationUrl.pathname,runtimeUrl.pathname);assert.notEqual(migrationUrl.username,runtimeUrl.username);
 const admin=new Pool({connectionString:migrationUrl.toString(),max:2}),runtime=new Pool({connectionString:runtimeUrl.toString(),max:2});
 const subjects=['member-'+randomUUID(),'foreign-'+randomUUID()],ids=[randomUUID(),randomUUID(),randomUUID(),randomUUID()],access=new AccessService(runtime);
 let app:INestApplication|undefined;let fixturesStarted=false;
 try{
  await assertDisposable(admin);await assertDisposable(runtime);fixturesStarted=true;
  for(const subject of subjects){await admin.query('INSERT INTO account_access(identity_subject) VALUES($1)',[subject]);await admin.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[subject]);}
  for(const [i,status] of ['approved','pending','rejected','approved'].entries()){
   await admin.query("INSERT INTO business_onboarding(id,applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,$2,'Membership acceptance',$3,$4,$5)",[ids[i],subjects[i===3?1:0],status,status==='pending'?null:'synthetic-reviewer',status==='pending'?null:new Date()]);
   await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role) VALUES($1,'business',$2,'owner')",[subjects[i===3?1:0],ids[i]]);
  }
  // A branch grant by itself never becomes an approved business workspace entry.
  await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role) VALUES($1,'branch',$2,'staff')",[subjects[0],randomUUID()]);
  const expected=[{resourceType:'business',resourceId:ids[0],role:'owner',status:'approved'}];
  assert.deepEqual(await access.approvedBusinessMemberships(subjects[0]),expected);
  assert.deepEqual(await access.approvedBusinessMemberships('merchant-role-without-any-membership'),[]);
  assert.deepEqual(await access.approvedBusinessMemberships(subjects[1]),[{resourceType:'business',resourceId:ids[3],role:'owner',status:'approved'}]);
  const verifier:IdentityVerifier={verifyAccessToken:async()=>({subject:subjects[0],issuer:'https://fixture.invalid',audience:['faji-api'],roles:['merchant'],issuedAt:Math.floor(Date.now()/1000)-1,expiresAt:Math.floor(Date.now()/1000)+300,sessionId:'membership-session'})};
  const module=await Test.createTestingModule({controllers:[SessionController],providers:[IdentityGuard,AccountGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},{provide:AccessService,useValue:access}]}).compile();
  app=module.createNestApplication();app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});await app.init();
  const get=()=>request(app!.getHttpServer()).get('/api/v1/auth/me?subject='+subjects[1]).set('Authorization','Bearer synthetic-signed-token');
  const owned=await get();assert.equal(owned.status,200);assert.equal(owned.body.subject,subjects[0]);assert.deepEqual(owned.body.memberships,expected);assert.deepEqual(owned.body.roles,['merchant']);
  await admin.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_id=$2",[subjects[0],ids[0]]);
  const revoked=await get();assert.equal(revoked.status,200);assert.deepEqual(revoked.body.memberships,[]);
  await admin.query("UPDATE resource_memberships SET active=true WHERE identity_subject=$1 AND resource_id=$2",[subjects[0],ids[0]]);
  await admin.query('UPDATE account_access SET suspended=true WHERE identity_subject=$1',[subjects[0]]);assert.deepEqual(await access.approvedBusinessMemberships(subjects[0]),[]);assert.equal((await get()).status,403);
  await admin.query('UPDATE account_access SET suspended=false WHERE identity_subject=$1',[subjects[0]]);
  await admin.query('UPDATE user_profiles SET suspended=true WHERE identity_subject=$1',[subjects[0]]);assert.deepEqual(await access.approvedBusinessMemberships(subjects[0]),[]);assert.equal((await get()).status,403);
  await admin.query('UPDATE user_profiles SET suspended=false WHERE identity_subject=$1',[subjects[0]]);
  await admin.query("UPDATE business_onboarding SET status='rejected' WHERE id=$1",[ids[0]]);assert.deepEqual(await access.approvedBusinessMemberships(subjects[0]),[]);assert.deepEqual((await get()).body.memberships,[]);
 }finally{
  if(app)await app.close();
  if(fixturesStarted){await admin.query('DELETE FROM resource_memberships WHERE identity_subject=ANY($1::varchar[])',[subjects]);
  await admin.query('DELETE FROM business_onboarding WHERE id=ANY($1::uuid[])',[ids]);
  await admin.query('DELETE FROM account_access WHERE identity_subject=ANY($1::varchar[])',[subjects]);
  await admin.query('DELETE FROM user_profiles WHERE identity_subject=ANY($1::varchar[])',[subjects]);
  }
  await Promise.all([admin.end(),runtime.end()]);
 }
});
