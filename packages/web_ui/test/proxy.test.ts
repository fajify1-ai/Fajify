import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {allowedRoute,platformProxy} from '../server';
const original=globalThis.fetch;
afterEach(()=>{globalThis.fetch=original;});
function setup(){process.env.NODE_ENV='test';process.env.FAJI_API_URL='http://127.0.0.1:3001';process.env.FAJI_WEB_ORIGIN='https://customer.test';}
function req(path:string,method='GET',origin='https://customer.test',body?:string){return new NextRequest('https://customer.test/api/platform/'+path,{method,headers:{origin,authorization:'Bearer attacker','x-forwarded-for':'attacker',cookie:'private=secret; __Secure-better-auth.session_token=opaque'},body});}
test('contract allowlist isolates merchant, customer and deferred products',()=>{
 assert.ok(allowedRoute('discovery/venues','GET','customer'));
 assert.ok(allowedRoute('businesses/abc/branches','POST','business'));
 for(const audience of ['customer','business'] as const){
  for(const path of ['admin/finance','customer/rides','customer/rides/quotes','customer/integrations/booking-rides','business/onboarding/abc/review','../auth','discovery//venues'])assert.equal(allowedRoute(path,'POST',audience),false,path);
 }
 assert.equal(allowedRoute('businesses/abc/finance','GET','customer'),false);
 assert.equal(allowedRoute('customer/profile','GET','business'),false);
});
test('bridge only forwards session cookies to fixed API and preserves query',async()=>{
 setup();globalThis.fetch=async(input,init)=>{assert.equal(String(input),'http://127.0.0.1:3001/api/v1/discovery/venues?q=test');const headers=new Headers(init?.headers);assert.equal(headers.get('authorization'),null);assert.equal(headers.get('x-forwarded-for'),null);assert.equal(headers.get('cookie'),'__Secure-better-auth.session_token=opaque');assert.equal(init?.redirect,'manual');return Response.json({items:[]},{headers:{'set-cookie':'bad=value'}});};
 const response=await platformProxy(req('discovery/venues?q=test'),'customer');assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('mutations reject untrusted origins and oversized payloads before fetch',async()=>{
 setup();globalThis.fetch=async()=>{throw Error('must not reach API');};
 assert.equal((await platformProxy(req('customer/profile','PATCH','https://evil.test','{}'),'customer')).status,403);
 assert.equal((await platformProxy(req('customer/profile','PATCH',undefined,'x'.repeat(65537)),'customer')).status,413);
});
test('upstream failures, redirects and permission errors never expose internals',async()=>{
 setup();for(const status of [302,500,401,403]){globalThis.fetch=async()=>new Response('password-private-stack',{status});const result=await platformProxy(req('customer/profile'),'customer');assert.equal(result.status,status>=300&&status<400||status>=500?503:status);assert.ok(!(await result.text()).includes('password-private-stack'));}
});

// One public host combines contract audiences; this never adds Admin/Ride authority.
test('unified bridge accepts both product contracts and preserves server denials',async()=>{
 assert.equal(allowedRoute('customer/profile','GET','unified'),true);
 assert.equal(allowedRoute('businesses/abc/finance','GET','unified'),true);
 for(const path of ['admin/finance','rides','customer/rides','business/onboarding/abc/review'])assert.equal(allowedRoute(path,'POST','unified'),false);
 setup();globalThis.fetch=async()=>Response.json({private:'not exposed'},{status:403});
 const response=await platformProxy(req('businesses/abc/finance'),'unified');
 assert.equal(response.status,403);assert.doesNotMatch(await response.text(),/not exposed/);
});
