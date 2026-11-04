import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {transport} from './transport.mjs';
const tail={origin:'https://ubuntu.synthetic.ts.net',ports:{admin:12345}};
test('Tailscale uses ordinary public trust and rejects trust/TLS overrides',()=>{
 assert.equal(transport(tail,'/state',{}).apiOrigin,tail.origin);
 for(const env of [{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{NODE_EXTRA_CA_CERTS:'/other/root.pem'}])
  assert.throws(()=>transport(tail,'/state',env));
});
test('Loopback VM trust is bound to exact local origin, CA file and fingerprint',()=>{
 const state=mkdtempSync(tmpdir()+'/faji-transport-');const ca='synthetic public CA fixture';
 writeFileSync(state+'/ca.pem',ca);
 const c={transport:'loopback-vm',origin:'https://localhost:12345',adminOrigin:'https://localhost:12345',apiOrigin:'https://localhost:23456',caSha256:createHash('sha256').update(ca).digest('hex')};
 const env={NODE_EXTRA_CA_CERTS:state+'/ca.pem'};
 try{
  assert.ok(transport(c,state,env).localVm);
  assert.throws(()=>transport(c,state,{NODE_EXTRA_CA_CERTS:'/other.pem'}));
  assert.throws(()=>transport(c,state,{...env,NODE_TLS_REJECT_UNAUTHORIZED:'0'}));
  writeFileSync(state+'/ca.pem','replaced');assert.throws(()=>transport(c,state,env));
 }finally{rmSync(state,{recursive:true});}
});
test('VM transport cannot route tests to HTTP, remote hosts or invalid ports',()=>{
 for(const origin of ['http://localhost:1234','https://example.com:443','https://localhost:99999'])
  assert.throws(()=>transport({transport:'loopback-vm',origin,adminOrigin:origin,apiOrigin:origin},'/unused',{}));
});
test('Unknown transport and non-tailnet public origins fail closed',()=>{
 assert.throws(()=>transport({...tail,transport:'unknown'},'/unused',{}));
 assert.throws(()=>transport({...tail,origin:'https://public.example.com'},'/unused',{}));
});
