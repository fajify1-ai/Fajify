import {ServiceUnavailableException} from '@nestjs/common';

export function providerId(value:unknown){
 if(typeof value==='string'&&/^[1-9][0-9]{0,19}$/.test(value)&&BigInt(value)<=18446744073709551615n)return value;
 if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return String(value);
 throw new ServiceUnavailableException('Invalid provider identifier');
}
/** Quote integer id fields before parsing so uint64 provider identifiers never lose precision. */
export function parseProviderJson(raw:string){
 if(raw.length>524288)throw new Error('Oversized provider response');
 return JSON.parse(raw.replace(/("(?:id|transaction)"\s*:\s*)([0-9]+)(?=\s*[,}])/g,'$1"$2"'));
}
export function checkoutUrl(value:unknown){
 if(typeof value!=='string')throw Error('Invalid checkout URL');const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='checkout.paystack.com'||url.username||url.password||url.port||url.hash)throw Error('Invalid checkout URL');return url.toString();
}
export type ProviderRecord=Record<string,any>;
/** Fixed-origin transport shared by all provider operations; errors never include credentials/payloads. */
export async function providerRequest(secret:string,path:string,method='GET',body?:unknown,transport:typeof fetch=fetch):Promise<ProviderRecord>{
 try{
  if(!path.startsWith('/')||path.startsWith('//'))throw Error('Invalid path');
  const r=await transport('https://api.paystack.co'+path,{method,headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Provider HTTP failure');
  const result=parseProviderJson(await r.text());if(result?.status!==true||!result.data)throw Error('Provider operation failed');return result.data;
 }catch{throw new ServiceUnavailableException('Provider operation unavailable; reconcile before retrying ambiguous writes');}
}
