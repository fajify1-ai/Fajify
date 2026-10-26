import assert from 'node:assert/strict';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Disposable privileged browser acceptance: never use real admin users or OTP secrets.
const origin=process.env.FAJI_KC_ORIGIN;
const password=process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
assert.match(origin??'',/^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(password);
const realm=origin+'/realms/faji';
const form=value=>new URLSearchParams(value).toString();
const bootstrap=await fetch(origin+'/realms/master/protocol/openid-connect/token',{
 method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'password',client_id:'admin-cli',username:'m2_acceptance_admin',password})
});
assert.equal(bootstrap.status,200);
const auth=(await bootstrap.json()).access_token;
const headers={authorization:'Bearer '+auth,'content-type':'application/json'};
async function json(url){const r=await fetch(url,{headers});assert.equal(r.status,200,'admin request failed: '+new URL(url).pathname);return r.json();}
const role=await json(origin+'/admin/realms/faji/roles/platform-admin');
const username='privileged_'+randomBytes(8).toString('hex');
const userPassword='Aa1!'+randomBytes(24).toString('base64url');
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const seed=randomBytes(20);
let bits=0,hold=0,secret='';
for(const byte of seed){hold=(hold<<8)|byte;bits+=8;while(bits>=5){bits-=5;secret+=alphabet[(hold>>bits)&31];}}
if(bits)secret+=alphabet[(hold<<(5-bits))&31];
// Keycloak's OTP credential secretData stores literal secret characters by default.\n// HMAC must use those UTF-8 bytes (not the random seed used to generate that text).\nconst credential={type:'otp',userLabel:'disposable-otp',
 secretData:JSON.stringify({value:secret}),
 credentialData:JSON.stringify({digits:6,counter:0,period:30,algorithm:'HmacSHA1',subType:'totp'})};
const user=await fetch(origin+'/admin/realms/faji/users',{method:'POST',headers,body:JSON.stringify({
 username,firstName:'Synthetic',lastName:'Administrator',email:username+'@example.invalid',
 emailVerified:true,enabled:true,requiredActions:[],
 credentials:[{type:'password',value:userPassword,temporary:false},credential]
})});
assert.equal(user.status,201,'synthetic admin plus disposable OTP credential creation');
const userId=user.headers.get('location')?.split('/').pop();
assert.ok(userId);
const assign=await fetch(origin+'/admin/realms/faji/users/'+encodeURIComponent(userId)+'/role-mappings/realm',{
 method:'POST',headers,body:JSON.stringify([role])
});
assert.equal(assign.status,204,'privileged role assignment');
// Do not assume Keycloak persists an OTP credential supplied in the user-create representation.
const persisted=await json(origin+'/admin/realms/faji/users/'+encodeURIComponent(userId)+'/credentials');
const otpCredentials=persisted.filter(c=>c.type==='otp');
assert.equal(otpCredentials.length,1,'Keycloak did not persist the synthetic OTP credential during provisioning');
assert.ok(otpCredentials[0].id,'persisted OTP credential must have an ID');
const cookies=new Map();
const collect=r=>{for(const entry of r.headers.getSetCookie?.()??[]){const c=entry.split(';',1)[0],i=c.indexOf('=');if(i>0)cookies.set(c.slice(0,i),c.slice(i+1));}};
const cookie=()=>[...cookies].map(([a,b])=>a+'='+b).join('; ');
const verifier=randomBytes(32).toString('base64url');
const challenge=createHash('sha256').update(verifier).digest('base64url');
const state=randomBytes(18).toString('base64url');
const redirect='com.faji.admin:/oauth/callback';
const u=new URL(realm+'/protocol/openid-connect/auth');
for(const [key,value] of Object.entries({
 client_id:'faji-admin-web',redirect_uri:redirect,response_type:'code',scope:'openid',
 state,code_challenge:challenge,code_challenge_method:'S256'
}))u.searchParams.set(key,value);
let response=await fetch(u,{redirect:'manual'});collect(response);
async function settle(r){
 for(let i=0;i<10&&[302,303].includes(r.status);i++){
  const location=r.headers.get('location');
  assert.ok(location,'redirect missing Location');
  const dest=new URL(location,origin);
  if(dest.protocol==='com.faji.admin:')return {response:r,callback:dest};
  assert.equal(dest.origin,origin,'cross-origin browser navigation rejected');
  assert.ok(dest.pathname.startsWith('/realms/faji/'),'browser navigation left expected realm');
  r=await fetch(dest,{redirect:'manual',headers:{cookie:cookie()}});collect(r);
 }
 return {response:r,callback:null};
}
let step=await settle(response);
assert.equal(step.response.status,200,'admin password login form required');
function action(html){
 const tag=[...html.matchAll(/<form\b([^>]*)>/gi)]
  .map(m=>m[1]).find(x=>x.includes('login-actions/'));
 assert.ok(tag,'Keycloak login form action not present');
 const raw=tag.match(/\baction=["']([^"']+)["']/i)?.[1];
 assert.ok(raw,'form action required');
 const parsed=new URL(raw.replaceAll('&amp;','&'),origin);
 assert.equal(parsed.origin,origin);
 assert.ok(parsed.pathname.startsWith('/realms/faji/login-actions/'));
 return parsed;
}
let html=await step.response.text();
const passwordAction=action(html);
response=await fetch(passwordAction,{method:'POST',redirect:'manual',
 headers:{'content-type':'application/x-www-form-urlencoded',cookie:cookie()},
 body:form({username,password:userPassword,credentialId:''})});
