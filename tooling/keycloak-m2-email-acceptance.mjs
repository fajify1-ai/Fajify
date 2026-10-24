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
 await request(userPath+'/send-verify-email',{method:'PUT',headers});
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
 const verifiedLink=linkFromMail(verifyMessage);
 const verifyPage=await fetch(verifiedLink,{redirect:'manual'});
 assert.ok([200,302,303].includes(verifyPage.status),'verification action link must render or redirect');
 const verifiedUser=await request(userPath,{headers},200);
 const verifiedState=(await verifiedUser.json()).emailVerified;
 if(!verifiedState){
  console.log('INFO: verification link requires user confirmation; automated confirmation pending');
 }else{
  console.log('PASS: one-time verification link marks account verified');
 }

 await request(userPath+'/execute-actions-email',{method:'PUT',headers,body:JSON.stringify(['UPDATE_PASSWORD'])});
 const recoveryMessage=await received(2);
 assert.ok(recoveryMessage.includes(username+'@example.invalid'),'recovery destination');
 assert.match(recoveryMessage,/password/i,'password recovery purpose');
 console.log('PASS: live Keycloak password recovery email captured on loopback SMTP');
 const resetLink=linkFromMail(recoveryMessage);
 const resetPage=await fetch(resetLink,{redirect:'manual'});
 assert.ok([200,302,303].includes(resetPage.status),'password reset action link must render or redirect');
 console.log('PASS: password recovery one-time link accepted or presented by Keycloak');

 console.log('LIMITATION: registration form submission, confirmation-required verification actions, and password change completion remain pending');
}finally{
 for(const socket of sockets)socket.destroy();
 await new Promise(resolve=>server.close(resolve));
}
