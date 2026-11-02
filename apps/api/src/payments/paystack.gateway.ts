import {createHmac,timingSafeEqual} from 'node:crypto';
import {Injectable,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';

export type VerifiedCharge={id:string;reference:string;amountMinor:number;currency:string;environment:'test'|'live'};

/** Paystack is the initial adapter. HTTP transport is injectable for deterministic tests. */
@Injectable()
export class PaystackGateway {
 private config(){
  const secret=process.env.PAYSTACK_SECRET_KEY;
  if(!secret||!/^sk_(test|live)_[A-Za-z0-9]+$/.test(secret))throw new ServiceUnavailableException('Payment gateway is not configured');
  return {secret,environment:secret.startsWith('sk_test_')?'test' as const:'live' as const};
 }
 verifySignature(raw:Buffer,signature:unknown){
  const {secret}=this.config();
  if(typeof signature!=='string'||! /^[a-fA-F0-9]{128}$/.test(signature))throw new UnauthorizedException('Invalid payment signature');
  const expected=createHmac('sha512',secret).update(raw).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new UnauthorizedException('Invalid payment signature');
 }
 environment(){return this.config().environment;}
 async verify(reference:string,transport:typeof fetch=fetch):Promise<VerifiedCharge>{
  const {secret,environment}=this.config();
  try{
   const response=await transport('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{
    headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(10000),redirect:'error'
   });
   if(!response.ok)throw new Error('Provider HTTP error');
   const body:unknown=await response.json();
   const result=body as {status?:unknown;data?:Record<string,unknown>};
   const data=result?.data;
   if(result?.status!==true||!data||data.status!=='success'||data.reference!==reference||data.domain!==environment||
    !Number.isSafeInteger(data.amount)||Number(data.amount)<=0||typeof data.currency!=='string'||
    !(typeof data.id==='number'&&Number.isSafeInteger(data.id)&&data.id>0))throw new Error('Unverified transaction');
   return {id:String(data.id),reference,amountMinor:Number(data.amount),currency:data.currency,environment};
  }catch{throw new ServiceUnavailableException('Payment verification unavailable or unsuccessful');}
 }
}
