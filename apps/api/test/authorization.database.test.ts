import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {randomUUID,generateKeyPairSync,createPublicKey,sign} from 'node:crypto';
import {KeycloakAccessTokenVerifier} from '../src/auth/keycloak.verifier';
import {AccessService} from '../src/auth/access.service';
import {Test} from '@nestjs/testing';
import {VersioningType} from '@nestjs/common';
import request from 'supertest';
import {SessionController} from '../src/auth/session.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {IDENTITY_VERIFIER,type IdentityVerifier} from '../src/auth/identity.types';

const url=process.env.FAJI_RUNTIME_DATABASE_URL;
const migrationUrl=process.env.FAJI_DATABASE_URL;
const enabled=Boolean(url&&migrationUrl&&process.env.FAJI_DISPOSABLE_DATABASE);
const runtime=enabled?new Pool({connectionString:url,max:2}):undefined;
const admin=enabled?new Pool({connectionString:migrationUrl,max:2}):undefined;
const subject='m2_'+randomUUID(),actor='admin_'+randomUUID(),resource=randomUUID(),liveSubject='m2_'+randomUUID(),signedSubject='m2_'+randomUUID();
before(async()=>{
 if(!enabled||!admin||!runtime)throw Error('M2 database integration requires explicitly disposable migration/runtime URLs');
 const {assertDisposable}=await import('../../../packages/database/scripts/disposable-target');
 await assertDisposable(admin);await assertDisposable(runtime);
 assert.notEqual(new URL(url!).username,new URL(migrationUrl!).username);
});
after(async()=>{
 if(admin){
  await admin.query('DELETE FROM identity_security_events WHERE actor_subject=ANY($1::varchar[])',[[subject,actor,liveSubject,signedSubject]]);
  await admin.query('DELETE FROM resource_memberships WHERE identity_subject=$1',[subject]);
  await admin.query('DELETE FROM account_access WHERE identity_subject=ANY($1::varchar[])',[[subject,liveSubject,signedSubject]]);
  await admin.query('DELETE FROM user_profiles WHERE identity_subject=ANY($1::varchar[])',[[subject,liveSubject]]);
 }
 await Promise.all([runtime?.end(),admin?.end()]);
});
test('unapproved identity denied then privileges remain scoped to verified resource',async()=>{
 const access=new AccessService(runtime!);
 await access.provisionSubject(subject);
 assert.equal((await access.state(subject)).suspended,true);
 await assert.rejects(runtime!.query('CREATE TABLE m2_privilege_escape(id integer)'),{code:'42501'});
 await assert.rejects(runtime!.query('UPDATE _faji_migrations SET checksum=$1',['tamper']),{code:'42501'});
 await access.setMembership(actor,subject,'business',resource,'manager',true);
 assert.equal(await access.member(subject,'business',resource,['manager']),false,'pending account cannot use membership');
 await access.setSuspended(actor,subject,false);
 assert.equal(await access.member(subject,'business',resource,['manager']),true);
 assert.equal(await access.member('other-user','business',resource,['manager']),false);
 assert.equal(await access.member(subject,'branch',resource,['manager']),false);
 assert.equal(await access.member(subject,'business',randomUUID(),['manager']),false);
 await access.setMembership(actor,subject,'business',resource,'manager',false);
 assert.equal(await access.member(subject,'business',resource,['manager']),false);
 await access.setSuspended(actor,subject,true);
 assert.equal(await access.member(subject,'business',resource,['manager']),false,'suspended account cannot use membership');
});
test('suspension sets revocation cutoff and audit trail exists',async()=>{
 const access=new AccessService(runtime!);
 await access.setSuspended(actor,subject,true);
 const state=await access.state(subject);
 assert.equal(state.suspended,true);
 assert.ok(state.revokedAfter instanceof Date);
 const events=await admin!.query<{event_type:string}>(
  'SELECT event_type FROM identity_security_events WHERE actor_subject=ANY($1::varchar[]) ORDER BY occurred_at,id',[[subject,actor]]);
 for(const name of ['account_provisioned','membership_enabled','membership_disabled','account_suspended'])
  assert.ok(events.rows.some(e=>e.event_type===name),name);
});

