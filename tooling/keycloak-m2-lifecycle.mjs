import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';

const origin=process.env.FAJI_KC_ORIGIN;
const adminPassword=process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
assert.match(origin??'',/^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(adminPassword);
const realm=origin+'/realms/faji';
const form=payload=>new URLSearchParams(payload).toString();
async function json(url,options={}){
 const response=await fetch(url,options);
 const body=await response.text();
 if(!response.ok)throw Error('Unexpected HTTP '+response.status+' for '+new URL(url).pathname+' '+body.slice(0,160));
 return JSON.parse(body);
}
const bootstrap=await json(origin+'/realms/master/protocol/openid-connect/token',{
 method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'password',client_id:'admin-cli',username:'m2_acceptance_admin',password:adminPassword})
});
const adminHeaders={authorization:'Bearer '+bootstrap.access_token,'content-type':'application/json'};
const clients=await json(origin+'/admin/realms/faji/clients?clientId=faji-customer-mobile',{headers:adminHeaders});
assert.equal(clients.length,1);
const client=clients[0];
assert.equal(client.attributes?.['pkce.code.challenge.method'],'S256');
assert.equal(client.publicClient,true);
assert.equal(client.directAccessGrantsEnabled,false);
assert.equal(client.implicitFlowEnabled,false);
console.log('PASS: imported customer client enforces PKCE S256, disallows direct and implicit grants');

const username='acceptance_'+randomBytes(8).toString('hex');
const password='Aa1!'+randomBytes(20).toString('base64url');
const userRes=await fetch(origin+'/admin/realms/faji/users',{
 method:'POST',headers:adminHeaders,
 body:JSON.stringify({username,email:username+'@example.invalid',emailVerified:true,enabled:true,
  credentials:[{type:'password',value:password,temporary:false}]})
});
assert.equal(userRes.status,201,'disposable synthetic user creation');
const verifier=randomBytes(32).toString('base64url');
const challenge=createHash('sha256').update(verifier).digest('base64url');
const redirect='com.faji.customer:/oauth/callback';
const state=randomBytes(12).toString('hex');
const authorize=new URL(realm+'/protocol/openid-connect/auth');
for(const [key,value] of Object.entries({client_id:'faji-customer-mobile',redirect_uri:redirect,response_type:'code',scope:'openid',state,code_challenge:challenge,code_challenge_method:'S256'}))authorize.searchParams.set(key,value);
const cookies=new Map();
function collect(response){
 const set=response.headers.getSetCookie?.()??[];
 for(const entry of set){const first=entry.split(';',1)[0],i=first.indexOf('=');if(i>0)cookies.set(first.slice(0,i),first.slice(i+1));}
}
function cookieHeader(){return [...cookies].map(([k,v])=>k+'='+v).join('; ');}
let response=await fetch(authorize,{redirect:'manual'});collect(response);
for(let i=0;i<6&&response.status>=300&&response.status<400;i++){
 const dest=new URL(response.headers.get('location'),authorize);
 assert.equal(dest.origin,origin,'unexpected login redirect');
 response=await fetch(dest,{redirect:'manual',headers:{cookie:cookieHeader()}});collect(response);
}
assert.equal(response.status,200,'Keycloak login form must render');
const html=await response.text();
const loginAction=html.match(/<form\b[^>]*\bid=["']kc-form-login["'][^>]*\baction=["']([^"']+)["']/i)?.[1]
 ??html.match(/<form\b[^>]*\baction=["']([^"']+login-actions[^"']*)["']/i)?.[1];
assert.ok(loginAction,'Keycloak login action not found');
const decoded=loginAction.replaceAll('&amp;','&');
assert.ok(decoded.startsWith(origin+'/realms/faji/'),'login form must be local');
response=await fetch(decoded,{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded',cookie:cookieHeader()},
 body:form({username,password,credentialId:''})});collect(response);
assert.ok([302,303].includes(response.status),'Keycloak login should redirect');
let destination;
for(let step=0;step<8;step++){
 const location=response.headers.get('location');
 assert.ok(location,'redirect must include Location header');
 destination=new URL(location,origin);
 if(destination.protocol==='com.faji.customer:')break;
 assert.equal(destination.origin,origin,'unexpected external redirect');
 assert.ok(destination.pathname.startsWith('/realms/faji/'),'unexpected redirect outside faji realm');
 response=await fetch(destination,{redirect:'manual',headers:{cookie:cookieHeader()}});
 collect(response);
 if(![302,303].includes(response.status)){
  const content=await response.text();
  const flags=[...content.matchAll(/class=["'][^"']*(?:alert-error|kc-feedback-text)[^"']*["']/g)].length;
  throw Error('Keycloak login did not reach mobile callback: HTTP '+response.status+
    ', path '+destination.pathname+', feedback markers '+flags);
 }
}
assert.equal(destination.protocol,'com.faji.customer:','expected registered mobile callback');
assert.equal(destination.searchParams.get('state'),state);
const code=destination.searchParams.get('code');
assert.ok(code,'authorization code required');
const tokenUrl=realm+'/protocol/openid-connect/token';
const exchange=async(v)=>fetch(tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'authorization_code',client_id:'faji-customer-mobile',redirect_uri:redirect,code,code_verifier:v})});
const bad=await exchange('wrong-verifier-'+verifier);
assert.equal(bad.status,400,'wrong PKCE verifier must fail');
const good=await exchange(verifier);
assert.equal(good.status,200,'correct PKCE verifier must succeed');
const tokens=await good.json();
assert.ok(tokens.access_token&&tokens.refresh_token);
const jwt=JSON.parse(Buffer.from(tokens.access_token.split('.')[1],'base64url'));
assert.equal(jwt.iss,realm);
assert.ok((Array.isArray(jwt.aud)?jwt.aud:[jwt.aud]).includes('faji-api'));
console.log('PASS: real browser-form authorization code, wrong PKCE rejection, token exchange and Fajify API audience');
const refresh=await json(tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'refresh_token',client_id:'faji-customer-mobile',refresh_token:tokens.refresh_token})});
assert.ok(refresh.access_token&&refresh.refresh_token);
console.log('PASS: Keycloak refresh grant');
const logout=await fetch(realm+'/protocol/openid-connect/logout',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({client_id:'faji-customer-mobile',refresh_token:refresh.refresh_token})});
assert.equal(logout.status,204);
const revoked=await fetch(tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'refresh_token',client_id:'faji-customer-mobile',refresh_token:refresh.refresh_token})});
assert.equal(revoked.status,400,'refresh token must be rejected after logout');
console.log('PASS: logout invalidates refresh token');
