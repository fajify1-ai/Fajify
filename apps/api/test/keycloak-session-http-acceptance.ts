import 'reflect-metadata';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import {VersioningType} from '@nestjs/common';
import request from 'supertest';
import {SessionController} from '../src/auth/session.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {AccessService} from '../src/auth/access.service';
import {KeycloakAccessTokenVerifier} from '../src/auth/keycloak.verifier';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';

async function main(){
 assert.equal(process.env.FAJI_DISPOSABLE_DATABASE,'m2_faji_application','disposable database only');
 assert.ok(process.env.KEYCLOAK_ISSUER?.startsWith('http://127.0.0.1:'));
 const parts:Buffer[]=[];
 for await(const chunk of process.stdin)parts.push(Buffer.from(chunk));
 const fixture=JSON.parse(Buffer.concat(parts).toString('utf8')) as {token:string;subject:string;sessionId:string};
 assert.ok(fixture.token&&fixture.subject&&fixture.sessionId);
 const pool=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:2});
 const access=new AccessService(pool);
 const verifier=new KeycloakAccessTokenVerifier(process.env.KEYCLOAK_ISSUER!,'faji-api');
 const mod=await Test.createTestingModule({controllers:[SessionController],providers:[
  IdentityGuard,AccountGuard,{provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access}
 ]}).compile();
 const app=mod.createNestApplication();
 app.setGlobalPrefix('api');app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 try{
  const checked=await verifier.verifyAccessToken(fixture.token);
  assert.equal(checked.subject,fixture.subject);
  assert.equal(checked.sessionId,fixture.sessionId,'sid must originate in signed bearer');
  await access.provisionSubject(fixture.subject);
  await access.setSuspended('m2-acceptance-root',fixture.subject,false);
  const get=()=>request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization','Bearer '+fixture.token);
  const revoke=()=>request(app.getHttpServer()).post('/api/v1/auth/sessions/revoke-current')
   .set('Authorization','Bearer '+fixture.token);
  assert.equal((await get()).status,200);
  assert.equal((await revoke()).status,201);
  assert.equal(await access.sessionRevoked(fixture.subject,fixture.sessionId),true);
  assert.equal((await get()).status,403,'API must reject bearer after application-level session revocation');
  assert.equal((await revoke()).status,403,'revoked bearer must not repeat mutation');
  console.log('PASS: real Keycloak customer token denied by application session revocation');
 }finally{
  await app.close();
  await pool.query('DELETE FROM revoked_identity_sessions WHERE identity_subject=$1',[fixture.subject]);
  await pool.query('DELETE FROM identity_security_events WHERE actor_subject=$1',[fixture.subject]);
  await pool.query('DELETE FROM account_access WHERE identity_subject=$1',[fixture.subject]);
  await pool.query('DELETE FROM user_profiles WHERE identity_subject=$1',[fixture.subject]);
  await pool.end();
 }
}
main().catch(error=>{console.error('FAIL: Keycloak session API acceptance: '+(error instanceof Error?error.message:'unknown'));process.exitCode=1;});
