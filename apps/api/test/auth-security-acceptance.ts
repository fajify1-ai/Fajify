import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {createServer,type Server} from 'node:http';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {IdentityModule} from '../src/auth/identity.module';
import {DatabaseModule} from '../src/database.module';
import {BetterAuthService} from '../src/auth/better-auth.service';
import {DATABASE_POOL} from '../src/tokens';
import {setupApi} from '../src/main';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import type {NestExpressApplication} from '@nestjs/platform-express';
const owner=new Pool({connectionString:process.env.FAJI_DATABASE_URL}),runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL});
let app:NestExpressApplication,sms:Server;const deliveries=new Map<string,string>();
const password='disposable-password-123';const http=()=>app.getHttpServer();
const bearer=(token:string)=>({Authorization:`Bearer ${token}`});
const cookies=(r:request.Response)=>(r.headers['set-cookie'] as unknown as string[]??[]).map(c=>c.split(';')[0]).join('; ');
function totp(uri:string){const secret=new URL(uri).searchParams.get('secret')!;let bits='';for(const c of secret.replace(/=+$/,''))bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c.toUpperCase()).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g)!.map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',key).update(counter).digest();return String((hash.readUInt32BE(hash[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
async function clearLimits(){await owner.query('DELETE FROM auth_rate_limit');}
before(async()=>{
 await assertDisposable(owner);await assertDisposable(runtime);
 process.env.NODE_ENV='test';process.env.BETTER_AUTH_SECRET='disposable-auth-secret-over-thirty-two-characters';process.env.BETTER_AUTH_URL='http://localhost:3001';process.env.FAJI_WEB_ORIGINS='http://localhost:3000';process.env.SMTP_URL='smtp://127.0.0.1:11025';
 sms=createServer(async(req,res)=>{if(req.headers.authorization!=='Bearer disposable-sms-secret'){res.writeHead(401).end();return;}let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);deliveries.set(body.phoneNumber,body.code);res.writeHead(204).end();});await new Promise<void>(resolve=>sms.listen(0,'127.0.0.1',resolve));
 process.env.FAJI_SMS_WEBHOOK_URL=`http://127.0.0.1:${(sms.address() as {port:number}).port}`;process.env.FAJI_SMS_WEBHOOK_SECRET='disposable-sms-secret';
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule]}).overrideProvider(DATABASE_POOL).useValue(runtime).compile();
 app=module.createNestApplication<NestExpressApplication>({bodyParser:false});
 app.use('/api/auth',(req:any,res:any,next:any)=>{if(req.originalUrl.startsWith('/api/auth/faji/'))return next();module.get(BetterAuthService).handle(req,res).catch(next);});
 app.useBodyParser('json');setupApi(app);await app.init();
});
after(async()=>{await app?.close();await owner.end();await new Promise<void>(resolve=>sms?.close(()=>resolve()));});
test('optional MFA: enrollment, challenge, recovery, step-up and revocation',async()=>{
 await clearLimits();const email=`mfa-${randomUUID()}@example.test`;
 const signup=await request(http()).post('/api/auth/sign-up/email').send({name:'MFA test',email,password});assert.equal(signup.status,200,JSON.stringify(signup.body));let token=signup.body.token;
 const first=await request(http()).post('/api/auth/two-factor/enable').set(bearer(token)).send({password});assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.backupCodes.length,10);
 const uri=first.body.totpURI;const enroll=await request(http()).post('/api/auth/two-factor/verify-totp').set(bearer(token)).send({code:totp(uri)});assert.equal(enroll.status,200,JSON.stringify(enroll.body));
 // Enrollment may rotate the current session; use the issued token when provided.
 token=enroll.headers['set-auth-token']??enroll.body.token??token;
 const current=await request(http()).get('/api/auth/get-session').set(bearer(token));assert.equal(current.body.user.twoFactorEnabled,true);
 await request(http()).post('/api/auth/sign-out').set(bearer(token)).send({});
 const login=await request(http()).post('/api/auth/sign-in/email').send({email,password});assert.equal(login.status,200,JSON.stringify(login.body));assert.equal(login.body.twoFactorRedirect,true);assert.ok(!login.body.token,'No session before second-factor verification');
 const wrong=await request(http()).post('/api/auth/two-factor/verify-totp').set('Cookie',cookies(login)).send({code:'000000'});assert.notEqual(wrong.status,200);
 const completed=await request(http()).post('/api/auth/two-factor/verify-backup-code').set('Cookie',cookies(login)).send({code:first.body.backupCodes[0]});assert.equal(completed.status,200,JSON.stringify(completed.body));token=completed.body.token??completed.headers['set-auth-token'];assert.ok(token);
 const me=await request(http()).get('/api/v1/auth/me').set(bearer(token));assert.equal(me.status,200);
 const badStep=await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password});assert.equal(badStep.status,400,'Enrolled factor required in addition to password');
 const step=await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password,backupCode:first.body.backupCodes[1]});assert.equal(step.status,201,JSON.stringify(step.body));
 const disable=await request(http()).post('/api/auth/two-factor/disable').set(bearer(token)).send({password});assert.equal(disable.status,200,JSON.stringify(disable.body));
 await clearLimits();const again=await request(http()).post('/api/auth/sign-in/email').send({email,password});assert.equal(again.status,200);assert.ok(again.body.token,'MFA remains optional after revocation');
});
test('phone OTP is verified, single-use, rate limited, cannot bypass MFA or admin step-up',async()=>{
 await clearLimits();const email=`phone-${randomUUID()}@example.test`,phone='+234'+String(Date.now()).slice(-10);
 const signup=await request(http()).post('/api/auth/sign-up/email').send({name:'Phone test',email,password,phoneNumber:phone});assert.equal(signup.status,200,JSON.stringify(signup.body));let token=signup.body.token;
 const pre=await owner.query('SELECT phone_number,registration_phone FROM auth_user WHERE id=$1',[signup.body.user.id]);assert.equal(pre.rows[0].phone_number,null);assert.equal(pre.rows[0].registration_phone,phone);
 assert.equal((await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password})).status,201);
 assert.equal((await request(http()).post('/api/auth/phone-number/send-otp').send({phoneNumber:phone})).status,200);
 const code=deliveries.get(phone);assert.ok(code);
 const link=await request(http()).post('/api/auth/phone-number/verify').set(bearer(token)).send({phoneNumber:phone,code,updatePhoneNumber:true,disableSession:true});assert.equal(link.status,200,JSON.stringify(link.body));
 const replay=await request(http()).post('/api/auth/phone-number/verify').send({phoneNumber:phone,code});assert.notEqual(replay.status,200);
 await clearLimits();await request(http()).post('/api/auth/phone-number/send-otp').send({phoneNumber:phone});
 const otpLogin=await request(http()).post('/api/auth/phone-number/verify').send({phoneNumber:phone,code:deliveries.get(phone)});assert.equal(otpLogin.status,200,JSON.stringify(otpLogin.body));token=otpLogin.body.token;
 await owner.query("INSERT INTO application_roles(identity_subject,role) VALUES($1,'platform-admin')",[signup.body.user.id]);
 const id=await app.get(BetterAuthService).verifyAccessToken(token);assert.equal(id.authTime,undefined,'OTP session never implies password step-up');
 const enabled=await request(http()).post('/api/auth/two-factor/enable').set(bearer(token)).send({password});assert.equal(enabled.status,200);
 const enroll=await request(http()).post('/api/auth/two-factor/verify-totp').set(bearer(token)).send({code:totp(enabled.body.totpURI)});assert.equal(enroll.status,200);token=enroll.headers['set-auth-token']??enroll.body.token??token;
 await clearLimits();await request(http()).post('/api/auth/phone-number/send-otp').send({phoneNumber:phone});
 const bypass=await request(http()).post('/api/auth/phone-number/verify').send({phoneNumber:phone,code:deliveries.get(phone)});assert.equal(bypass.status,403,'Enrolled MFA cannot be bypassed through phone OTP');
 await clearLimits();const overBudget=await request(http()).post('/api/auth/phone-number/send-otp').send({phoneNumber:phone});assert.notEqual(overBudget.status,200,'Per-phone hourly budget survives per-IP limiter reset');
});
test('verified phone recovery expires, is single-use, revokes sessions and preserves enrolled MFA',async()=>{
 await clearLimits();const phone='+1555'+String(Date.now()).slice(-7),email=`phone-recovery-${randomUUID()}@example.test`;
 const signup=await request(http()).post('/api/auth/sign-up/email').send({name:'Phone recovery',email,password});let token=signup.body.token;
 assert.equal((await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password})).status,201);
 await request(http()).post('/api/auth/phone-number/send-otp').send({phoneNumber:phone});
 assert.equal((await request(http()).post('/api/auth/phone-number/verify').set(bearer(token)).send({phoneNumber:phone,code:deliveries.get(phone),updatePhoneNumber:true,disableSession:true})).status,200);
 const factor=await request(http()).post('/api/auth/two-factor/enable').set(bearer(token)).send({password});const enrollment=await request(http()).post('/api/auth/two-factor/verify-totp').set(bearer(token)).send({code:totp(factor.body.totpURI)});token=enrollment.headers['set-auth-token']??enrollment.body.token??token;
 await request(http()).post('/api/auth/phone-number/request-password-reset').send({phoneNumber:phone});
 await owner.query("UPDATE auth_verification SET expires_at=now()-interval '1 second' WHERE identifier=$1",['phone-number-reset-'+phone]);
 const endpoint='/api/auth/phone-number/reset-password',nextPassword=password+'-changed';
 assert.notEqual((await request(http()).post(endpoint).send({phoneNumber:phone,otp:deliveries.get(phone),newPassword:nextPassword})).status,200);
 await request(http()).post('/api/auth/phone-number/request-password-reset').send({phoneNumber:phone});
 const reset=await request(http()).post(endpoint).send({phoneNumber:phone,otp:deliveries.get(phone),newPassword:nextPassword});assert.equal(reset.status,200,JSON.stringify(reset.body));
 assert.equal((await request(http()).get('/api/v1/auth/me').set(bearer(token))).status,401);
 assert.notEqual((await request(http()).post(endpoint).send({phoneNumber:phone,otp:deliveries.get(phone),newPassword:password})).status,200);
 await clearLimits();const signin=await request(http()).post('/api/auth/sign-in/email').send({email,password:nextPassword});assert.equal(signin.body.twoFactorRedirect,true,'Password recovery must not disable an enrolled factor');
});

