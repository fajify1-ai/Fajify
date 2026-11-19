import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proxyAuth} from '../proxy';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original;process.env.NODE_ENV='test';});
function setup(){process.env.FAJI_API_URL='http://127.0.0.1:3001';process.env.FAJI_WEB_ORIGIN='https://app.example.test';process.env.NODE_ENV='test';}
function req(origin='https://app.example.test',body='{}'){return new NextRequest('https://app.example.test/api/auth/sign-in/email',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer malicious','x-forwarded-for':'attacker',cookie:'other.secret=do-not-forward; __Secure-better-auth.session_token=opaque'},body});}
test('proxy strips nested tokens and forwards only authentication cookies',async()=>{setup();globalThis.fetch=async(input,init)=>{assert.equal(String(input),'http://127.0.0.1:3001/api/auth/sign-in/email');const headers=new Headers(init?.headers);assert.equal(headers.get('cookie'),'__Secure-better-auth.session_token=opaque');assert.equal(headers.get('authorization'),null);assert.equal(headers.get('x-forwarded-for'),null);return Response.json({token:'secret',session:{token:'secret'},sessions:[{token:'secret',id:'id'}]},{headers:{'set-auth-token':'secret','set-cookie':'__Secure-better-auth.session_token=opaque; HttpOnly; Secure; SameSite=Lax; Path=/'}});};const response=await proxyAuth(req());assert.equal(response.status,200);assert.deepEqual(await response.json(),{session:{},sessions:[{id:'id'}]});assert.equal(response.headers.get('set-auth-token'),null);assert.match(response.headers.get('set-cookie')!,/HttpOnly/);});
test('untrusted origin and oversized bodies do not reach the upstream',async()=>{setup();globalThis.fetch=async()=>{throw Error('must not fetch');};assert.equal((await proxyAuth(req('https://evil.test'))).status,403);assert.equal((await proxyAuth(req(undefined,'x'.repeat(17000)))).status,413);});
test('credentials, query strings and non-web upstream protocols are rejected',async()=>{setup();globalThis.fetch=async()=>{throw Error('must not fetch');};for(const url of ['https://user:pass@api.test','https://api.test?secret=1','file:///etc/passwd']){process.env.FAJI_API_URL=url;assert.equal((await proxyAuth(req())).status,503);}});
test('network failures, redirects and upstream errors never expose credentials or cookies',async()=>{setup();for(const response of [new Response('private-password-stack',{status:500,headers:{'set-cookie':'sensitive=1'}}),new Response(null,{status:302,headers:{location:'https://evil.test'}})]){globalThis.fetch=async()=>response;const result=await proxyAuth(req());assert.equal(result.status,503);assert.equal(result.headers.get('set-cookie'),null);assert.ok(!(await result.text()).includes('private-password'));}globalThis.fetch=async()=>{throw Error('secret exception');};assert.equal((await proxyAuth(req())).status,503);});
test('HTTPS host rejects insecure or domain-scoped upstream cookies',async()=>{setup();for(const cookie of ['better-auth.session_token=t; HttpOnly; SameSite=Lax','__Secure-better-auth.session_token=t; HttpOnly; Secure; Domain=example.test']){globalThis.fetch=async()=>Response.json({},{headers:{'set-cookie':cookie}});const result=await proxyAuth(req());assert.equal(result.status,503);assert.equal(result.headers.get('set-cookie'),null);}});
test('trusted staging frontend origin is proxied to the API without trusting the API origin',async()=>{
 process.env.NODE_ENV='production';process.env.FAJI_API_URL='https://api.fajify.com';process.env.FAJI_WEB_ORIGIN='https://preview.fajify.com';
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),'https://api.fajify.com/api/auth/sign-up/email');
  assert.equal(new Headers(init?.headers).get('origin'),'https://preview.fajify.com');
  return Response.json({user:{id:'customer-1'}},{headers:{'set-cookie':'__Secure-better-auth.session_token=opaque; HttpOnly; Secure; SameSite=Lax; Path=/'}});
 };
 const request=new NextRequest('https://preview.fajify.com/api/auth/sign-up/email',{method:'POST',headers:{origin:'https://preview.fajify.com','content-type':'application/json'},body:'{}'});
 const response=await proxyAuth(request);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{user:{id:'customer-1'}});
 globalThis.fetch=async()=>{throw Error('API host is not a trusted browser origin');};
 const apiOrigin=new NextRequest('https://preview.fajify.com/api/auth/sign-up/email',{method:'POST',headers:{origin:'https://api.fajify.com','content-type':'application/json'},body:'{}'});
 const rejected=await proxyAuth(apiOrigin);
 assert.equal(rejected.status,403);
 assert.deepEqual(await rejected.json(),{code:'UNTRUSTED_ORIGIN',message:'This site is not authorized to start authentication.'});
});
test('missing or malformed web origin configuration fails closed as JSON',async()=>{
 setup();process.env.NODE_ENV='production';globalThis.fetch=async()=>{throw Error('must not fetch');};
 for(const value of [undefined,'https://preview.fajify.com/path','http://preview.fajify.com']){
  if(value===undefined)delete process.env.FAJI_WEB_ORIGIN;else process.env.FAJI_WEB_ORIGIN=value;
  const response=await proxyAuth(req());
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{code:'AUTH_UNAVAILABLE',message:'Authentication is temporarily unavailable'});
 }
});
