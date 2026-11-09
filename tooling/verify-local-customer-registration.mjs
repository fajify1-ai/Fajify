// Disposable live local probe. Generated passwords/tokens are never printed.
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(resolve('apps/api/package.json'));
const {Pool}=require('pg');
const issuer=process.env.KEYCLOAK_ISSUER;
const db=new URL(process.env.FAJI_DATABASE_URL);
if(issuer!=='https://localhost:8443/realms/fajify'||!['localhost','127.0.0.1'].includes(db.hostname)||db.port!=='5433'||db.pathname!=='/faji_dev')throw Error('Local development settings required');
const ca=readFileSync('infrastructure/certs/fajify-rootCA.crt');
const username=`registration_probe_${randomBytes(6).toString('hex')}`;
const password=`Fp!9${randomBytes(18).toString('hex')}`;
let subject;
function send(url,method='GET',body,token,form=false){return new Promise((done,reject)=>{
 const data=body===undefined?undefined:form?new URLSearchParams(body).toString():JSON.stringify(body);
 const req=https.request(url,{method,ca,headers:{...(data?{'content-type':form?'application/x-www-form-urlencoded':'application/json','content-length':Buffer.byteLength(data)}:{}),...(token?{authorization:`Bearer ${token}`}:{})}},res=>{
  let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{let value;try{value=text?JSON.parse(text):null;}catch{}done({status:res.statusCode,value});});
 });req.setTimeout(15000,()=>req.destroy(new Error('Local registration probe timed out')));req.on('error',()=>reject(new Error('Local registration probe connection failed')));req.end(data);
});}
const tokenBody={grant_type:'password',client_id:'faji-customer-mobile',scope:'openid email',username,password};
try{
 if(!process.argv.includes('--cleanup-only')) {
 const registration=await send('https://localhost:3443/api/v1/auth/register','POST',{fullName:process.argv.includes('--single-name')?'Registration':'Registration Probe',username,email:`${username}@example.invalid`,phone:'+2348012345678',dateOfBirth:'1998-01-02',homeAddress:'Local test address, Lagos',password,termsAccepted:true});
 if(registration.status!==201)throw Error(`Registration returned HTTP ${registration.status}`);
 const admin=await send(issuer+'/protocol/openid-connect/token','POST',{grant_type:'client_credentials',client_id:process.env.KEYCLOAK_REGISTRATION_CLIENT_ID,client_secret:process.env.KEYCLOAK_REGISTRATION_CLIENT_SECRET},undefined,true);
 const found=await send('https://localhost:8443/admin/realms/fajify/users?email='+encodeURIComponent(username+'@example.invalid')+'&exact=true','GET',undefined,admin.value.access_token);
 const createdUser=found.value?.find(u=>u.email===username+'@example.invalid');
 if(createdUser){subject=createdUser.id;const credentials=await send('https://localhost:8443/admin/realms/fajify/users/'+subject+'/credentials','GET',undefined,admin.value.access_token);if(createdUser.username!==username||!createdUser.enabled||!credentials.value?.some(c=>c.type==='password'))throw Error('Local registration identity policy mismatch');}
 const login=await send(`${issuer}/protocol/openid-connect/token`,'POST',tokenBody,undefined,true);
 if(login.status!==200){ const code=['invalid_grant','invalid_client','unauthorized_client'].includes(login.value?.error)?login.value.error:'unexpected'; const description=['Invalid user credentials','Account disabled','Account is not fully set up'].includes(login.value?.error_description)?login.value.error_description:'redacted'; throw Error(`New-customer login returned HTTP ${login.status}: ${code}, ${description}`); }
 const user=await send(`${issuer}/protocol/openid-connect/userinfo`,'GET',undefined,login.value.access_token);
 subject=user.value?.sub;
 if(typeof subject!=='string')throw Error('New customer subject missing');
 const me=await send('https://localhost:3443/api/v1/auth/me','GET',undefined,login.value.access_token);
 if(me.status!==200||me.value.subject!==subject||!me.value.roles.includes('customer'))throw Error(`Customer access check returned HTTP ${me.status}`);
 const duplicate=await send('https://localhost:3443/api/v1/auth/register','POST',{fullName:'Registration Probe',username,email:`${username}@example.invalid`,phone:'+2348012345678',dateOfBirth:'1998-01-02',homeAddress:'Local test address, Lagos',password,termsAccepted:true});
 if(duplicate.status!==409)throw Error(`Duplicate protection returned HTTP ${duplicate.status}`);
 console.log(JSON.stringify({registration:201,passwordSignIn:200,customerAccess:200,duplicate:409,emailVerified:user.value.email_verified===true}));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 try{
  const auth=await send(`${issuer}/protocol/openid-connect/token`,'POST',{grant_type:'client_credentials',client_id:process.env.KEYCLOAK_REGISTRATION_CLIENT_ID,client_secret:process.env.KEYCLOAK_REGISTRATION_CLIENT_SECRET},undefined,true);
  const root='https://localhost:8443/admin/realms/fajify';
  const found=await send(root+'/users?search=registration_probe_&max=100','GET',undefined,auth.value?.access_token);
  if(found.status!==200||!Array.isArray(found.value))throw Error('Probe cleanup lookup failed');
  const targets=found.value.filter(u=>/^registration_probe_[0-9a-f]{12,20}@example\.invalid$/.test(u.email??'')&&u.firstName==='Registration'&&['','Probe'].includes(u.lastName??''));
  const pool=new Pool({connectionString:db.toString(),connectionTimeoutMillis:5000});
  try{for(const target of targets){
   const deleted=await send(root+'/users/'+target.id,'DELETE',undefined,auth.value?.access_token);
   if(deleted.status!==204)throw Error('Probe identity cleanup failed');
   await pool.query('DELETE FROM account_access WHERE identity_subject=$1',[target.id]);
   await pool.query('DELETE FROM user_profiles WHERE identity_subject=$1',[target.id]);
  }
  // Restore the local loopback test budget after probes, not any deployed limit.
  const buckets=['127.0.0.1','::1','::ffff:127.0.0.1'].map(ip=>createHash('sha256').update(ip).digest('hex'));
  await pool.query('DELETE FROM customer_registration_limits WHERE bucket_hash=ANY($1::varchar[])',[buckets]);
  }finally{await pool.end();}
  console.log('Disposable registration probe cleaned up.');
 }catch{console.error('Probe cleanup requires attention; no credentials printed.');process.exitCode=1;}
}
