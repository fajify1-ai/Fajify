import 'server-only';
import {authConfiguration,authCookies} from './config';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
async function identityResponse(cookie:string){
 const {api}=authConfiguration();
 return fetch(new URL('/api/v1/auth/me',api),{headers:{cookie},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
}
/** Resume only a server-validated session; anonymous presentation needs no API configuration. */
export async function optionalIdentity(){
 const incoming=await headers(),cookie=authCookies(incoming.get('cookie')??'');
 if(!cookie)return null;
 try{const response=await identityResponse(cookie);return response.ok?await response.json() as {subject:string;roles:string[]}:null;}catch{return null;}
}
export async function requireIdentity(loginPath:'/login'|'/business/login'='/login'){
 const incoming=await headers();
 const response=await identityResponse(authCookies(incoming.get('cookie')??''));
 if(response.status===401)redirect(loginPath);
 if(response.status===403)redirect('/access-denied');
 if(!response.ok)throw new Error('Session validation unavailable');
 return response.json() as Promise<{subject:string;roles:string[]}>;
}