test('legacy administrative mutations require password step-up and an operator scope',async()=>{
 await clearLimits();const email=`admin-scope-${randomUUID()}@example.test`;
 const a=await request(http()).post('/api/auth/sign-up/email').send({name:'Admin scope',email,password});const b=await request(http()).post('/api/auth/sign-up/email').send({name:'Scope target',email:`target-${randomUUID()}@example.test`,password});const token=a.body.token,subject=a.body.user.id,target=b.body.user.id;
 await owner.query("INSERT INTO application_roles(identity_subject,role) VALUES($1,'platform-admin')",[subject]);
 const endpoint=`/api/v1/admin/accounts/${target}/suspension`;
 assert.equal((await request(http()).post(endpoint).set(bearer(token)).send({suspended:true})).status,403);
 assert.equal((await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password})).status,201);
 assert.equal((await request(http()).post(endpoint).set(bearer(token)).send({suspended:true})).status,403,'Fresh password alone does not grant an operator scope');
 await owner.query("INSERT INTO admin_scope_grants(identity_subject,scope,granted_by) VALUES($1,'identity.write','disposable-operator')",[subject]);
 assert.equal((await request(http()).post(endpoint).set(bearer(token)).send({suspended:true})).status,201);
 const active=await owner.query('SELECT suspended FROM account_access WHERE identity_subject=$1',[target]);assert.equal(active.rows[0].suspended,true);
});
test('credential changes revoke sessions atomically and rotate the authenticated session',async()=>{
 await clearLimits();const email=`password-change-${randomUUID()}@example.test`;
 const signup=await request(http()).post('/api/auth/sign-up/email').send({name:'Password change',email,password});const token=signup.body.token;
 assert.equal((await request(http()).post('/api/auth/faji/step-up').set(bearer(token)).send({password})).status,201);
 const changed=await request(http()).post('/api/auth/change-password').set(bearer(token)).send({currentPassword:password,newPassword:password+'-changed',revokeOtherSessions:false});assert.equal(changed.status,200,JSON.stringify(changed.body));
 assert.equal((await request(http()).get('/api/v1/auth/me').set(bearer(token))).status,401);
 const rotated=changed.headers['set-auth-token']??changed.body.token;assert.ok(rotated);assert.equal((await request(http()).get('/api/v1/auth/me').set(bearer(rotated))).status,200);
});
test('pre-launch Better Auth has no account-claim endpoint or dormant claim privileges',async()=>{
 assert.equal((await request(http()).post('/api/auth/faji/claim').send({token:'x'.repeat(43),password})).status,404);
 const state=await owner.query("SELECT to_regclass('public.auth_legacy_claims') AS claims,to_regclass('public.auth_claim_attempts') AS attempts,to_regprocedure('public.consume_identity_claim(text,text,text)') AS consumer");
 assert.deepEqual(state.rows[0],{claims:null,attempts:null,consumer:null});
});
