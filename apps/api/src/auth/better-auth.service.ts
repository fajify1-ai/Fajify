import {Inject, Injectable, OnModuleInit, UnauthorizedException, ForbiddenException, BadRequestException} from '@nestjs/common';
import {Pool} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import nodemailer from 'nodemailer';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {trustedProxies,requestIp} from './request-ip';
import {normalizeAuthenticationOrigin,normalizeAuthenticationOrigins} from './auth-origins';
import {DATABASE_POOL} from '../tokens';
import * as schema from './auth.schema';
import type {IdentityVerifier, VerifiedIdentity} from './identity.types';
import type {IncomingMessage, ServerResponse} from 'node:http';
// Preserve native ESM imports in the existing Nest CommonJS build.
const load = new Function('specifier','return import(specifier)') as <T>(specifier:string)=>Promise<T>;
@Injectable()
export class BetterAuthService implements IdentityVerifier, OnModuleInit {
 private proxies=trustedProxies();
 private baseURL!:string;
 private auth!: ReturnType<typeof import('better-auth')['betterAuth']>;
 private handler!: (req:IncomingMessage,res:ServerResponse)=>Promise<void>;
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async onModuleInit(){
  const secret=process.env.BETTER_AUTH_SECRET;
  const configuredBaseURL=process.env.BETTER_AUTH_URL;
  if(!secret||secret.length<32||!configuredBaseURL||!process.env.FAJI_WEB_ORIGINS)throw new Error('Configure Better Auth secret, URL and web origins');
  this.baseURL=normalizeAuthenticationOrigin(configuredBaseURL);
  const origins=normalizeAuthenticationOrigins(process.env.FAJI_WEB_ORIGINS);
  if(['production','staging'].includes(process.env.NODE_ENV??'')&&(!this.baseURL.startsWith('https://')||origins.some(s=>!s.startsWith('https://'))))throw new Error('Authentication requires HTTPS');
  const [{betterAuth},{drizzleAdapter},{bearer,twoFactor,phoneNumber},{toNodeHandler},{createAuthMiddleware,APIError}]=await Promise.all([
   load<typeof import('better-auth')>('better-auth'),load<typeof import('better-auth/adapters/drizzle')>('better-auth/adapters/drizzle'),
   load<typeof import('better-auth/plugins')>('better-auth/plugins'),load<typeof import('better-auth/node')>('better-auth/node'),load<typeof import('better-auth/api')>('better-auth/api')]);
  const emailEnabled=process.env.FAJI_EMAIL_DELIVERY_ENABLED!=='false';
  if(emailEnabled&&['production','staging'].includes(process.env.NODE_ENV??'')&&(!process.env.SMTP_URL||!process.env.AUTH_EMAIL_FROM))throw new Error('Configure authentication email delivery');
  const mail=emailEnabled?nodemailer.createTransport(process.env.SMTP_URL??'smtp://127.0.0.1:1025',{disableFileAccess:true,disableUrlAccess:true}):null;
  const sendSms=async({phoneNumber,code}:{phoneNumber:string;code:string},purpose:string)=>{
     const budget=await this.pool.query<{attempts:number}>(`INSERT INTO auth_sms_budgets(phone_hash,attempts) VALUES($1,1) ON CONFLICT(phone_hash) DO UPDATE SET attempts=CASE WHEN auth_sms_budgets.window_started<now()-interval '1 hour' THEN 1 ELSE auth_sms_budgets.attempts+1 END,window_started=CASE WHEN auth_sms_budgets.window_started<now()-interval '1 hour' THEN now() ELSE auth_sms_budgets.window_started END RETURNING attempts`,[createHash('sha256').update(phoneNumber).digest('hex')]);
     if(budget.rows[0].attempts>3)throw new APIError('TOO_MANY_REQUESTS',{message:'Phone verification rate limited'});
     const endpoint=process.env.FAJI_SMS_WEBHOOK_URL;const key=process.env.FAJI_SMS_WEBHOOK_SECRET;
     if(!endpoint||!key||!(endpoint.startsWith('https://')||(process.env.NODE_ENV==='test'&&endpoint.startsWith('http://127.0.0.1:'))))throw new APIError('SERVICE_UNAVAILABLE',{message:'SMS delivery is not configured'});
     const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({phoneNumber,code,purpose}),redirect:'error',signal:AbortSignal.timeout(5000)});
     if(!response.ok)throw new APIError('SERVICE_UNAVAILABLE',{message:'SMS delivery failed'});
    };
  const options:import('better-auth').BetterAuthOptions={secret,baseURL:this.baseURL,basePath:'/api/auth',trustedOrigins:origins,
   database:drizzleAdapter(drizzle(this.pool,{schema}),{provider:'pg',schema,transaction:true}),
   user:{additionalFields:{
    username:{type:'string',required:false,validator:{input:z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/)}},
    registrationPhone:{type:'string',required:false,validator:{input:z.string().regex(/^\+[1-9][0-9]{6,14}$/)}},
    dateOfBirth:{type:'string',required:false,validator:{input:z.iso.date()}},
    homeAddress:{type:'string',required:false,validator:{input:z.string().min(3).max(500)}},
    termsAccepted:{type:'boolean',required:false,defaultValue:false},
   }},
   emailAndPassword:{enabled:true,minPasswordLength:12,revokeSessionsOnPasswordReset:true,
    sendResetPassword:async({user,url,token})=>{if(!mail)throw new APIError('SERVICE_UNAVAILABLE',{message:'Password recovery email is temporarily unavailable'});await mail.sendMail({from:process.env.AUTH_EMAIL_FROM??'Faji <auth@localhost>',to:user.email,subject:'Reset your Faji password',text:`Your password recovery token is: ${token}\nPaste it into the recovery form in your Faji app. Or reset on the Faji website: ${url}`});}},
   session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
   advanced:{ipAddress:{ipAddressHeaders:['x-faji-client-ip']},useSecureCookies:this.baseURL.startsWith('https://'),defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
   rateLimit:{enabled:true,storage:'database',customRules:{'/phone-number/*':{window:60,max:3},'/two-factor/*':{window:60,max:5}}},
   hooks:{before:createAuthMiddleware(async ctx=>{
    if(ctx.path==='/sign-up/email'){
     if(process.env.FAJI_REGISTRATION_ENABLED==='false'||(['production','staging'].includes(process.env.NODE_ENV??'')&&process.env.FAJI_REGISTRATION_ENABLED!=='true'))throw new APIError('FORBIDDEN',{message:'Registration temporarily unavailable'});
     if(ctx.body?.termsAccepted!==true)throw new APIError('BAD_REQUEST',{message:'Accept the Terms & Conditions to create an account'});
     // Compatibility with released native forms: profile phone is never a verified login identity.
     if(ctx.body?.phoneNumber){ctx.body.registrationPhone=ctx.body.phoneNumber;delete ctx.body.phoneNumber;}
    }
    if(ctx.path==='/get-session')return;
    if(ctx.path?.startsWith('/phone-number/')&&ctx.body?.phoneNumber&&!/^\+[1-9][0-9]{6,14}$/.test(ctx.body.phoneNumber))throw new APIError('BAD_REQUEST',{message:'Use an international phone number'});
    if(ctx.path==='/phone-number/send-otp'||ctx.path==='/phone-number/request-password-reset'){
     const b=await this.pool.query(`SELECT 1 FROM auth_sms_budgets WHERE phone_hash=$1 AND attempts>=3 AND window_started>now()-interval '1 hour'`,[createHash('sha256').update(String(ctx.body?.phoneNumber)).digest('hex')]);
     if(b.rowCount)throw new APIError('TOO_MANY_REQUESTS',{message:'Phone verification rate limited'});
    }
    const existing=await this.auth.api.getSession({headers:ctx.headers??new Headers()});
    if(existing&&ctx.path!=='/sign-out'&&ctx.path!=='/get-session'){
     const state=await this.pool.query('SELECT 1 FROM account_access a JOIN user_profiles p USING(identity_subject) WHERE a.identity_subject=$1 AND NOT a.suspended AND NOT p.suspended AND (a.revoked_after IS NULL OR a.revoked_after<$2)',[existing.user.id,existing.session.createdAt]);
     if(state.rowCount!==1)throw new APIError('FORBIDDEN',{message:'Account unavailable'});
    }
    if(ctx.path==='/phone-number/verify'&&!ctx.body?.updatePhoneNumber){
     const enrolled=await this.pool.query('SELECT 1 FROM auth_user WHERE phone_number=$1 AND two_factor_enabled',[ctx.body?.phoneNumber]);
     if(enrolled.rowCount)throw new APIError('FORBIDDEN',{message:'Use password sign-in and your second factor'});
    }
    if(ctx.path==='/change-password')ctx.body.revokeOtherSessions=true;
    if((ctx.path==='/update-user'&&Object.hasOwn(ctx.body??{},'phoneNumber'))||['/change-password','/change-email','/delete-user'].includes(ctx.path)||(ctx.path==='/phone-number/verify'&&ctx.body?.updatePhoneNumber)||['/two-factor/disable','/two-factor/generate-backup-codes','/two-factor/get-totp-uri','/two-factor/view-backup-codes','/two-factor/get-backup-codes'].includes(ctx.path)){
     if(!existing)throw new APIError('UNAUTHORIZED',{message:'Sign in required'});
     await this.requireStepUp(existing.session.id,existing.user.id);
    }
    if(ctx.path==='/two-factor/enable'&&ctx.body?.method&&ctx.body.method!=='totp')throw new APIError('BAD_REQUEST',{message:'Use authenticator enrollment'});
    if(ctx.path==='/two-factor/enable'&&existing){
     const enrolled=await this.pool.query('SELECT 1 FROM auth_user WHERE id=$1 AND two_factor_enabled',[existing.user.id]);
     if(enrolled.rowCount)await this.requireStepUp(existing.session.id,existing.user.id);
    }
   })},
   plugins:[bearer(),twoFactor({issuer:'Faji',skipVerificationOnEnable:false,accountLockout:{enabled:true,maxFailedAttempts:5,durationSeconds:900}}),phoneNumber({otpLength:6,expiresIn:300,allowedAttempts:3,requireVerification:true,
    callbackOnVerification:async({phoneNumber,user})=>{await this.pool.query('UPDATE user_profiles SET phone_number=$2,updated_at=now() WHERE identity_subject=$1',[user.id,phoneNumber]);await this.pool.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'phone_verified')",[user.id]);},
    phoneNumberValidator:number=>/^\+[1-9][0-9]{6,14}$/.test(number),
    sendOTP:data=>sendSms(data,'phone-verification'),sendPasswordResetOTP:data=>sendSms(data,'password-reset')
   })],
  };
  this.auth=betterAuth(options);
  this.handler=toNodeHandler(this.auth);
 }
 handle(req:IncomingMessage,res:ServerResponse){
  const origin=req.headers.origin;
  if(origin&&!normalizeAuthenticationOrigins(process.env.FAJI_WEB_ORIGINS??'').includes(origin)){res.writeHead(403,{'content-type':'application/json'});res.end(JSON.stringify({message:'Untrusted authentication origin'}));return Promise.resolve();}
  req.headers['x-faji-client-ip']=requestIp(req,this.proxies);
  return this.handler(req,res);
 }
 async verifyHeaders(headers:Headers):Promise<VerifiedIdentity>{
  const result=await this.auth.api.getSession({headers});
  if(!result)throw new UnauthorizedException();
  const proof=await this.pool.query<{step_up_at:Date|null}>('SELECT step_up_at FROM auth_session WHERE id=$1',[result.session.id]);
  const roles=await this.pool.query<{role:string}>('SELECT role FROM application_roles WHERE identity_subject=$1',[result.user.id]);
  return {subject:result.user.id,issuer:this.baseURL,audience:['faji-api'],
   expiresAt:Math.floor(result.session.expiresAt.getTime()/1000),issuedAt:Math.floor(result.session.createdAt.getTime()/1000),
   authTime:proof.rows[0]?.step_up_at?Math.floor(proof.rows[0].step_up_at.getTime()/1000):undefined,sessionId:result.session.id,roles:roles.rows.map(r=>r.role)};
 }
 async requireStepUp(sessionId:string,userId:string){
  const r=await this.pool.query(`SELECT 1 FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.expires_at>now() AND s.step_up_at>now()-interval '5 minutes' AND (NOT u.two_factor_enabled OR s.mfa_verified_at>now()-interval '5 minutes')`,[sessionId,userId]);
  if(r.rowCount!==1)throw new ForbiddenException('Reauthenticate with password and your enrolled factor');
 }
 async stepUp(headers:Headers,password:string,code?:string,backupCode?:string){
  const identity=await this.verifyHeaders(headers);
  const r=await this.pool.query<{password:string;two_factor_enabled:boolean}>(`SELECT a.password,u.two_factor_enabled FROM auth_account a JOIN auth_user u ON u.id=a.user_id WHERE a.user_id=$1 AND a.provider_id='credential'`,[identity.subject]);
  const {verifyPassword}=await load<typeof import('better-auth/crypto')>('better-auth/crypto');
  if(!r.rows[0]?.password||!await verifyPassword({hash:r.rows[0].password,password}))throw new UnauthorizedException('Reauthentication failed');
  if(r.rows[0].two_factor_enabled){
   if(!code&&!backupCode)throw new BadRequestException('Your enrolled second factor is required');
   const response=await this.auth.handler(new Request(`${this.baseURL}/api/auth/two-factor/${backupCode?'verify-backup-code':'verify-totp'}`,{method:'POST',headers:new Headers({...Object.fromEntries(headers),'content-type':'application/json'}),body:JSON.stringify({code:backupCode??code,trustDevice:false})}));
   if(!response.ok)throw new UnauthorizedException('Reauthentication failed');
  }
  const updated=await this.pool.query('UPDATE auth_session SET step_up_at=now(),mfa_verified_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$1 AND expires_at>now() RETURNING id',[identity.sessionId,r.rows[0].two_factor_enabled]);
  if(updated.rowCount!==1)throw new UnauthorizedException('Session changed during reauthentication');
  await this.pool.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'password_step_up')",[identity.subject]);
  return {verified:true};
 }
 async unlinkPhone(headers:Headers){
  const identity=await this.verifyHeaders(headers);await this.requireStepUp(identity.sessionId!,identity.subject);
  await this.pool.query('UPDATE auth_user SET phone_number=NULL,phone_number_verified=false WHERE id=$1',[identity.subject]);
  await this.pool.query('DELETE FROM auth_session WHERE user_id=$1 AND id<>$2',[identity.subject,identity.sessionId]);
  await this.pool.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'phone_revoked')",[identity.subject]);
  return {revoked:true};
 }
 verifyAccessToken(token:string){return this.verifyHeaders(new Headers({authorization:`Bearer ${token}`}));}
}
