import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {allowedRoute,platformProxy} from '../server';
const original=globalThis.fetch;
const originalIngress=process.env.FAJI_TRUSTED_INGRESS;
const originalWebOrigins=process.env.FAJI_WEB_ORIGINS;
afterEach(()=>{
 globalThis.fetch=original;
 if(originalIngress===undefined)delete process.env.FAJI_TRUSTED_INGRESS;
 else process.env.FAJI_TRUSTED_INGRESS=originalIngress;
 if(originalWebOrigins===undefined)delete process.env.FAJI_WEB_ORIGINS;
 else process.env.FAJI_WEB_ORIGINS=originalWebOrigins;
});
function setup(){process.env.NODE_ENV='test';process.env.FAJI_API_URL='http://127.0.0.1:3001';process.env.FAJI_WEB_ORIGIN='https://customer.test';delete process.env.FAJI_WEB_ORIGINS;}
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
test('mutations accept only exact explicitly configured web origins and forward the browser origin',async()=>{
 setup();process.env.FAJI_WEB_ORIGINS='https://customer.test,https://fajify.com';
 let requests=0;
 globalThis.fetch=async(input,init)=>{
  requests++;
  assert.equal(String(input),'http://127.0.0.1:3001/api/v1/waitlist/business');
  assert.equal(new Headers(init?.headers).get('origin'),'https://fajify.com');
  return Response.json({accepted:true},{status:201});
 };
 const trusted=new NextRequest('https://fajify.com/api/platform/waitlist/business',{method:'POST',headers:{
  origin:'https://fajify.com','content-type':'application/json'
 },body:'{"businessName":"Cafe One","category":"restaurant_lounge","email":"owner@example.com","whatsapp":"8012345678","consent":true}'});
 assert.equal((await platformProxy(trusted,'unified')).status,201);
 const untrusted=new NextRequest('https://evil.test/api/platform/waitlist/business',{method:'POST',headers:{
  origin:'https://evil.test','content-type':'application/json'
 },body:'{}'});
 assert.equal((await platformProxy(untrusted,'unified')).status,403);
 assert.equal(requests,1);
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
test('waitlist bridge preserves the trusted origin, omits auth cookies and conditionally forwards ingress IP',async()=>{
 setup();
 assert.equal(allowedRoute('waitlist','POST','customer'),true);
 assert.equal(allowedRoute('waitlist','POST','unified'),true);
 assert.equal(allowedRoute('waitlist/business','POST','customer'),true);
 assert.equal(allowedRoute('waitlist/business','POST','unified'),true);
 assert.equal(allowedRoute('waitlist','POST','business'),false);
 assert.equal(allowedRoute('admin/waitlist','GET','unified'),false);
 assert.equal(allowedRoute('admin/waitlist/business','GET','unified'),false);
 process.env.FAJI_TRUSTED_INGRESS='true';
 const visitor=()=>new NextRequest('https://customer.test/api/platform/waitlist',{method:'POST',headers:{
  origin:'https://customer.test','content-type':'application/json','x-faji-client-ip':'203.0.113.8',
  cookie:'__Secure-better-auth.session_token=opaque'
 },body:'{"email":"person@example.com","whatsapp":"8012345678","consent":true}'});
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),'http://127.0.0.1:3001/api/v1/waitlist');
  const headers=new Headers(init?.headers);
  assert.equal(headers.get('cookie'),null);
  assert.equal(headers.get('origin'),'https://customer.test');
  assert.equal(headers.get('x-faji-client-ip'),'203.0.113.8');
  return Response.json({accepted:true},{status:201});
 };
 assert.equal((await platformProxy(visitor(),'unified')).status,201);
 const businessVisitor=()=>new NextRequest('https://customer.test/api/platform/waitlist/business',{method:'POST',headers:{
  origin:'https://customer.test','content-type':'application/json','x-faji-client-ip':'203.0.113.9',
  cookie:'__Secure-better-auth.session_token=opaque'
 },body:'{"businessName":"Cafe One","category":"restaurant_lounge","email":"owner@example.com","whatsapp":"8012345678","consent":true}'});
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),'http://127.0.0.1:3001/api/v1/waitlist/business');
  const headers=new Headers(init?.headers);
  assert.equal(headers.get('cookie'),null);
  assert.equal(headers.get('origin'),'https://customer.test');
  assert.equal(headers.get('x-faji-client-ip'),'203.0.113.9');
  return Response.json({accepted:true},{status:201});
 };
 assert.equal((await platformProxy(businessVisitor(),'unified')).status,201);
 process.env.FAJI_TRUSTED_INGRESS='false';
 globalThis.fetch=async(_input,init)=>{
  assert.equal(new Headers(init?.headers).get('x-faji-client-ip'),null);
  return Response.json({accepted:true},{status:201});
 };
 assert.equal((await platformProxy(businessVisitor(),'unified')).status,201);
 globalThis.fetch=async()=>new Response('Invalid origin',{status:400});
 const rejected=await platformProxy(visitor(),'unified');
 assert.equal(rejected.status,400);
 assert.equal((await rejected.json()).message,'The request could not be completed. Check your details and try again.');
});
test('waitlist bridge explains API validation failures for customer and business forms',async()=>{
 setup();
 const validations=[
  {path:'waitlist',message:['email must be an email','Enter a valid Nigerian mobile number.']},
  {path:'waitlist/business',message:[
   'businessName must match /\\S/ regular expression',
   'businessName must be longer than or equal to 2 characters',
   'category must be one of the following values: party_event_organizer, restaurant_lounge, event_venue, fun_recreation, other',
   'email must be an email',
   'whatsapp must be longer than or equal to 7 characters',
   'consent must be equal to true'
  ]}
 ];
 for(const validation of validations){
  globalThis.fetch=async()=>Response.json({
   error:{code:'VALIDATION_ERROR',message:validation.message,requestId:'safe-test-id'}
  },{status:400});
  const response=await platformProxy(req(validation.path,'POST','https://customer.test','{}'),'unified');
  assert.equal(response.status,400);
  assert.equal((await response.json()).message,validation.message.join(' '));
 }
});
test('Admin bridge exposes only reviewed admin workflows and preserves the strict allowlist',async()=>{
 for(const [path,method] of [
  ['admin/governance/approvals','GET'],
  ['admin/governance/approvals/00000000-0000-4000-8000-000000000000','GET'],
  ['business/onboarding/00000000-0000-4000-8000-000000000000/review','POST'],
  ['admin/finance/simulations','GET'],
  ['admin/finance/payments/00000000-0000-4000-8000-000000000000/simulation','POST'],
  ['admin/operations/overview','GET'],
  ['admin/waitlist','GET'],
  ['admin/waitlist/business','GET'],
  ['admin/operations/audit','GET'],
  ['admin/operations/command-audit','GET'],
  ['admin/governance/reviews','GET'],
  ['admin/governance/reviews/00000000-0000-4000-8000-000000000000/moderation','POST'],
  ['admin/governance/restrictions','GET'],
  ['admin/governance/branches/00000000-0000-4000-8000-000000000000/restriction','POST'],
  ['admin/governance/catalogue/00000000-0000-4000-8000-000000000000/restriction','POST'],
  ['admin/support/cases','GET'],
  ['admin/support/cases/00000000-0000-4000-8000-000000000000','GET'],
  ['admin/support/cases/00000000-0000-4000-8000-000000000000/assignment','POST'],
  ['admin/support/cases/00000000-0000-4000-8000-000000000000/messages','POST'],
  ['admin/support/cases/00000000-0000-4000-8000-000000000000/status','POST'],
  ['admin/incidents','GET'],
  ['admin/incidents','POST'],
  ['admin/incidents/00000000-0000-4000-8000-000000000000/status','POST'],
  ['admin/finance/summary','GET'],
  ['admin/reports/overview','GET'],
  ['admin/reports/businesses/00000000-0000-4000-8000-000000000000','GET'],
  ['admin/integrations/consistency','GET'],
  ['admin/integrations/customers/customer_subject-1/activity','GET'],
  ['admin/monitoring/status','GET'],
  ['admin/monitoring/check','POST'],
  ['admin/monitoring/alerts','GET'],
  ['admin/monitoring/alerts/00000000-0000-4000-8000-000000000000/acknowledgement','POST'],
 ] as const)assert.equal(allowedRoute(path,method,'admin'),true,`${method} ${path}`);
 for(const [path,method] of [
  ['admin/finance/payments/00000000-0000-4000-8000-000000000000/provider-recheck','POST'],
  ['admin/finance/refunds/00000000-0000-4000-8000-000000000000/decision','POST'],
  ['admin/accounts/customer_subject-1/suspension','POST'],
  ['admin/accounts/customer_subject-1/memberships','POST'],
  ['admin/finance/operations','GET'],
  ['admin/finance/businesses/00000000-0000-4000-8000-000000000000/settlements','POST'],
  ['admin/finance/jobs/00000000-0000-4000-8000-000000000000/retry','POST'],
  ['admin/ride-payouts/00000000-0000-4000-8000-000000000000/submit','POST'],
  ['admin/ride-tariffs','POST'],
  ['business/onboarding/00000000-0000-4000-8000-000000000000/workspace','GET'],
  ['admin/governance/approvals','POST'],
 ] as const)assert.equal(allowedRoute(path,method,'admin'),false,`${method} ${path}`);
 assert.equal(allowedRoute('admin/finance/simulations','GET','unified'),false);
 setup();let target='';
 globalThis.fetch=async(input)=>{target=String(input);return Response.json({items:[],nextOffset:null});};
 const response=await platformProxy(req('admin/finance/simulations?limit=20&offset=0'),'admin');
 assert.equal(response.status,200);
 assert.equal(target,'http://127.0.0.1:3001/api/v1/admin/finance/simulations?limit=20&offset=0');
});
