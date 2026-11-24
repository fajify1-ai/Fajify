import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'node:net';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {IdentityModule} from '../src/auth/identity.module';
import {DatabaseModule} from '../src/database.module';
import {BetterAuthService} from '../src/auth/better-auth.service';
import {DATABASE_POOL} from '../src/tokens';
import {setupApi} from '../src/main';
import type {NestExpressApplication} from '@nestjs/platform-express';

function startSmtpSink(){
 const messages:string[]=[];
 const server=createServer(socket=>{
  socket.write('220 localhost ESMTP test sink\r\n');
  let input='';let collecting=false;let lines:string[]=[];
  socket.on('data',chunk=>{
   input+=chunk.toString();
   let end=input.indexOf('\r\n');
   while(end>=0){
    const line=input.slice(0,end);input=input.slice(end+2);
    if(collecting){
     if(line==='.'){
      collecting=false;messages.push(lines.join('\r\n'));lines=[];
      socket.write('250 Message accepted\r\n');
     }else lines.push(line.startsWith('..')?line.slice(1):line);
    }else if(/^EHLO|^HELO/i.test(line))socket.write('250-localhost\r\n250 SIZE 52428800\r\n');
    else if(/^DATA$/i.test(line)){collecting=true;socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');}
    else if(/^QUIT$/i.test(line))socket.write('221 Bye\r\n');
    else socket.write('250 OK\r\n');
    end=input.indexOf('\r\n');
   }
  });
 });
 return new Promise<{messages:string[];port:number;close:()=>Promise<void>}>((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
   const address=server.address();
   if(!address||typeof address==='string'){reject(new Error('SMTP test sink did not bind to a TCP port'));return;}
   resolve({messages,port:address.port,close:()=>new Promise<void>((done,fail)=>server.close(error=>error?fail(error):done()))});
  });
 });
}

