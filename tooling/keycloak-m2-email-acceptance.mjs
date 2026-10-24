import assert from 'node:assert/strict';
import net from 'node:net';
import {randomBytes} from 'node:crypto';

const origin=process.env.FAJI_KC_ORIGIN;
const adminPassword=process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
assert.match(origin??'',/^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(adminPassword);
const realmApi=origin+'/admin/realms/faji';
const form=p=>new URLSearchParams(p).toString();
async function request(url,opts={},expected=204){
 const res=await fetch(url,opts);
 if(res.status!==expected){
  const body=await res.json().catch(()=>({}));
  throw Error('Keycloak '+new URL(url).pathname+' HTTP '+res.status+' ('+String(body.error??'unknown')+')');
 }
 return res;
}
const auth=await fetch(origin+'/realms/master/protocol/openid-connect/token',{
 method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
 body:form({grant_type:'password',client_id:'admin-cli',username:'m2_acceptance_admin',password:adminPassword})
});
assert.equal(auth.status,200,'bootstrap admin token');
const access=(await auth.json()).access_token;
const headers={authorization:'Bearer '+access,'content-type':'application/json'};
const messages=[];
let sockets=new Set();
const server=net.createServer(socket=>{
 sockets.add(socket);socket.setEncoding('utf8');
 socket.on('close',()=>sockets.delete(socket));
 socket.write('220 fajify-disposable.local ESMTP\r\n');
 let buffer='',dataMode=false,data=[];
 socket.on('data',chunk=>{
  buffer+=chunk;
  while(buffer.includes('\n')){
   const index=buffer.indexOf('\n');
   const line=buffer.slice(0,index).replace(/\r$/,'');buffer=buffer.slice(index+1);
   if(dataMode){
    if(line==='.'){messages.push(data.join('\n'));data=[];dataMode=false;socket.write('250 2.0.0 queued\r\n');}
    else data.push(line.startsWith('..')?line.slice(1):line);
   }else if(/^EHLO\b/i.test(line)){
    socket.write('250-fajify-disposable.local\r\n250 SIZE 1048576\r\n');
   }else if(/^HELO\b/i.test(line)||/^MAIL FROM:/i.test(line)||/^RCPT TO:/i.test(line)||/^RSET\b/i.test(line)){
    socket.write('250 2.1.0 OK\r\n');
   }else if(/^DATA\b/i.test(line)){
    dataMode=true;socket.write('354 End data with <CRLF>.<CRLF>\r\n');
   }else if(/^QUIT\b/i.test(line)){
    socket.end('221 2.0.0 bye\r\n');
   }else socket.write('500 unsupported SMTP command\r\n');
  }
 });
});
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const address=server.address();
 assert.ok(address&&typeof address!=='string');
 const realmResponse=await request(realmApi,{headers},200);
 const representation=await realmResponse.json();
 assert.equal(representation.verifyEmail,true,'realm must still enforce verified email');
 assert.equal(representation.registrationAllowed,true,'realm must allow registration');
 assert.equal(representation.resetPasswordAllowed,true,'realm must allow password recovery');
 const updated={...representation,smtpServer:{host:'127.0.0.1',port:String(address.port),from:'no-reply@fajify.test',fromDisplayName:'Fajify Test',ssl:'false',starttls:'false',auth:'false'}};
 await request(realmApi,{method:'PUT',headers,body:JSON.stringify(updated)});
 console.log('PASS: live registration, verification and recovery policies enabled');
 const username='email_acceptance_'+randomBytes(8).toString('hex');
 const response=await request(realmApi+'/users',{method:'POST',headers,
  body:JSON.stringify({username,email:username+'@example.invalid',firstName:'Faji',lastName:'Email Test',
   enabled:true,emailVerified:false,requiredActions:[]})},201);
 const id=response.headers.get('location')?.split('/').pop();
 assert.ok(id,'synthetic user ID required');
 const user=await request(realmApi+'/users/'+encodeURIComponent(id),{headers},200);
 assert.equal((await user.json()).emailVerified,false);
 const userPath=realmApi+'/users/'+encodeURIComponent(id);
 const previousPassword='Aa1!'+randomBytes(20).toString('base64url');
 await request(userPath+'/reset-password',{method:'PUT',headers,body:JSON.stringify({
  type:'password',value:previousPassword,temporary:false
 })});
 const mobileClient='faji-customer-mobile';
 const mobileRedirect='com.faji.customer:/oauth/callback';
 const actionParams=new URLSearchParams({client_id:mobileClient,redirect_uri:mobileRedirect});
 await request(userPath+'/send-verify-email?'+actionParams,{method:'PUT',headers});
 async function received(count){
  for(let t=0;t<100;t++){
   if(messages.length>=count)return messages[count-1];
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('SMTP capture timed out waiting for email '+count);
 }
 const verifyMessage=await received(1);
 assert.ok(verifyMessage.includes(username+'@example.invalid'),'verification destination');
 assert.match(verifyMessage,/verify|confirm/i,'verification email purpose');
 console.log('PASS: live Keycloak verification email captured on loopback SMTP');
 const linkFromMail=(raw)=>{
  // Keycloak MIME may use quoted-printable soft breaks and HTML-escaped query separators.
  const decoded=raw.replace(/=\r?\n/g,'').replace(/=3D/gi,'=').replace(/&amp;/g,'&');
  const candidates=[...decoded.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>m[0].replace(/[).,]+$/,''));
  const found=candidates.find(u=>{try{const x=new URL(u);return x.origin===origin&&x.pathname.startsWith('/realms/faji/login-actions/action-token');}catch{return false;}});
  assert.ok(found,'Keycloak email action-token URL not found (message content is not logged)');
  return found;
 };
 // Do not print one-time action links or token-bearing Location headers.
 const cookieJar=new Map();
 const captureCookies=res=>{
  for(const cookie of res.headers.getSetCookie?.()??[]){
   const first=cookie.split(';',1)[0],idx=first.indexOf('=');
   if(idx>0)cookieJar.set(first.slice(0,idx),first.slice(idx+1));
  }
 };
 const cookieHeader=()=>[...cookieJar].map(([k,v])=>k+'='+v).join('; ');
 const safeUrl=value=>{
  const u=new URL(value,origin);
  assert.equal(u.origin,origin,'email flow must remain on temporary local Keycloak');
  assert.ok(u.pathname.startsWith('/realms/faji/'),'email flow must remain in faji realm');
  return u;
 };
 async function followAction(url){
  let res=await fetch(safeUrl(url),{redirect:'manual',headers:{cookie:cookieHeader()}});
  captureCookies(res);
  for(let i=0;i<8&&[301,302,303,307,308].includes(res.status);i++){
   const location=res.headers.get('location');
   assert.ok(location,'redirect Location required');
   const dest=new URL(location,origin);
   if(dest.protocol!=='http:')return {response:res,external:true};
   res=await fetch(safeUrl(dest),{redirect:'manual',headers:{cookie:cookieHeader()}});
   captureCookies(res);
  }
  return {response:res,external:false};
 }
 const htmlForm=html=>{
  const candidates=[...html.matchAll(/<form\b([^>]*)>/gi)].map(x=>x[1]);
  const candidate=candidates.find(t=>/\baction=["'][^"']*login-actions\//i.test(t));
  assert.ok(candidate,'Keycloak required-action form not found');
  const url=candidate.match(/\baction=["']([^"']+)["']/i)?.[1];
  assert.ok(url,'Keycloak action URL missing');
  return safeUrl(url.replaceAll('&amp;','&'));
 };
 const verifiedLink=linkFromMail(verifyMessage);
 let verification=await followAction(verifiedLink);
 if(verification.response.status===200){
  const html=await verification.response.text();
  const signals=['verify-email','confirm','proceed','restart','error','login'].filter(tag=>html.toLowerCase().includes(tag));
  console.log('INFO: verification page signals: '+signals.join(', '));
  // Keycloak's action-token interstitial commonly presents a "Click here to proceed"
  // anchor rather than a form. Follow only same-origin realm links, never raw
  // arbitrary hrefs, and never log one-time action tokens.
  const proceedAnchors=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(match=>({
   attrs:match[1],label:match[2].replace(/<[^>]*>/g,'').trim().toLowerCase()
  }));
  const proceed=proceedAnchors.find(a=>/proceed|confirm|continue|click here/i.test(a.label) &&
    /\bhref=["'][^"']*login-actions\//i.test(a.attrs));
  console.log('INFO: verification interstitial forms '+[...html.matchAll(/<form\b/gi)].length+
    ', actionable proceed links '+proceedAnchors.filter(a=>/login-actions\//.test(a.attrs)).length);
  if(proceed){
   const href=proceed.attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
   assert.ok(href,'proceed link must have href');
   verification=await followAction(safeUrl(href.replaceAll('&amp;','&')));
   console.log('INFO: followed confirmation proceed link, final HTTP '+verification.response.status);
  }
  // Keycloak 26 typically requires a deliberate confirmation POST rather than
  // accepting an action-token GET as a completed verification.
  if(/<form\b/i.test(html)&&/login-actions\//.test(html)){
   const names=[...html.matchAll(/<(?:input|button)\b[^>]*\bname=["']([^"']+)["']/gi)].map(x=>x[1]).filter(x=>/^(submitAction|confirm|cancel|credentialId|username|password|firstName|lastName|email)$/.test(x));
   console.log('INFO: verification action form fields: '+[...new Set(names)].join(', '));
   const action=htmlForm(html);
   const res=await fetch(action,{method:'POST',redirect:'manual',headers:{
    'content-type':'application/x-www-form-urlencoded',cookie:cookieHeader()
   },body:form({submitAction:'Confirm'})});
   captureCookies(res);
   if([301,302,303,307,308].includes(res.status)){
    const target=res.headers.get('location');
    if(target){const next=new URL(target,origin);if(next.protocol==='http:')verification=await followAction(next);}
   }
  }
 }
 const verifiedUser=await request(userPath,{headers},200);
 const verified=(await verifiedUser.json()).emailVerified;
 if(!verified){
  const status=verification.response.status;
  const pagePath=verification.external?'external-redirect':'local-Keycloak-page';
  throw Error('Email verification not completed: final HTTP '+status+', destination '+pagePath+'. Inspect non-sensitive page signals above; no administrative bypass performed.');
 }
 console.log('PASS: one-time verification link and confirmation mark account verified');

 await request(userPath+'/execute-actions-email?'+actionParams,{method:'PUT',headers,body:JSON.stringify(['UPDATE_PASSWORD'])});
 const recoveryMessage=await received(2);
 assert.ok(recoveryMessage.includes(username+'@example.invalid'),'recovery destination');
 assert.match(recoveryMessage,/password/i,'password recovery purpose');
 console.log('PASS: live Keycloak password recovery email captured on loopback SMTP');
 const resetLink=linkFromMail(recoveryMessage);
 let reset=await followAction(resetLink);
 assert.equal(reset.response.status,200,'password recovery page must render');
 let resetHtml=await reset.response.text();
 if(!/password-new|password-confirm/i.test(resetHtml)){
  const links=[...resetHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(x=>({
   attrs:x[1],label:x[2].replace(/<[^>]*>/g,'').trim().toLowerCase()
  }));
  const proceed=links.find(a=>/proceed|continue|click here|confirm/i.test(a.label)&&/\bhref=["'][^"']*login-actions\//i.test(a.attrs));
  console.log('INFO: password recovery intermediate page: forms '+[...resetHtml.matchAll(/<form\b/gi)].length+', proceed link '+Boolean(proceed));
  assert.ok(proceed,'password recovery requires action not recognized by test harness');
  const href=proceed.attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
  assert.ok(href,'recovery proceed link missing');
  reset=await followAction(safeUrl(href.replaceAll('&amp;','&')));
  assert.equal(reset.response.status,200,'password recovery form after proceed');
  resetHtml=await reset.response.text();
 }
 const action=htmlForm(resetHtml);
 assert.match(resetHtml,/password-new|password-confirm/i,'password update form must be shown');
 const updatedPassword='Aa1!'+randomBytes(20).toString('base64url');
 const update=await fetch(action,{method:'POST',redirect:'manual',headers:{
  'content-type':'application/x-www-form-urlencoded',cookie:cookieHeader()
 },body:form({'password-new':updatedPassword,'password-confirm':updatedPassword})});
 captureCookies(update);
 const updateBody=update.status===200?await update.text():'';
 if(update.status===200){
  const names=[...updateBody.matchAll(/<(?:input|button)\\b[^>]*\\bname=["']([^"']+)["']/gi)].map(x=>x[1]);
  const signals=['password-new','password-confirm','alert-error','kc-feedback-text','error','success','confirm'].filter(v=>updateBody.toLowerCase().includes(v));
  console.log('INFO: password update response HTTP 200, input fields '+[...new Set(names)].filter(x=>/password|submit|credential/i.test(x)).join(', ')+', page signals '+signals.join(', '));
 }else console.log('INFO: password update response HTTP '+update.status);
 assert.ok([200,302,303].includes(update.status),'unexpected password action response');
 const updatedUser=await request(userPath,{headers},200);
 const remainingActions=(await updatedUser.json()).requiredActions??[];
 if(remainingActions.includes('UPDATE_PASSWORD'))throw Error('Password recovery did not complete: UPDATE_PASSWORD remains required');
 // Verify credentials using independent browser Authorization Code flows.
 // Public mobile clients retain PKCE and have no direct password grant.
 async function loginResult(candidatePassword){
  const verifier=randomBytes(32).toString('base64url');
  const {createHash}=await import('node:crypto');
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  const authUrl=new URL(origin+'/realms/faji/protocol/openid-connect/auth');
  for(const [key,value] of Object.entries({
   client_id:mobileClient,redirect_uri:mobileRedirect,response_type:'code',scope:'openid',
   state:randomBytes(12).toString('hex'),code_challenge:challenge,code_challenge_method:'S256'
  }))authUrl.searchParams.set(key,value);
  const jar=new Map();
  const save=res=>{for(const cookie of res.headers.getSetCookie?.()??[]){
   const part=cookie.split(';',1)[0],i=part.indexOf('=');if(i>0)jar.set(part.slice(0,i),part.slice(i+1));
  }};
  const cookies=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
  let res=await fetch(authUrl,{redirect:'manual'});save(res);
  for(let i=0;i<6&&[301,302,303].includes(res.status);i++){
   const target=new URL(res.headers.get('location'),origin);
   assert.equal(target.origin,origin);
   res=await fetch(target,{redirect:'manual',headers:{cookie:cookies()}});save(res);
  }
  assert.equal(res.status,200,'login challenge must render');
  const page=await res.text();
  const forms=[...page.matchAll(/<form\b([^>]*)>/gi)].map(m=>m[1]);
  const loginForm=forms.find(v=>v.includes('kc-form-login'))??forms.find(v=>v.includes('login-actions/authenticate'));
  assert.ok(loginForm,'login form required for credential verification');
  const endpoint=loginForm.match(/action=["']([^"']+)["']/i)?.[1];
  assert.ok(endpoint);
  const actionUrl=new URL(endpoint.replaceAll('&amp;','&'),origin);
  assert.equal(actionUrl.origin,origin);
  res=await fetch(actionUrl,{method:'POST',redirect:'manual',headers:{
   'content-type':'application/x-www-form-urlencoded',cookie:cookies()
  },body:form({username,password:candidatePassword,credentialId:''})});save(res);
  for(let i=0;i<8&&[301,302,303].includes(res.status);i++){
   const dest=new URL(res.headers.get('location'),origin);
   if(dest.protocol==='com.faji.customer:')return Boolean(dest.searchParams.get('code'));
   assert.equal(dest.origin,origin,'unexpected login destination');
   res=await fetch(dest,{redirect:'manual',headers:{cookie:cookies()}});save(res);
  }
  return false;
 }
 assert.equal(await loginResult(updatedPassword),true,'new password must authenticate');
 console.log('PASS: new password authenticates through real Keycloak authorization flow');
 assert.equal(await loginResult(previousPassword),false,'previous password must be rejected after recovery');
 console.log('PASS: previous password rejected after recovery');
 console.log('PASS: password recovery action cleared and updated credentials authenticated');
 // Self-service registration: exercise the actual public HTML forms, not the admin API.
 // This is a separate synthetic user, and must initially remain unverified.
 const registerName='registered_'+randomBytes(8).toString('hex');
 const registerEmail=registerName+'@example.invalid';
 const registerPassword='Aa1!'+randomBytes(20).toString('base64url');
 const registerVerifier=randomBytes(32).toString('base64url');
 const registerChallenge=(await import('node:crypto')).createHash('sha256').update(registerVerifier).digest('base64url');
 const registerUrl=new URL(origin+'/realms/faji/protocol/openid-connect/auth');
 for(const [key,value] of Object.entries({
  client_id:mobileClient,redirect_uri:mobileRedirect,response_type:'code',scope:'openid',
  state:randomBytes(12).toString('hex'),code_challenge:registerChallenge,code_challenge_method:'S256'
 }))registerUrl.searchParams.set(key,value);
 const registrationCookies=new Map();
 const saveRegistrationCookies=res=>{
  for(const cookie of res.headers.getSetCookie?.()??[]){
   const part=cookie.split(';',1)[0],index=part.indexOf('=');
   if(index>0)registrationCookies.set(part.slice(0,index),part.slice(index+1));
  }
 };
 const registrationCookieHeader=()=>[...registrationCookies].map(([k,v])=>k+'='+v).join('; ');
 let registrationPage=await fetch(registerUrl,{redirect:'manual'});
 saveRegistrationCookies(registrationPage);
 for(let i=0;i<6&&[301,302,303].includes(registrationPage.status);i++){
  const destination=safeUrl(new URL(registrationPage.headers.get('location'),origin));
  registrationPage=await fetch(destination,{redirect:'manual',headers:{cookie:registrationCookieHeader()}});
  saveRegistrationCookies(registrationPage);
 }
 assert.equal(registrationPage.status,200,'registration entry login page must render');
 const loginHtml=await registrationPage.text();
 const registerLinks=[...loginHtml.matchAll(/<a\b([^>]*)>/gi)].map(m=>m[1]);
 const registerLink=registerLinks.map(tag=>tag.match(/href=["']([^"']+)["']/i)?.[1])
  .find(href=>href?.includes('/login-actions/registration'));
 assert.ok(registerLink,'public registration link must be available');
 registrationPage=await fetch(safeUrl(registerLink.replaceAll('&amp;','&')),{redirect:'manual',headers:{cookie:registrationCookieHeader()}});
 saveRegistrationCookies(registrationPage);
 assert.equal(registrationPage.status,200,'registration page must render');
 const registrationHtml=await registrationPage.text();
 const registerForms=[...registrationHtml.matchAll(/<form\b([^>]*)>/gi)].map(x=>x[1]);
 const registerForm=registerForms.find(t=>t.includes('login-actions/registration'))??registerForms[0];
 assert.ok(registerForm,'registration form required');
 const registerAction=registerForm.match(/action=["']([^"']+)["']/i)?.[1];
 assert.ok(registerAction,'registration form action required');
 const registrationFields=[...registrationHtml.matchAll(/<input\b([^>]*)>/gi)].map(m=>m[1]);
 const fieldNames=registrationFields.map(tag=>tag.match(/name=["']([^"']+)["']/i)?.[1]).filter(Boolean);
 for(const required of ['username','email','password','password-confirm']){
  assert.ok(fieldNames.includes(required),'registration field missing: '+required);
 }
 const registrationPayload={username:registerName,email:registerEmail,firstName:'Faji',lastName:'Registration',
  password:registerPassword,'password-confirm':registerPassword};
 const submitRegistration=await fetch(safeUrl(registerAction.replaceAll('&amp;','&')),{
  method:'POST',redirect:'manual',headers:{
   'content-type':'application/x-www-form-urlencoded',cookie:registrationCookieHeader()
  },body:form(registrationPayload)
 });
 saveRegistrationCookies(submitRegistration);
 assert.ok([200,302,303].includes(submitRegistration.status),'unexpected registration response');
 const lookup=await request(realmApi+'/users?username='+encodeURIComponent(registerName)+'&exact=true',{headers},200);
 const accounts=await lookup.json();
 assert.equal(accounts.length,1,'public signup must create exactly one Keycloak account');
 assert.equal(accounts[0].emailVerified,false,'public signup must require verified email');
 assert.equal(accounts[0].enabled,true,'new signup should be enabled at Keycloak identity layer');
 console.log('PASS: public registration HTML form creates a unique unverified Keycloak account');
 console.log('LIMITATION: privileged MFA, authoritative API-side revocation and integrated onboarding acceptance remain pending');
}finally{
 for(const socket of sockets)socket.destroy();
 await new Promise(resolve=>server.close(resolve));
}
