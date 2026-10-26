import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import {VersioningType} from '@nestjs/common';
import request from 'supertest';
import {SessionController} from '../src/auth/session.controller';
import {AdminAccessController} from '../src/auth/admin-access.controller';
import {IdentityGuard} from '../src/auth/identity.guard';
import {AccountGuard} from '../src/auth/account.guard';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
import {AccessService} from '../src/auth/access.service';
import {KeycloakAccessTokenVerifier} from '../src/auth/keycloak.verifier';
import {IDENTITY_VERIFIER} from '../src/auth/identity.types';

async function main(){
 assert.equal(process.env.FAJI_DISPOSABLE_DATABASE,'m2_faji_application',
  'Only explicitly disposable Fajify application database is allowed');
 assert.ok(process.env.KEYCLOAK_ISSUER?.startsWith('http://127.0.0.1:'));
 assert.equal(process.env.KEYCLOAK_AUDIENCE,'faji-api');
 const pieces:Buffer[]=[];
 for await(const chunk of process.stdin)pieces.push(Buffer.from(chunk));
 const fixture=JSON.parse(Buffer.concat(pieces).toString('utf8')) as {token:string;subject:string};
 assert.ok(fixture.token&&fixture.subject);
 const pool=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:2});
 const access=new AccessService(pool);
 const target='synthetic-target-'+randomUUID();
 const rootActor='m2-acceptance-root';
 const verifier=new KeycloakAccessTokenVerifier(process.env.KEYCLOAK_ISSUER!,process.env.KEYCLOAK_AUDIENCE!);
 const module=await Test.createTestingModule({controllers:[SessionController,AdminAccessController],providers:[
  IdentityGuard,AccountGuard,PrivilegedGuard,
  {provide:IDENTITY_VERIFIER,useValue:verifier},
  {provide:AccessService,useValue:access}
 ]}).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api');
 app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 await app.init();
 try{
  await access.provisionSubject(fixture.subject);
  await access.setSuspended(rootActor,fixture.subject,false);
  await access.provisionSubject(target);
  const bearer=()=>request(app.getHttpServer()).get('/api/v1/auth/me')
   .set('Authorization','Bearer '+fixture.token);
  const active=await bearer();
  assert.equal(active.status,200,'real Keycloak-signed bearer should be accepted');
  assert.equal(active.body.subject,fixture.subject);
  const approved=await request(app.getHttpServer()).post('/api/v1/admin/accounts/'+target+'/suspension')
   .set('Authorization','Bearer '+fixture.token).send({suspended:false});
  assert.equal(approved.status,201,'real Keycloak OTP token must authorize privileged account approval');
  assert.equal((await access.state(target)).suspended,false);
  const tampered=fixture.token.slice(0,-1)+(fixture.token.at(-1)==='A'?'B':'A');
  const invalid=await request(app.getHttpServer()).get('/api/v1/auth/me')
   .set('Authorization','Bearer '+tampered);
  assert.equal(invalid.status,401,'tampered signed bearer must be rejected');
  await access.setSuspended(rootActor,fixture.subject,true);
  assert.equal((await bearer()).status,403,'suspension must deny a real previously issued bearer');
  await access.setSuspended(rootActor,fixture.subject,false);
  assert.equal((await bearer()).status,403,'reinstatement cannot restore the old bearer');
  console.log('PASS: real Keycloak-signed OTP bearer authorizes API approval, then is rejected by PostgreSQL cutoff');
 }finally{await app.close();await pool.end();}
}
main().catch(error=>{console.error('FAIL: live Keycloak/PostgreSQL HTTP acceptance: '+(error instanceof Error?error.message:'unknown'));process.exitCode=1;});
