import 'server-only';
import {isIP} from 'node:net';
import {NextRequest} from 'next/server';
import {authConfiguration,authCookies} from './config';
const privateFields=new Set(['token','accessToken','refreshToken','idToken','password']);
function publicResult(value:unknown):unknown{
 if(Array.isArray(value))return value.map(publicResult);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!privateFields.has(key)).map(([key,v])=>[key,publicResult(v)]));
 return value;
}
/** Only a fixed, validated owned upstream; no bearer tokens enter browser JavaScript. */
export async function proxyAuth(request:NextRequest){
 const outgoing=new Headers({'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});
 try{
  const {api,origin}=authConfiguration();
  if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:outgoing});
  if(request.method==='POST'&&request.headers.get('origin')!==origin)return Response.json({code:'UNTRUSTED_ORIGIN',message:'This site is not authorized to start authentication.'},{status:403,headers:outgoing});
  if(!request.nextUrl.pathname.startsWith('/api/auth/'))return new Response(null,{status:404,headers:outgoing});
  const target=new URL(request.nextUrl.pathname+request.nextUrl.search,api);
  if(target.origin!==api.origin)throw Error('Invalid upstream');
  const headers=new Headers();
  for(const name of ['content-type','origin','user-agent']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  const peer=request.headers.get('x-faji-client-ip');if(process.env.FAJI_TRUSTED_INGRESS==='true'&&peer&&isIP(peer))headers.set('x-faji-client-ip',peer);
  headers.set('cookie',authCookies(request.headers.get('cookie')??''));
  const body=request.method==='GET'?undefined:await request.text();
  if(body&&new TextEncoder().encode(body).length>16384)return new Response(null,{status:413,headers:outgoing});
  const response=await fetch(target,{method:request.method,headers,body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(response.status>=500||response.status>=300&&response.status<400)throw Error('Upstream unavailable');
  const text=await response.text();
  if(text.length>1048576)throw Error('Invalid upstream response');
  const data=text?JSON.parse(text):null;
  for(const cookie of response.headers.getSetCookie()){
   if(!/^(?:__Secure-|__Host-)?better-auth\.[a-zA-Z0-9_.-]+=/.test(cookie)||/;\s*domain=/i.test(cookie))throw Error('Invalid auth cookie');
   if(!/;\s*httponly(?:;|$)/i.test(cookie)||!/;\s*samesite=lax(?:;|$)/i.test(cookie))throw Error('Invalid cookie policy');
   if(origin.startsWith('https:')&&!/;\s*secure(?:;|$)/i.test(cookie))throw Error('Insecure auth cookie');
   outgoing.append('set-cookie',cookie);
  }
  if(response.status===204)return new Response(null,{status:204,headers:outgoing});
  return Response.json(publicResult(data),{status:response.status,headers:outgoing});
 }catch{
  // Never forward upstream stacks, HTML error pages, response cookies or credentials on failure.
  outgoing.delete('set-cookie');
  return Response.json({code:'AUTH_UNAVAILABLE',message:'Authentication is temporarily unavailable'},{status:503,headers:outgoing});
 }
}
