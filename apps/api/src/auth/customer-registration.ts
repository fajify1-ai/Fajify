import {Body,Controller,Inject,Injectable,Post,Req,BadRequestException,ConflictException,HttpException,ServiceUnavailableException,ValidationPipe} from '@nestjs/common';
import {Equals,IsDateString,IsEmail,IsString,Length,Matches} from 'class-validator';
import {createHash} from 'node:crypto';
import {Pool,type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';

export const REGISTRATION_CONFIG=Symbol('REGISTRATION_CONFIG');
export const REGISTRATION_HTTP=Symbol('REGISTRATION_HTTP');
export interface RegistrationConfig {enabled:boolean;issuer?:string;clientId?:string;clientSecret?:string;}

export class CustomerRegistrationInput {
 @IsString() @Length(2,120) fullName!:string;
 @IsString() @Matches(/^[a-zA-Z0-9_.-]{3,40}$/) username!:string;
 @IsEmail() @Length(3,254) email!:string;
 @IsString() @Matches(/^\+[1-9][0-9]{6,14}$/) phone!:string;
 @IsDateString({strict:true}) dateOfBirth!:string;
 @IsString() @Length(3,500) homeAddress!:string;
 @IsString() @Length(8,128) password!:string;
 @Equals(true,{message:'Accept the Terms of Service and Privacy Policy.'}) termsAccepted!:boolean;
}

/** Public customer creation. The client cannot choose roles, identity subject,
 * account state, or verified-email claims. All passwords stay out of PostgreSQL.
 */
@Injectable()
export class CustomerRegistrationService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,
  @Inject(REGISTRATION_CONFIG)private readonly config:RegistrationConfig,
  @Inject(REGISTRATION_HTTP)private readonly request:typeof fetch){}

 private async send(url:string,options:RequestInit={}){
  try{return await this.request(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});}
  catch{throw new ServiceUnavailableException('Registration is temporarily unavailable.');}
 }

 async register(input:CustomerRegistrationInput,remoteAddress:string){
  const {issuer,clientId,clientSecret}=this.config;
  if(!this.config.enabled||!issuer||!clientId||!clientSecret)throw new ServiceUnavailableException('Registration is not configured.');
  const origin=new URL(issuer);
  const match=origin.pathname.match(/^(.*)\/realms\/([^/]+)$/);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||!match)throw new ServiceUnavailableException('Registration is not configured.');
  if(input.fullName.trim().split(/\s+/).length<2)
   throw new BadRequestException('Enter your first and last name.');
  const birthday=new Date(input.dateOfBirth);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)||!Number.isFinite(birthday.getTime())||birthday>new Date()||birthday.getUTCFullYear()<1900)throw new BadRequestException('Enter a valid date of birth.');
  const bucket=createHash('sha256').update(remoteAddress||'unknown').digest('hex');
  const limit=await this.pool.query<{attempts:number}>(`INSERT INTO customer_registration_limits(bucket_hash,attempts) VALUES($1,1)
   ON CONFLICT(bucket_hash) DO UPDATE SET
   attempts=CASE WHEN customer_registration_limits.window_started<now()-interval '10 minutes' THEN 1 ELSE customer_registration_limits.attempts+1 END,
   window_started=CASE WHEN customer_registration_limits.window_started<now()-interval '10 minutes' THEN now() ELSE customer_registration_limits.window_started END
   RETURNING attempts`,[bucket]);
  if(limit.rows[0].attempts>10)throw new HttpException('Too many registration attempts. Please try again later.',429);
  const adminRoot=`${origin.origin}${match[1]}/admin/realms/${match[2]}`;
  const tokenResponse=await this.send(`${issuer}/protocol/openid-connect/token`,{method:'POST',
   headers:{'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret}).toString()});
  if(!tokenResponse.ok)throw new ServiceUnavailableException('Registration is temporarily unavailable.');
  const token=await tokenResponse.json() as {access_token?:string};
  if(typeof token.access_token!=='string'||!token.access_token)throw new ServiceUnavailableException();
  const headers={'content-type':'application/json',authorization:`Bearer ${token.access_token}`};
  const parts=input.fullName.trim().split(/\s+/);
  const created=await this.send(`${adminRoot}/users`,{method:'POST',headers,body:JSON.stringify({
   username:input.username.trim().toLowerCase(),email:input.email.trim().toLowerCase(),
   firstName:parts[0],lastName:parts.slice(1).join(' '),enabled:false,emailVerified:false,
   credentials:[{type:'password',value:input.password,temporary:false}],
  })});
  if(created.status===409)throw new ConflictException('That email or username is already registered. Sign in or use another.');
  if(created.status===400)throw new BadRequestException('Check your account details and password requirements.');
  if(created.status!==201)throw new ServiceUnavailableException('Registration is temporarily unavailable.');
  const location=created.headers.get('location');
  const subject=location?.startsWith(`${adminRoot}/users/`)?location.slice(`${adminRoot}/users/`.length):'';
  if(!subject||!/^[a-zA-Z0-9-]{1,255}$/.test(subject))throw new ServiceUnavailableException();
  let connection:PoolClient|undefined;
  try{
   const roleResponse=await this.send(`${adminRoot}/roles/customer`,{headers});
   if(!roleResponse.ok)throw new ServiceUnavailableException();
   const role=await roleResponse.json() as {id?:string;name?:string};
   if(!role.id||role.name!=='customer')throw new ServiceUnavailableException();
   const mapped=await this.send(`${adminRoot}/users/${subject}/role-mappings/realm`,{method:'POST',headers,body:JSON.stringify([{id:role.id,name:'customer'}])});
   if(!mapped.ok)throw new ServiceUnavailableException();
   connection=await this.pool.connect();
   await connection.query('BEGIN');
   await connection.query(`INSERT INTO user_profiles(identity_subject,display_name,phone_number,date_of_birth,home_address,terms_accepted_at,suspended)
    VALUES($1,$2,$3,$4::date,$5,now(),false)`,[subject,input.fullName.trim(),input.phone,input.dateOfBirth,input.homeAddress.trim()]);
   await connection.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[subject]);
   await connection.query('INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,$2)',[subject,'customer_self_registered']);
   const enabled=await this.send(`${adminRoot}/users/${subject}`,{method:'PUT',headers,body:'{"enabled":true}'});
   if(!enabled.ok)throw new ServiceUnavailableException();
   await connection.query('COMMIT');
   return {created:true};
  }catch{
   if(connection)await connection.query('ROLLBACK').catch(()=>{});
   // Compensate only the identity created by this request; never edit an
   // existing account on duplicate registration or a failed authentication.
   await this.send(`${adminRoot}/users/${subject}`,{method:'DELETE',headers}).catch(()=>{});
   throw new ServiceUnavailableException('We could not finish registration. Please try again.');
  }finally{connection?.release();}
 }
}

@Controller({path:'auth',version:'1'})
export class CustomerRegistrationController {
 constructor(@Inject(CustomerRegistrationService)private readonly registration:CustomerRegistrationService){}
 @Post('register')
 register(@Body(new ValidationPipe({expectedType:CustomerRegistrationInput,transform:true,whitelist:true,forbidNonWhitelisted:true})) input:CustomerRegistrationInput,@Req() req:{socket:{remoteAddress?:string}}){
  return this.registration.register(input,req.socket.remoteAddress??'unknown');
 }
}
