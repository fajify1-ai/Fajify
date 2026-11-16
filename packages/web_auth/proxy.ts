import 'server-only';
import {NextRequest} from 'next/server';
/** Fixed upstream: browser cookies remain HttpOnly and scoped to each web host. */
export async function proxyAuth(request:NextRequest){
 const base=process.env.FAJI_API_URL;
 const origin=process.env.FAJI_WEB_ORIGIN;
 if(!base||!origin)return new Response('Authentication is not configured',{status:503});
 if(request.method!=='GET'&&request.headers.get('origin')!==origin)return new Response('Invalid origin',{status:403});
 const target=new URL(request.nextUrl.pathname+request.nextUrl.search,base);
 const headers=new Headers();
 for(const name of ['content-type','cookie','origin','user-agent']){const value=request.headers.get(name);if(value)headers.set(name,value);}
 // Never accept browser-supplied bearer or forwarding headers.
 const response=await fetch(target,{method:request.method,headers,body:request.method==='GET'?undefined:await request.text(),redirect:'manual',cache:'no-store'});
 const outgoing=new Headers({'cache-control':'no-store','referrer-policy':'no-referrer','content-type':response.headers.get('content-type')??'application/json'});
 for(const cookie of response.headers.getSetCookie())outgoing.append('set-cookie',cookie);
 // Native tokens must never become readable by browser JavaScript.
 if(response.headers.get('content-type')?.includes('application/json')){
  const data=await response.json();
  if(data&&typeof data==='object'){
   delete data.token;
   if(data.session&&typeof data.session==='object')delete data.session.token;
  }
  return Response.json(data,{status:response.status,headers:outgoing});
 }
 return new Response(response.body,{status:response.status,headers:outgoing});
}
