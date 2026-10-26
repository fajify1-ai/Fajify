#!/usr/bin/env bash
# Offline Keycloak realm policy gate; no runtime, Docker or external databases.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
node <<'NODE'
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=JSON.parse(fs.readFileSync('infrastructure/keycloak/realm-faji-m2.json','utf8'));
assert.equal(r.realm,'faji');
assert.equal(r.verifyEmail,true);
assert.equal(r.resetPasswordAllowed,true);
assert.equal(r.bruteForceProtected,true);
assert.ok(r.accessTokenLifespan<=300);
const ids=new Set();
const expected=new Set(['faji-customer-mobile','faji-business-mobile','faji-ride-mobile']);
for(const c of r.clients){
 assert.equal(ids.has(c.clientId),false,'duplicate client');
 ids.add(c.clientId);
 assert.equal(c.directAccessGrantsEnabled,false);
 assert.notEqual(c.implicitFlowEnabled,true);
 if(expected.has(c.clientId)){
  assert.equal(c.publicClient,true);
  assert.equal(c.standardFlowEnabled,true);
  assert.equal(c.attributes?.['pkce.code.challenge.method'],'S256');
  assert.equal(c.serviceAccountsEnabled,false);
  assert.deepEqual(c.redirectUris,[{
   'faji-customer-mobile':'com.faji.customer:/oauth/callback',
   'faji-business-mobile':'com.faji.business:/oauth/callback',
   'faji-ride-mobile':'com.faji.ride:/oauth/callback'
  }[c.clientId]]);
  assert.ok(c.protocolMappers?.some(m=>m.protocolMapper==='oidc-audience-mapper'&&m.config?.['included.client.audience']==='faji-api'&&m.config?.['access.token.claim']==='true'));
 }
}
for(const id of expected)assert.ok(ids.has(id));
assert.equal(JSON.parse(r.attributes?.['acr.loa.map']??'{}')['faji-mfa'],'1');
const admin=r.clients.find(c=>c.clientId==='faji-admin-web');
assert.ok(admin,'dedicated privileged client required');
assert.equal(admin.publicClient,true);
assert.equal(admin.standardFlowEnabled,true);
assert.equal(admin.directAccessGrantsEnabled,false);
assert.equal(admin.attributes?.['pkce.code.challenge.method'],'S256');
assert.equal(admin.authenticationFlowBindingOverrides?.browser,'faji-admin-browser');
const flow=r.authenticationFlows?.find(f=>f.alias==='faji-admin-browser');
assert.ok(flow,'privileged authentication flow missing');
const mandatory=flow.authenticationExecutions?.filter(e=>e.requirement==='REQUIRED').map(e=>e.authenticator);
assert.ok(mandatory?.includes('auth-username-password-form'));
assert.ok(mandatory?.includes('auth-otp-form'));
assert.ok(!flow.authenticationExecutions?.some(e=>e.authenticator==='auth-cookie'), 'cookie-only MFA bypass');

console.log('PASS: Keycloak M2 realm policy invariants');
NODE
