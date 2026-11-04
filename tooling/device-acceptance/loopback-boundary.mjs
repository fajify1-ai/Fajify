import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import https from 'node:https';
import {resolve} from 'node:path';
import {transport} from './transport.mjs';
const state=resolve(process.argv[2]);const c=JSON.parse(readFileSync(state+'/state.json'));
assert.ok(transport(c,state).localVm);
const env={...process.env};delete env.NODE_EXTRA_CA_CERTS;
const untrusted=spawnSync(process.execPath,['--input-type=module','-e',
 `try {await fetch(${JSON.stringify(c.origin+'/realms/faji/.well-known/openid-configuration')});process.exit(1)}catch(e){if(!['UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(e.cause?.code))process.exit(2)}`],{env,encoding:'utf8'});
assert.equal(untrusted.status,0,'server must fail TLS without explicit run CA');
await new Promise((resolve,reject)=>{
 const request=https.get({hostname:'127.0.0.1',port:c.ports.admin,path:'/realms/faji/.well-known/openid-configuration',
  servername:'wrong.invalid',ca:readFileSync(state+'/ca.pem'),rejectUnauthorized:true},response=>{response.resume();reject(Error('Wrong TLS hostname accepted'))});
 request.on('error',error=>{try{assert.equal(error.code,'ERR_TLS_CERT_ALTNAME_INVALID');resolve()}catch(e){reject(e)}});
});
const managed=new Set([...Object.values(c.ports),7800]);
const found=new Set();
for (const file of ['/proc/net/tcp','/proc/net/tcp6']) {
 for (const line of readFileSync(file,'utf8').trim().split('\n').slice(1)) {
  const fields=line.trim().split(/\s+/);
  if(fields[3]!=='0A')continue;
  const [address,hexPort]=fields[1].split(':');
  const port=Number.parseInt(hexPort,16);
  if(!managed.has(port))continue;
  found.add(port);
  assert.ok(['0100007F','00000000000000000000000001000000','0000000000000000FFFF00000100007F'].includes(address),'Managed listener must be loopback: port '+port+', address '+address);
 }
}
for(const port of Object.values(c.ports))assert.ok(found.has(port),'Expected managed listener missing');
const {Pool}=createRequire(new URL('../../apps/api/package.json',import.meta.url))('pg');
const pool=new Pool({host:'127.0.0.1',port:c.ports.appdb,user:'faji_device_runtime',password:c.passwords.runtime,database:c.database,
 ssl:{rejectUnauthorized:true,ca:readFileSync(state+'/ca.pem')}});
try{
 const ssl=await pool.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()');assert.equal(ssl.rows[0].ssl,true);
 const role=await pool.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
 assert.deepEqual(role.rows[0],{rolsuper:false,rolcreatedb:false,rolcreaterole:false});
 await assert.rejects(()=>pool.query('CREATE TABLE public.acceptance_forbidden_ddl(id int)'),{code:'42501'});
 console.log('PASS: untrusted CA rejected, wrong TLS hostname rejected, all server listeners loopback, database TLS active, runtime superuser/role creation/DDL denied');
}finally{await pool.end()}