test('Better Auth: native bearer and web cookie lifecycle, recovery and authorization',async()=>{
 const url=process.env.FAJI_AUTH_TEST_DATABASE_URL;
 assert.ok(url,'Set FAJI_AUTH_TEST_DATABASE_URL to a fresh disposable database');
 assert.match(new URL(url).pathname,/^\/fajify_auth_test/);
 const pool=new Pool({connectionString:url});
 const smtp=await startSmtpSink();
 process.env.NODE_ENV='test';
 process.env.BETTER_AUTH_SECRET='disposable-auth-test-secret-over-thirty-two-characters';
 process.env.BETTER_AUTH_URL='http://localhost:3001';
 process.env.FAJI_WEB_ORIGINS='http://localhost:3000/,https://preview.fajify.com';
 process.env.FAJI_REGISTRATION_ENABLED='true';
 process.env.FAJI_EMAIL_DELIVERY_ENABLED='true';
 process.env.SMTP_URL=`smtp://127.0.0.1:${smtp.port}`;
 process.env.AUTH_EMAIL_FROM='Fajify Test <auth@example.test>';
 // Authentication fixture intentionally does not install unrelated PostGIS domain tables.
 await pool.query(`CREATE TABLE user_profiles(id uuid DEFAULT gen_random_uuid(),identity_subject varchar(255) UNIQUE, display_name varchar(120),phone_number varchar(32),date_of_birth date,home_address varchar(500),terms_accepted_at timestamptz, suspended boolean DEFAULT false);
 CREATE TABLE business_onboarding(id uuid,status text);
 `);
 await pool.query(readFileSync(resolve(__dirname,'../../../packages/database/migrations/0002_identity_authorization.sql'),'utf8'));
 await pool.query(`CREATE TABLE revoked_identity_sessions(identity_subject varchar(255),session_id varchar(255),PRIMARY KEY(identity_subject,session_id));`);
 await pool.query(readFileSync(resolve(__dirname,'../../../packages/database/migrations/0104_better_auth.sql'),'utf8'));
 await pool.query(readFileSync(resolve(__dirname,'../../../packages/database/migrations/0105_auth_claims_and_factors.sql'),'utf8'));
 await pool.query(readFileSync(resolve(__dirname,'../../../packages/database/migrations/0107_password_session_revocation.sql'),'utf8'));
 await pool.query(readFileSync(resolve(__dirname,'../../../packages/database/migrations/0108_retire_prelaunch_identity_claims.sql'),'utf8'));
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule]}).overrideProvider(DATABASE_POOL).useValue(pool).compile();
 const app=module.createNestApplication<NestExpressApplication>({bodyParser:false});
 app.use('/api/auth',(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse,next:(error?:unknown)=>void)=>{module.get(BetterAuthService).handle(req,res).catch(next);});
 app.useBodyParser('json');setupApi(app);await app.init();
 const http=app.getHttpServer();const password='correct-horse-disposable-123';const email='auth-test@example.test';
 const auth=(token:string)=>({'Authorization':`Bearer ${token}`});
 try{
  const registration={name:'Auth Test',email,password,roles:['platform-admin'],username:'auth_test',phoneNumber:'+2348012345678',dateOfBirth:'1998-02-01',homeAddress:'Test address',termsAccepted:true};
  const created=await request(http).post('/api/auth/sign-up/email').set('Origin','http://localhost:3000').send(registration);
  assert.equal(created.status,200,JSON.stringify(created.body));
  const unverifiedLogin=await request(http).post('/api/auth/sign-in/email').set('Origin','http://localhost:3000').send({email,password});
  assert.equal(unverifiedLogin.status,403,'login must not establish a new session before email verification');
  const resend=await request(http).post('/api/auth/send-verification-email').set('Origin','https://preview.fajify.com').send({email,callbackURL:'https://preview.fajify.com/login'});
  assert.equal(resend.status,200,`trusted staging origin can request verification delivery: ${JSON.stringify(resend.body)}`);
  const verificationMail=smtp.messages.filter(message=>message.includes('Verify your email address')).at(-1);
  assert.ok(verificationMail,'signup or resend must deliver a verification email');
  const verificationLink=verificationMail.match(/http:\/\/localhost:3001\/api\/auth\/verify-email\?[^\s]+/)?.[0];
  assert.ok(verificationLink,'verification email must contain the Better Auth verification URL');
  const verificationURL=new URL(verificationLink);
  assert.ok((await request(http).get(verificationURL.pathname+verificationURL.search)).status<400,'verification link must complete');
  assert.equal((await pool.query('SELECT email_verified FROM auth_user WHERE email=$1',[email])).rows[0].email_verified,true);
  const duplicate=await request(http).post('/api/auth/sign-up/email').set('Origin','http://localhost:3000').send(registration);
  assert.ok(duplicate.status>=400,'duplicate email must not create another account');
  const missingTerms=await request(http).post('/api/auth/sign-up/email').set('Origin','http://localhost:3000').send({...registration,email:'no-terms@example.test',termsAccepted:false});
  assert.equal(missingTerms.status,400,'terms acceptance must be validated by the API');
  const invalid=await request(http).post('/api/auth/sign-up/email').set('Origin','http://localhost:3000').send({...registration,email:'invalid'});
  assert.ok(invalid.status>=400,'invalid registration data must be rejected');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM auth_user WHERE email=$1',[email])).rows[0].count,1);
  const token=created.body.token;assert.equal(typeof token,'string');
  const cookies=created.headers['set-cookie'];assert.ok(cookies);
  assert.match(String(cookies),/HttpOnly/i);assert.match(String(cookies),/SameSite=Lax/i);
  const me=await request(http).get('/api/v1/auth/me').set(auth(token));
  assert.equal(me.status,200,JSON.stringify(me.body));assert.deepEqual(me.body.roles,['customer']);
  const subject=me.body.subject;
  const profile=await pool.query('SELECT display_name,phone_number,terms_accepted_at FROM user_profiles WHERE identity_subject=$1',[subject]);
  assert.equal(profile.rows[0].display_name,'Auth Test');assert.equal(profile.rows[0].phone_number,'+2348012345678');assert.ok(profile.rows[0].terms_accepted_at);
  const cookie=(cookies as unknown as string[]).map(c=>c.split(';')[0]).join('; ');
  assert.equal((await request(http).get('/api/v1/auth/me').set('Cookie',cookie)).status,200);
  assert.equal((await request(http).get('/api/v1/auth/me').set(auth('forged-session'))).status,401);
  assert.equal((await request(http).post('/api/auth/sign-in/email').send({email,password:'incorrect-password'})).status,401);
  assert.equal((await request(http).post('/api/auth/sign-in/email').set('Origin','https://evil.example').send({email,password})).status,403);
  await pool.query('UPDATE account_access SET suspended=true WHERE identity_subject=$1',[subject]);
  assert.equal((await request(http).get('/api/v1/auth/me').set(auth(token))).status,403);
  await pool.query('UPDATE account_access SET suspended=false WHERE identity_subject=$1',[subject]);
  assert.equal((await request(http).post('/api/auth/request-password-reset').send({email,redirectTo:'http://localhost:3000/reset-password'})).status,200);
  const verification=await pool.query("SELECT value FROM auth_verification WHERE identifier LIKE 'reset-password:%'");
  assert.equal(verification.rowCount,1);
  // Better Auth stores the recovery token in the identifier, user ID as value.
  const records=await pool.query("SELECT identifier FROM auth_verification WHERE identifier LIKE 'reset-password:%'");
  const resetToken=records.rows[0].identifier.slice('reset-password:'.length);
  const nextPassword=password+'-new';
  const reset=await request(http).post('/api/auth/reset-password').send({token:resetToken,newPassword:nextPassword});
  assert.equal(reset.status,200,JSON.stringify(reset.body));
  assert.equal((await request(http).get('/api/v1/auth/me').set(auth(token))).status,401,'reset revokes prior sessions');
  assert.notEqual((await request(http).post('/api/auth/reset-password').send({token:resetToken,newPassword:password})).status,200,'reset token is single use');
  const login=await request(http).post('/api/auth/sign-in/email').set('Origin','http://localhost:3000').send({email,password:nextPassword});
  assert.equal(login.status,200,JSON.stringify(login.body));
  const loginCookies=login.headers['set-cookie'];
  assert.ok(loginCookies,'successful login must establish a browser session cookie');
  const browserCookie=(Array.isArray(loginCookies)?loginCookies:[loginCookies]).map(cookie=>cookie.split(';')[0]).join('; ');
  assert.equal((await request(http).get('/api/v1/auth/me').set('Cookie',browserCookie)).status,200,'browser session persists across requests');
  const nextToken=login.body.token;
  assert.equal((await request(http).post('/api/auth/sign-out').set('Origin','http://localhost:3000').set('Cookie',browserCookie).send({})).status,200);
  assert.equal((await request(http).get('/api/v1/auth/me').set('Cookie',browserCookie)).status,401,'logout revokes browser session');
  assert.equal((await request(http).get('/api/v1/auth/me').set(auth(nextToken))).status,401,'logout revokes native token');
  const another=await request(http).post('/api/auth/sign-in/email').send({email,password:nextPassword});
  await pool.query("UPDATE auth_session SET expires_at=now()-interval '1 second'");
  assert.equal((await request(http).get('/api/v1/auth/me').set(auth(another.body.token))).status,401,'expired session rejected');
 }finally{await app.close();await smtp.close();}
});