test('real PostgreSQL suspension immediately denies an already-verified bearer at the HTTP API boundary',async()=>{
 const access=new AccessService(runtime!);
 await access.provisionSubject(liveSubject);
 await access.setSuspended(actor,liveSubject,false);
 // Authentication signature verification is substituted here; the separately
 // accepted Keycloak lifecycle gate covers actual signed-token exchange.
 const issuedAt=Math.floor(Date.now()/1000)-120;
 const identity={subject:liveSubject,issuer:'https://test.example/realms/faji',
  audience:['faji-api'],issuedAt,expiresAt:issuedAt+300,roles:['customer']};
 let signatureVerifications=0;
 const verifier:IdentityVerifier={verifyAccessToken:async(token)=>{
  assert.equal(token,'issued.access.token');
  signatureVerifications++;
  return identity;
 }};
 const module=await Test.createTestingModule({controllers:[SessionController],providers:[
  IdentityGuard,AccountGuard,
  {provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');
 app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 try{
  const endpoint=()=>request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization','Bearer issued.access.token');
  let response=await endpoint();
  assert.equal(response.status,200,'approved account should be accessible');
  assert.equal(response.body.subject,liveSubject);

  await access.setSuspended(actor,liveSubject,true);
  response=await endpoint();
  assert.equal(response.status,403,'same bearer must be blocked immediately after database suspension');

  await access.setSuspended(actor,liveSubject,false);
  response=await endpoint();
  assert.equal(response.status,403,'reinstatement must not revive bearer issued before suspension');

  assert.equal(signatureVerifications,3,'all requests pass identity verification before account-state enforcement');
  const events=await admin!.query<{event_type:string}>(
   'SELECT event_type FROM identity_security_events WHERE actor_subject=$1 ORDER BY occurred_at,id',[actor]);
  assert.ok(events.rows.some(e=>e.event_type==='account_suspended'));
  assert.ok(events.rows.some(e=>e.event_type==='account_reinstated'));
 }finally{await app.close();}
});

test('real RSA signature verifier and PostgreSQL reject the same bearer across suspension/reinstatement',async()=>{
 const access=new AccessService(runtime!);
 await access.provisionSubject(signedSubject);
 await access.setSuspended(actor,signedSubject,false);
 const issuer='https://identity.example.test/realms/faji';
 const pair=generateKeyPairSync('rsa',{modulusLength:2048});
 const pub=createPublicKey(pair.privateKey).export({format:'jwk'});
 const now=Math.floor(Date.now()/1000);
 const encoded=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const head=encoded({alg:'RS256',kid:'ephemeral',typ:'JWT'});
 const payload=encoded({iss:issuer,aud:'faji-api',sub:signedSubject,azp:'faji-customer-mobile',
  iat:now-120,exp:now+180,realm_access:{roles:['customer']}});
 const token=head+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+payload),pair.privateKey).toString('base64url');
 const verifier=new KeycloakAccessTokenVerifier(issuer,'faji-api',async()=>({
  keys:[{...pub,kid:'ephemeral',alg:'RS256',use:'sig'}]
 }));
 const module=await Test.createTestingModule({controllers:[SessionController],providers:[
  IdentityGuard,AccountGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 try{
  const get=()=>request(app.getHttpServer()).get('/api/v1/auth/me')
   .set('Authorization','Bearer '+token);
  assert.equal((await get()).status,200);
  const tampered=token.split('.');
  tampered[1]=encoded({iss:issuer,aud:'faji-api',sub:'attacker',iat:now-120,exp:now+180});
  assert.equal((await request(app.getHttpServer()).get('/api/v1/auth/me')
   .set('Authorization','Bearer '+tampered.join('.'))).status,401);
  await access.setSuspended(actor,signedSubject,true);
  assert.equal((await get()).status,403);
  await access.setSuspended(actor,signedSubject,false);
  assert.equal((await get()).status,403,'previously valid signed bearer must stay invalid');
 }finally{await app.close();}
});
