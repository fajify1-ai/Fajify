// Local-only bootstrap: no credentials are printed or copied into Flutter.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import https from 'node:https';
import {resolve} from 'node:path';

const docker=resolve(process.env.LOCALAPPDATA,'Programs/DockerDesktop/resources/bin/docker.exe');
const ca=readFileSync('infrastructure/certs/fajify-rootCA.crt');
async function request(path,method='GET',body,token,form=false){
 const data=body===undefined?undefined:form?new URLSearchParams(body).toString():JSON.stringify(body);
 return new Promise((done,reject)=>{
  const req=https.request(`https://localhost:8443${path}`,{ca,method,headers:{
   ...(data?{'content-type':form?'application/x-www-form-urlencoded':'application/json','content-length':Buffer.byteLength(data)}:{}),
   ...(token?{authorization:`Bearer ${token}`}:{})}},response=>{
   let text='';response.on('data',chunk=>{text+=chunk;if(text.length>1048576)req.destroy();});
   response.on('end',()=>{
    if(response.statusCode<200||response.statusCode>=300)return reject(new Error(`Local identity setup failed (HTTP ${response.statusCode})`));
    try{done(text?JSON.parse(text):null);}catch{reject(new Error('Invalid identity setup response'));}
   });
  });
  req.setTimeout(15000,()=>req.destroy(new Error('Local identity setup timed out')));
  req.on('error',()=>reject(new Error('Local identity setup connection failed')));
  req.end(data);
 });
}

try{
 const password=execFileSync(docker,['exec','docker-keycloak-1','printenv','KC_BOOTSTRAP_ADMIN_PASSWORD'],{encoding:'utf8'}).trim();
 const auth=await request('/realms/master/protocol/openid-connect/token','POST',
  {grant_type:'password',client_id:'admin-cli',username:'admin',password},undefined,true);
 const token=auth.access_token;
 const root='/admin/realms/fajify';
 const realm=await request(root,'GET',undefined,token);
 if(realm.registrationEmailAsUsername){
  await request(root,'PUT',{registrationEmailAsUsername:false,loginWithEmailAllowed:true},token);
  console.log('Local realm accepts separate usernames and email sign-in.');
 }
 const profile=await request(root+'/users/profile','GET',undefined,token);
 const lastName=profile.attributes?.find(attribute=>attribute.name==='lastName');
 if(lastName?.required){
  delete lastName.required;
  await request(root+'/users/profile','PUT',profile,token);
  console.log('Local identity profile accepts the app full-name field without a separate required surname.');
 }
 const clientId='faji-customer-registration';
 let clients=await request(`${root}/clients?clientId=${clientId}`,'GET',undefined,token);
 if(!clients.length){
  await request(`${root}/clients`,'POST',{clientId,enabled:true,protocol:'openid-connect',publicClient:false,
   serviceAccountsEnabled:true,standardFlowEnabled:false,directAccessGrantsEnabled:false,
   implicitFlowEnabled:false,secret:randomBytes(32).toString('hex')},token);
  clients=await request(`${root}/clients?clientId=${clientId}`,'GET',undefined,token);
 }
 if(clients.length!==1||clients[0].publicClient||!clients[0].serviceAccountsEnabled)throw new Error('Unexpected registration client configuration');
 const client=clients[0];
 const account=await request(`${root}/clients/${client.id}/service-account-user`,'GET',undefined,token);
 const management=(await request(`${root}/clients?clientId=realm-management`,'GET',undefined,token))[0];
 const roles=await Promise.all(['manage-users','view-realm'].map(name=>request(`${root}/clients/${management.id}/roles/${name}`,'GET',undefined,token)));
 await request(`${root}/users/${account.id}/role-mappings/clients/${management.id}`,'POST',roles,token);
 const customer=await request(`${root}/roles/customer`,'GET',undefined,token);
 await request(`${root}/users/${account.id}/role-mappings/realm`,'POST',[customer],token);
 const secret=await request(`${root}/clients/${client.id}/client-secret`,'GET',undefined,token);
 if(typeof secret.value!=='string'||!secret.value)throw new Error('Missing registration service credential');
 let env=readFileSync('.env.local','utf8');
 for(const [key,value] of Object.entries({FAJI_CUSTOMER_REGISTRATION_ENABLED:'true',KEYCLOAK_REGISTRATION_CLIENT_ID:clientId,KEYCLOAK_REGISTRATION_CLIENT_SECRET:secret.value})){
  const pattern=new RegExp(`^${key}=.*$`,'m');
  env=pattern.test(env)?env.replace(pattern,`${key}=${value}`):`${env}\n${key}=${value}\n`;
 }
 writeFileSync('.env.local',env);
 console.log('Local customer registration configured. Server credential saved only in ignored .env.local.');
}catch(error){console.error(error.message);process.exitCode=1;}
