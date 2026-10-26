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
const credential={type:'otp',userLabel:'disposable-otp',
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
function totp(){
 const counter=Math.floor(Date.now()/1000/30);
 const num=Buffer.alloc(8);num.writeBigUInt64BE(BigInt(counter));
 const mac=createHmac('sha1',seed).update(num).digest();
 const i=mac[mac.length-1]&15;
 return (((mac.readUInt32BE(i)&0x7fffffff)%1000000)+'').padStart(6,'0');
}
response=await fetch(otpAction,{method:'POST',redirect:'manual',
 headers:{'content-type':'application/x-www-form-urlencoded',cookie:cookie()},
 body:form({[otpField]:totp()})});
collect(response);
step=await settle(response);
assert.ok(step.callback,'valid TOTP login must reach admin callback');
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

