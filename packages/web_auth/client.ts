"use client";
import {createAuthClient} from 'better-auth/react';
import {twoFactorClient,phoneNumberClient} from 'better-auth/client/plugins';
export const authClient=createAuthClient({plugins:[twoFactorClient(),phoneNumberClient()]});
function isRecord(value:unknown):value is Record<string,unknown>{
 return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
export interface AuthPostResponse extends Record<string,unknown>{
 twoFactorRedirect?:boolean;
 totpURI?:string;
 backupCodes?:string[];
}
function isAuthPostResponse(value:unknown):value is AuthPostResponse{
 return isRecord(value)&&
  (!('twoFactorRedirect'in value)||typeof value.twoFactorRedirect==='boolean')&&
  (!('totpURI'in value)||typeof value.totpURI==='string')&&
  (!('backupCodes'in value)||(Array.isArray(value.backupCodes)&&value.backupCodes.every(code=>typeof code==='string')));
}
export async function authPost(path:string,body:Record<string,unknown>):Promise<AuthPostResponse>{
 const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});
 const text=await response.text();
 let data:unknown;
 try{data=text?JSON.parse(text):null;}catch{data=null;}
 if(!response.ok)throw Error(isRecord(data)&&typeof data.message==='string'?data.message:`Authentication failed (${response.status}). Please try again.`);
 if(response.status===204)return {};
 if(!isAuthPostResponse(data))throw Error('The authentication service returned an invalid response. Please try again.');
 return data;
}
