import 'server-only';
import {isIP} from 'node:net';
import { authConfiguration, authCookies } from '@faji/web-auth/config';
import type { NextRequest } from 'next/server';
import rules from './routes.json';

export function allowedRoute(path:string,method:string,audience:'customer'|'business'|'unified'|'admin') {
  if (!/^[A-Za-z0-9_/-]+$/.test(path) || path.includes('//')) return false;
  return rules.some(rule => (rule.audience===audience||rule.audience==='both'||(audience==='unified'&&(rule.audience==='customer'||rule.audience==='business'))) && rule.method===method && new RegExp('^'+rule.path.replace(/\{[^}]+\}/g,'[A-Za-z0-9_-]+')+'$').test(path));
}
/** Same-origin, fixed upstream BFF. NestJS remains the authorization authority. */
export async function platformProxy(request:NextRequest,audience:'customer'|'business'|'unified'|'admin') {
 const responseHeaders={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 const path=request.nextUrl.pathname.replace(/^\/api\/platform\//,'');
 if(!allowedRoute(path,request.method,audience))return Response.json({message:'This operation is unavailable.'},{status:404,headers:responseHeaders});
 try {
  const {api,origin}=authConfiguration();
  if(request.method!=='GET' && request.headers.get('origin')!==origin)return Response.json({message:'Invalid request origin.'},{status:403,headers:responseHeaders});
  const body=request.method==='GET'?undefined:await request.text();
  if(body&&new TextEncoder().encode(body).length>(/^business\/onboarding\/[^/]+\/verification-documents$/.test(path)?380000:65536))return new Response(null,{status:413,headers:responseHeaders});
  const target=new URL('/api/v1/'+path+request.nextUrl.search,api);
  const headers:Record<string,string>={'content-type':'application/json',origin};
  if(path!=='waitlist')headers.cookie=authCookies(request.headers.get('cookie')??'');
  else if(process.env.FAJI_TRUSTED_INGRESS==='true'){
   const clientIp=request.headers.get('x-faji-client-ip');
   if(clientIp&&isIP(clientIp))headers['x-faji-client-ip']=clientIp;
  }
  const upstream=await fetch(target,{method:request.method,headers,body,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(upstream.status>=300&&upstream.status<400)throw Error('Redirect refused');
  if(upstream.status>=500)throw Error('Service unavailable');
  if(upstream.status===204)return new Response(null,{status:204,headers:responseHeaders});
  const raw=await upstream.text();
  if(raw.length>2_000_000)throw Error('Response too large');
  if(!upstream.ok){
   let message=upstream.status===401?'Sign in to continue.':upstream.status===403?'Your account does not have permission for this operation.':upstream.status===409?'This item changed or is no longer available. Refresh and try again.':upstream.status===429?'Too many requests. Please try again later.':'The request could not be completed. Check your details and try again.';
   if(path==='waitlist'&&upstream.status===403)message='This signup request was blocked. Refresh the page and try again.';
   if(path==='waitlist'&&upstream.status===400){
    try{
     const errorBody:unknown=JSON.parse(raw);
     if(typeof errorBody==='object'&&errorBody!==null&&'message'in errorBody){
      const detail=errorBody.message;
      if(typeof detail==='string'&&detail.length<=200)message=detail;
      else if(Array.isArray(detail)&&detail.every(item=>typeof item==='string')&&detail.length<=5)message=detail.join(' ');
     }
    }catch{message='The request could not be completed. Check your details and try again.';}
   }
   return Response.json({message},{status:upstream.status,headers:responseHeaders});
  }
  return Response.json(raw?JSON.parse(raw):null,{status:upstream.status,headers:responseHeaders});
 }catch{return Response.json({message:'The service is currently unavailable. No action has been confirmed.'},{status:503,headers:responseHeaders});}
}
