import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {BadRequestException,HttpException,HttpStatus,Inject,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';

export const WAITLIST_CONSENT_VERSION='waitlist-contact-v1';
export const BUSINESS_WAITLIST_CONSENT_VERSION='business-waitlist-contact-v1';
const SIGNUP_LIMIT_PER_MINUTE=5;

function normalizePhone(value:string):string{
 const digits=value.replace(/\D/g,'');
 const national=digits.startsWith('234')?digits.slice(3):digits.startsWith('0')?digits.slice(1):digits;
 if(!/^[789][0-9]{9}$/.test(national))throw new Error('Enter a valid Nigerian mobile number.');
 return '+234'+national;
}

@Injectable()
export class WaitlistService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}

 private async consumeSignupBudget(clientAddress:string,scope:'customer'|'business'){
  const secret=process.env.BETTER_AUTH_SECRET;
  if(!secret||secret.length<32)throw new ServiceUnavailableException('Waitlist service is not configured.');
  const clientKey=createHmac('sha256',secret).update(`waitlist:${scope}:${clientAddress}`).digest('hex');
  const windowStart=Math.floor(Date.now()/60_000);
  let used:number;
  try{
   const result=await this.pool.query<{used:number}>(`
    INSERT INTO waitlist_rate_buckets AS bucket(client_key,window_start,used)
    VALUES($1,$2,1)
    ON CONFLICT(client_key) DO UPDATE SET
     window_start=EXCLUDED.window_start,
     used=CASE WHEN bucket.window_start=EXCLUDED.window_start THEN bucket.used+1 ELSE 1 END
    RETURNING used`,[clientKey,windowStart]);
   used=Number(result.rows[0]?.used);
   if(!Number.isSafeInteger(used)||used<1)throw new Error('Rate counter missing');
   if(windowStart%60===0)await this.pool.query('DELETE FROM waitlist_rate_buckets WHERE window_start<$1',[windowStart-1440]);
  }catch{
   throw new ServiceUnavailableException('Waitlist request budget is unavailable.');
  }
  if(used>SIGNUP_LIMIT_PER_MINUTE)throw new HttpException('Too many waitlist attempts. Please try again shortly.',HttpStatus.TOO_MANY_REQUESTS);
 }

 async signup(input:{email:string;whatsapp:string;consent:true},clientAddress:string){
  const email=input.email.trim().toLocaleLowerCase('en-US');
  let whatsapp:string;
  try{whatsapp=normalizePhone(input.whatsapp);}catch(error){
   throw new BadRequestException(error instanceof Error?error.message:'Enter a valid Nigerian mobile number.');
  }
  await this.consumeSignupBudget(clientAddress,'customer');
  try{
   await this.pool.query(`
    INSERT INTO waitlist_signups(email,email_normalized,whatsapp,consent_version,consented_at)
    VALUES($1,$1,$2,$3,now())
    ON CONFLICT(email_normalized) DO NOTHING`,
    [email,whatsapp,WAITLIST_CONSENT_VERSION]);
  }catch{
   throw new ServiceUnavailableException('Waitlist signup could not be saved.');
  }
  return {accepted:true};
 }

 async signupBusiness(input:{businessName:string;category:string;email:string;whatsapp:string;consent:true},clientAddress:string){
  const businessName=input.businessName.trim();
  const email=input.email.trim().toLocaleLowerCase('en-US');
  let whatsapp:string;
  try{whatsapp=normalizePhone(input.whatsapp);}catch(error){
   throw new BadRequestException(error instanceof Error?error.message:'Enter a valid Nigerian mobile number.');
  }
  await this.consumeSignupBudget(clientAddress,'business');
  try{
   await this.pool.query(`
    INSERT INTO business_waitlist_signups(business_name,category,email,email_normalized,whatsapp,consent_version,consented_at)
    VALUES($1,$2,$3,$3,$4,$5,now())
    ON CONFLICT(email_normalized) DO NOTHING`,
    [businessName,input.category,email,whatsapp,BUSINESS_WAITLIST_CONSENT_VERSION]);
  }catch{
   throw new ServiceUnavailableException('Business waitlist signup could not be saved.');
  }
  return {accepted:true};
 }

 async list(input:PageQuery&{search?:string}){
  const search=input.search?.trim();
  const escaped=search?.replace(/[\\%_]/g,'\\$&');
  try{
   const result=await this.pool.query(`
    SELECT id,email,whatsapp,consent_version AS "consentVersion",
     consented_at AS "consentedAt",created_at AS "createdAt"
    FROM waitlist_signups
    WHERE $1::text IS NULL OR email ILIKE '%'||$1||'%' ESCAPE '\\'
     OR whatsapp LIKE '%'||$1||'%' ESCAPE '\\'
    ORDER BY created_at DESC,id DESC
    LIMIT $2 OFFSET $3`,[escaped??null,input.limit+1,input.offset]);
   const items=result.rows.slice(0,input.limit);
   return {items,nextOffset:result.rows.length>input.limit?input.offset+input.limit:null};
  }catch{
   throw new ServiceUnavailableException('Waitlist records are currently unavailable.');
  }
 }

 async listBusiness(input:PageQuery&{search?:string}){
  const search=input.search?.trim();
  const escaped=search?.replace(/[\\%_]/g,'\\$&');
  try{
   const result=await this.pool.query(`
    SELECT id,business_name AS "businessName",category,email,whatsapp,
     consent_version AS "consentVersion",consented_at AS "consentedAt",
     created_at AS "createdAt"
    FROM business_waitlist_signups
    WHERE $1::text IS NULL OR business_name ILIKE '%'||$1||'%' ESCAPE '\\'
     OR email ILIKE '%'||$1||'%' ESCAPE '\\'
     OR whatsapp LIKE '%'||$1||'%' ESCAPE '\\'
     OR category ILIKE '%'||$1||'%' ESCAPE '\\'
     OR CASE category
      WHEN 'party_event_organizer' THEN 'Party & event organizers'
      WHEN 'restaurant_lounge' THEN 'Restaurants & lounges'
      WHEN 'event_venue' THEN 'Event venues'
      WHEN 'fun_recreation' THEN 'Fun & recreation'
      WHEN 'other' THEN 'Others'
      ELSE category
     END ILIKE '%'||$1||'%' ESCAPE '\\'
    ORDER BY created_at DESC,id DESC
    LIMIT $2 OFFSET $3`,[escaped??null,input.limit+1,input.offset]);
   const items=result.rows.slice(0,input.limit);
   return {items,nextOffset:result.rows.length>input.limit?input.offset+input.limit:null};
  }catch{
   throw new ServiceUnavailableException('Business waitlist records are currently unavailable.');
  }
 }
}

export function waitlistClientAddress(input:{headers:Record<string,string|string[]|undefined>;socket?:{remoteAddress?:string}}){
 const forwarded=input.headers['x-faji-client-ip'];
 if(forwarded!==undefined){
  if(typeof forwarded==='string'&&isIP(forwarded))return forwarded;
  throw new ServiceUnavailableException('Trusted client address is invalid.');
 }
 const remoteAddress=input.socket?.remoteAddress;
 if(remoteAddress&&isIP(remoteAddress))return remoteAddress;
 throw new ServiceUnavailableException('Client address is unavailable for rate limiting.');
}
