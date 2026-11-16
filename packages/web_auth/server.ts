import 'server-only';
import {authConfiguration,authCookies} from './config';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
export async function requireIdentity(){
 const incoming=await headers();
 const {api}=authConfiguration();
 const response=await fetch(new URL('/api/v1/auth/me',api),{headers:{cookie:authCookies(incoming.get('cookie')??'')},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(response.status===401)redirect('/login');
 if(response.status===403)redirect('/access-denied');
 if(!response.ok)throw new Error('Session validation unavailable');
 return response.json() as Promise<{subject:string;roles:string[]}>;
}
