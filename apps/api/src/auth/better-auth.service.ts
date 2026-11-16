import {Inject, Injectable, OnModuleInit, UnauthorizedException} from '@nestjs/common';
import {Pool} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import nodemailer from 'nodemailer';
import {z} from 'zod';
import {DATABASE_POOL} from '../tokens';
import * as schema from './auth.schema';
import type {IdentityVerifier, VerifiedIdentity} from './identity.types';
import type {IncomingMessage, ServerResponse} from 'node:http';
// Preserve native ESM imports in the existing Nest CommonJS build.
const load = new Function('specifier','return import(specifier)') as <T>(specifier:string)=>Promise<T>;
@Injectable()
export class BetterAuthService implements IdentityVerifier, OnModuleInit {
 private auth!: ReturnType<typeof import('better-auth')['betterAuth']>;
 private handler!: (req:IncomingMessage,res:ServerResponse)=>Promise<void>;
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async onModuleInit(){
  const secret=process.env.BETTER_AUTH_SECRET;
  const baseURL=process.env.BETTER_AUTH_URL;
  const origins=(process.env.FAJI_WEB_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!secret||secret.length<32||!baseURL||!origins.length)throw new Error('Configure Better Auth secret, URL and web origins');
  if(['production','staging'].includes(process.env.NODE_ENV??'')&&(!baseURL.startsWith('https://')||origins.some(s=>!s.startsWith('https://'))))throw new Error('Authentication requires HTTPS');
  const [{betterAuth},{drizzleAdapter},{bearer},{toNodeHandler}]=await Promise.all([
   load<typeof import('better-auth')>('better-auth'),load<typeof import('better-auth/adapters/drizzle')>('better-auth/adapters/drizzle'),
   load<typeof import('better-auth/plugins')>('better-auth/plugins'),load<typeof import('better-auth/node')>('better-auth/node')]);
  const mail=nodemailer.createTransport(process.env.SMTP_URL??'smtp://127.0.0.1:1025');
  if(['production','staging'].includes(process.env.NODE_ENV??'')&&(!process.env.SMTP_URL||!process.env.AUTH_EMAIL_FROM))throw new Error('Configure authentication email delivery');
  const options:import('better-auth').BetterAuthOptions={secret,baseURL,basePath:'/api/auth',trustedOrigins:origins,
   database:drizzleAdapter(drizzle(this.pool,{schema}),{provider:'pg',schema}),
   user:{additionalFields:{
    username:{type:'string',required:false,validator:{input:z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/)}},
    phoneNumber:{type:'string',required:false,validator:{input:z.string().regex(/^\+[1-9][0-9]{6,14}$/)}},
    dateOfBirth:{type:'string',required:false,validator:{input:z.iso.date()}},
    homeAddress:{type:'string',required:false,validator:{input:z.string().min(3).max(500)}},
    termsAccepted:{type:'boolean',required:false,defaultValue:false},
   }},
   emailAndPassword:{enabled:true,minPasswordLength:12,revokeSessionsOnPasswordReset:true,
    sendResetPassword:async({user,url,token})=>{await mail.sendMail({from:process.env.AUTH_EMAIL_FROM??'Faji <auth@localhost>',to:user.email,subject:'Reset your Faji password',text:`Your password recovery token is: ${token}\nPaste it into the recovery form in your Faji app. Or reset on the Faji website: ${url}`});}},
   session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
   advanced:{ipAddress:{ipAddressHeaders:['x-faji-client-ip']},useSecureCookies:baseURL.startsWith('https://'),defaultCookieAttributes:{httpOnly:true,sameSite:'lax'}},
   rateLimit:{enabled:true,storage:'database'},plugins:[bearer()],
  };
  this.auth=betterAuth(options);
  this.handler=toNodeHandler(this.auth);
 }
 handle(req:IncomingMessage,res:ServerResponse){req.headers['x-faji-client-ip']=req.socket.remoteAddress??'127.0.0.1';return this.handler(req,res);}
 async verifyHeaders(headers:Headers):Promise<VerifiedIdentity>{
  const result=await this.auth.api.getSession({headers});
  if(!result)throw new UnauthorizedException();
  const roles=await this.pool.query<{role:string}>('SELECT role FROM application_roles WHERE identity_subject=$1',[result.user.id]);
  return {subject:result.user.id,issuer:process.env.BETTER_AUTH_URL!,audience:['faji-api'],
   expiresAt:Math.floor(result.session.expiresAt.getTime()/1000),issuedAt:Math.floor(result.session.createdAt.getTime()/1000),
   sessionId:result.session.id,roles:roles.rows.map(r=>r.role)};
 }
 verifyAccessToken(token:string){return this.verifyHeaders(new Headers({authorization:`Bearer ${token}`}));}
}