collect(response);
step=await settle(response);
assert.equal(step.callback,null,'password-only login cannot satisfy admin OTP flow');
assert.equal(step.response.status,200,'OTP challenge must render after password');
html=await step.response.text();
const otpField=/name=["']otp["']/i.test(html)?'otp':/name=["']totp["']/i.test(html)?'totp':null;
assert.ok(otpField,'real Keycloak OTP challenge input required');
const otpAction=action(html);
console.log('PASS: privileged password-only login blocked at mandatory OTP challenge');
function totp(at=Date.now()){
 const counter=Math.floor(at/1000/30);
 const num=Buffer.alloc(8);num.writeBigUInt64BE(BigInt(counter));
 const mac=createHmac('sha1',Buffer.from(secret,'utf8')).update(num).digest();
 const i=mac[mac.length-1]&15;
 return (((mac.readUInt32BE(i)&0x7fffffff)%1000000)+'').padStart(6,'0');
}
// Always submit the exact field names from the rendered Keycloak OTP form.
// A one-window clock tolerance is tested only for the disposable synthetic user.
function otpFormFields(html){
 // The form action is already parsed and validated by action(html).
 // Here extract only input fields; Keycloak's form action may be HTML-escaped
 // or its form id can differ between themes.
 const names=[...html.matchAll(/<input\\b([^>]*)>/gi)].map(m=>m[1])
  .map(tag=>({name:tag.match(/\\bname=["']([^"']+)["']/i)?.[1],
   value:tag.match(/\\bvalue=["']([^"']*)["']/i)?.[1]??''}));
 const chosen=names.find(n=>n.name==='selectedCredentialId');
 return {selected:chosen?.value||otpCredentials[0].id,
  field:names.some(n=>n.name==='otp')?'otp':otpField};
}
async function submitOtp(html,at){
 const f=otpFormFields(html);
 const nextAction=action(html);
 const res=await fetch(nextAction,{method:'POST',redirect:'manual',
  headers:{'content-type':'application/x-www-form-urlencoded',cookie:cookie()},
  body:form({[f.field]:totp(at),selectedCredentialId:f.selected})});
 collect(res);
 return settle(res);
}
step=await submitOtp(html,Date.now());
if(!step.callback){
 const status=step.response.status;
 let failure='no callback';
 if(status===200){
  const retryHtml=await step.response.text();
  const feedback=[...retryHtml.matchAll(/class=["'][^"']*(?:alert-error|kc-feedback-text)[^"']*["']/gi)].length;
  const fields=[...retryHtml.matchAll(/name=["'](otp|totp|credentialId|selectedCredentialId|firstName|lastName|email)["']/gi)].map(m=>m[1]);
  // Check local and server TOTP configuration, not the secret value.
  const credentialInfo=JSON.parse(otpCredentials[0].credentialData??'{}');
  const realmInfo=await json(origin+'/admin/realms/faji');
  const configured={digits:realmInfo.otpPolicyDigits,period:realmInfo.otpPolicyPeriod,type:realmInfo.otpPolicyType,algorithm:realmInfo.otpPolicyAlgorithm};
  const present={digits:credentialInfo.digits,period:credentialInfo.period,subType:credentialInfo.subType,algorithm:credentialInfo.algorithm};
  const matches=Number(configured.digits)===Number(present.digits)&&Number(configured.period)===Number(present.period)&&configured.algorithm===present.algorithm&&configured.type===present.subType;
  // Extract only known Keycloak validation categories, never dump HTML or secrets.
  const errors=[];
  const lower=retryHtml.toLowerCase();
  for(const [label,pattern] of [
   ['invalid-otp',/invalid (?:authenticator |verification |one-time |otp )?code|invalid otp|invalid authenticator/i],
   ['expired-session',/login timeout|session expired|page has expired/i],
   ['required-action',/configure otp|set up authenticator|update password/i],
   ['invalid-credentials',/invalid username or password/i],
   ['credential-unavailable',/credential (?:not found|unavailable)|authenticator not configured/i]
  ])if(pattern.test(lower))errors.push(label);
  const selectedInput=retryHtml.match(/<input\\b[^>]*name=["']selectedCredentialId["'][^>]*>/i)?.[0]??'';
  const selectedPresent=/\\bvalue=["'][^"']+["']/i.test(selectedInput);
  failure='returned OTP form; validation-categories='+errors.join('|')+', selected-credential-value-present='+selectedPresent+', feedback markers='+feedback+', fields='+[...new Set(fields)].join(',')+
   ', credential-policy-match='+matches+', configured-policy='+JSON.stringify(configured);
 }else if([302,303].includes(status))failure='unexpected redirect without callback';
 throw new Error('Synthetic TOTP did not complete admin login (HTTP '+status+': '+failure+
  '). Verify realm OTP policy, credential encoding, and disposable host clock; secrets withheld');
}
assert.equal(step.callback.searchParams.get('state'),state);
const code=step.callback.searchParams.get('code');assert.ok(code);
const exchanged=await fetch(realm+'/protocol/openid-connect/token',{
 method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'authorization_code',client_id:'faji-admin-web',redirect_uri:redirect,code,code_verifier:verifier})
});
assert.equal(exchanged.status,200,'admin PKCE code exchange');
const tokens=await exchanged.json();
const claims=JSON.parse(Buffer.from(tokens.access_token.split('.')[1],'base64url').toString('utf8'));
assert.equal(claims.azp,'faji-admin-web');
assert.ok((Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes('faji-api'));
assert.ok(claims.realm_access?.roles?.includes('platform-admin'));
assert.equal(claims.acr,'faji-mfa','OTP authenticated token must contain the enforced ACR');
assert.ok(Number.isInteger(claims.auth_time),'admin token auth_time required');
assert.ok(Math.abs(Math.floor(Date.now()/1000)-claims.auth_time)<=300,'MFA authentication must be recent');
console.log('PASS: real Keycloak administrator password plus TOTP, PKCE and privileged signed claims');

const combined=spawnSync('corepack',['pnpm','--filter','@faji/api','exec','tsx','test/keycloak-http-acceptance.ts'],{
 env:process.env,input:JSON.stringify({token:tokens.access_token,subject:claims.sub}),
 encoding:'utf8',maxBuffer:1024*1024,timeout:120000
});
if(combined.status!==0)throw Error('Live privileged JWT-to-PostgreSQL API acceptance failed (exit '+String(combined.status)+'): '+String(combined.stderr??'').slice(0,1000));
assert.match(combined.stdout,/PASS: real Keycloak-signed OTP bearer authorizes API approval/);
console.log('PASS: Keycloak-signed admin OTP token verified by NestJS and PostgreSQL account state');

