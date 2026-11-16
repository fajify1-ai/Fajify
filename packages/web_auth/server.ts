import 'server-only';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
export async function requireIdentity(){
 const incoming=await headers();
 const response=await fetch(`${process.env.FAJI_API_URL}/api/v1/auth/me`,{headers:{cookie:incoming.get('cookie')??''},cache:'no-store',redirect:'error'});
 if(response.status===401)redirect('/login');
 if(response.status===403)redirect('/access-denied');
 if(!response.ok)throw new Error('Session validation unavailable');
 return response.json() as Promise<{subject:string;roles:string[]}>;
}
