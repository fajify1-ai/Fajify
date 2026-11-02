import {createHmac,timingSafeEqual} from 'node:crypto';
import {Injectable,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {checkoutUrl,providerId,providerRequest} from './finance-provider';

export type VerifiedCharge={id:string;reference:string;amountMinor:number;currency:string;environment:'test'|'live';feeMinor?:number};

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
 async initialize(input:{reference:string;amount:string;email:string;callbackUrl:string},transport:typeof fetch=fetch){
  if(!/^[A-Za-z0-9.=-]{8,100}$/.test(input.reference))throw new ServiceUnavailableException('Legacy reference cannot be initialized');
  const d=await providerRequest(this.config().secret,'/transaction/initialize','POST',{reference:input.reference,amount:input.amount,email:input.email,currency:'NGN',callback_url:input.callbackUrl},transport);
  if(d.reference!==input.reference||typeof d.access_code!=='string'||! /^[A-Za-z0-9_-]{1,255}$/.test(d.access_code))throw new ServiceUnavailableException('Invalid initialized session');
  return {reference:d.reference,authorizationUrl:checkoutUrl(d.authorization_url),accessCode:d.access_code};
 }
 async refund(reference:string,amount:string,localId:string){return providerRequest(this.config().secret,'/refund','POST',{transaction:reference,amount:Number(amount),currency:'NGN',merchant_note:'faji-refund-'+localId});}
 async refundStatus(id:string){const d=await providerRequest(this.config().secret,'/refund/'+encodeURIComponent(id));if(providerId(d.id)!==id||d.domain!==this.environment())throw new ServiceUnavailableException('Refund identity mismatch');return d;}
 async findRefund(transaction:string,localId:string){
  for(let page=1;page<=20;page++){
   const d=await providerRequest(this.config().secret,'/refund?transaction='+encodeURIComponent(transaction)+'&perPage=100&page='+page);
   if(!Array.isArray(d))throw new ServiceUnavailableException('Invalid refund list');
   const found=d.filter(v=>v.merchant_note==='faji-refund-'+localId);if(found.length>1)throw new ServiceUnavailableException('Ambiguous refund records');if(found[0])return providerId(found[0].id);if(d.length<100)return null;
  }return null;
 }
 async transactionRefunds(transaction:string){
  const rows=[];
  for(let page=1;page<=20;page++){
   const d=await providerRequest(this.config().secret,'/refund?transaction='+encodeURIComponent(transaction)+'&perPage=100&page='+page);
   if(!Array.isArray(d))throw new ServiceUnavailableException('Invalid refund response');rows.push(...d);if(d.length<100)return rows;
  }throw new ServiceUnavailableException('Refund reconciliation requires operator review: page limit exceeded');
 }
 async recipient(code:string){const d=await providerRequest(this.config().secret,'/transferrecipient/'+encodeURIComponent(code));if(d.recipient_code!==code||d.active!==true||d.currency!=='NGN'||d.domain!==this.environment())throw new ServiceUnavailableException('Recipient not eligible');return d;}
 async transfer(reference:string,amount:string,recipient:string){return providerRequest(this.config().secret,'/transfer','POST',{source:'balance',reference,amount:Number(amount),currency:'NGN',recipient,reason:'Fajify settlement'});}
 async transferStatus(reference:string){let d=await providerRequest(this.config().secret,'/transfer/verify/'+encodeURIComponent(reference));if(d.fee_charged==null&&typeof d.transfer_code==='string')d=await providerRequest(this.config().secret,'/transfer/'+encodeURIComponent(d.transfer_code));if(d.reference!==reference||d.domain!==this.environment())throw new ServiceUnavailableException('Transfer identity mismatch');return d;}
 async finalizeTransfer(code:string,otp:string){return providerRequest(this.config().secret,'/transfer/finalize_transfer','POST',{transfer_code:code,otp});}
 async dispute(id:string){const d=await providerRequest(this.config().secret,'/dispute/'+encodeURIComponent(id));if(providerId(d.id)!==id||d.domain!==this.environment())throw new ServiceUnavailableException('Dispute identity mismatch');return d;}
 async transaction(reference:string){return providerRequest(this.config().secret,'/transaction/verify/'+encodeURIComponent(reference));}
 async transactionDisputes(id:string){const d=await providerRequest(this.config().secret,'/dispute/transaction/'+encodeURIComponent(id));if(!Array.isArray(d))throw new ServiceUnavailableException('Invalid dispute response');return d;}
 async resolveDispute(id:string,resolution:string,amount:string,message:string,uploadedFilename?:string){return providerRequest(this.config().secret,'/dispute/'+encodeURIComponent(id)+'/resolve','PUT',{resolution,refund_amount:Number(amount),message,uploaded_filename:uploadedFilename??''});}
 async verify(reference:string,transport:typeof fetch=fetch):Promise<VerifiedCharge>{
  const {secret,environment}=this.config();
  try{
   const data=await providerRequest(secret,'/transaction/verify/'+encodeURIComponent(reference),'GET',undefined,transport);
   if(data.status!=='success'||data.reference!==reference||data.domain!==environment||!Number.isSafeInteger(data.amount)||data.amount<=0||typeof data.currency!=='string')throw new Error('Unverified transaction');
   if(data.fees!=null&&(!Number.isSafeInteger(data.fees)||data.fees<0||data.fees>data.amount))throw new Error('Invalid fee');
   return {id:providerId(data.id),reference,amountMinor:data.amount,currency:data.currency,environment,...(data.fees!=null?{feeMinor:data.fees}:{})};
  }catch{throw new ServiceUnavailableException('Payment verification unavailable or unsuccessful');}
 }
}
