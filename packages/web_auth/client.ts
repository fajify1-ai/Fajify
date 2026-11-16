"use client";
import {createAuthClient} from 'better-auth/react';
import {twoFactorClient,phoneNumberClient} from 'better-auth/client/plugins';
export const authClient=createAuthClient({plugins:[twoFactorClient(),phoneNumberClient()]});
export async function authPost(path:string,body:Record<string,unknown>){
 const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw Error(typeof data?.message==='string'?data.message:'Authentication failed');
 return data;
}
