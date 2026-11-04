import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {readFileSync, writeFileSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {transport} from './transport.mjs';
import {http, json} from './http.mjs';

const [action, directory, fixtureName, operation] = process.argv.slice(2);
const state = resolve(directory ?? '');
assert.equal(statSync(state).mode & 0o077, 0, 'state must be private');
const config = JSON.parse(readFileSync(state + '/state.json', 'utf8'));
assert.equal(config.marker, 'fajify-device-acceptance-v1');
assert.match(config.database, /^fajify_m2_test_device_[a-f0-9]{12}$/);
const {localVm, origin, apiOrigin, adminOrigin} = transport(config, state);
const issuer = origin + '/realms/faji';
const {Pool} = createRequire(new URL('../../apps/api/package.json', import.meta.url))('pg');
const pool = new Pool({host: '127.0.0.1', port: config.ports.appdb, user: 'postgres',
  password: config.passwords.app, database: config.database, max: 2,
  ...(localVm ? {ssl: {rejectUnauthorized: true, ca: readFileSync(state + '/ca.pem')}} : {})});
const save = (name, object) => writeFileSync(state + '/' + name, JSON.stringify(object, null, 2) + '\n', {mode: 0o600});
const formHeaders = {'content-type': 'application/x-www-form-urlencoded'};
const businesses = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
async function admin() {
  const token = await json(adminOrigin + '/realms/master/protocol/openid-connect/token', {
    method: 'POST', headers: formHeaders, body: new URLSearchParams({grant_type: 'password',
      client_id: 'admin-cli', username: 'device_admin', password: config.passwords.admin})});
  // Only bootstrap admin-cli uses the password grant; native clients never do.
  return (path, options = {}, status = 200) => json(adminOrigin + '/admin/realms/faji' + path, {
    ...options, headers: {authorization: 'Bearer ' + token.access_token, 'content-type': 'application/json'}}, status);
}
async function seed() {
  const api = await admin();
  const defaults = await api('/roles/default-roles-faji/composites');
  for (const elevated of ['merchant', 'driver', 'dispatcher', 'platform-admin'])
    assert.ok(!defaults.some(role => role.name === elevated));
  if (!defaults.some(role => role.name === 'customer'))
    await api('/roles/default-roles-faji/composites', {method: 'POST', body: JSON.stringify([await api('/roles/customer')])}, 204);
  // Preserve the privileged realm's required OTP binding even though mobile acceptance uses no admin user.
  const flows = await api('/authentication/flows');
  const flow = flows.find(value => value.alias === 'faji-admin-browser');
  assert.ok(flow?.id);
  const [adminClient] = await api('/clients?clientId=faji-admin-web');
  await api('/clients/' + adminClient.id, {method: 'PUT', body: JSON.stringify({...adminClient,
    authenticationFlowBindingOverrides: {browser: flow.id}})}, 204);
  const fixtures = {};
  for (const name of ['customer', 'merchantA', 'merchantB', 'nonmember', 'suspended']) {
    const password = 'Aa1!' + randomBytes(24).toString('base64url');
    const username = 'device_' + name.toLowerCase();
    await api('/users', {method: 'POST', body: JSON.stringify({username, firstName: 'Synthetic', lastName: name,
      email: username + '@example.invalid', enabled: true, emailVerified: true, requiredActions: [],
      credentials: [{type: 'password', value: password, temporary: false}]})}, 201);
    const [user] = await api('/users?username=' + username + '&exact=true');
    assert.ok(user?.id);
    if (name.startsWith('merchant') || name === 'nonmember')
      await api('/users/' + user.id + '/role-mappings/realm', {method: 'POST', body: JSON.stringify([await api('/roles/merchant')])}, 204);
    fixtures[name] = {username, password, subject: user.id};
    await pool.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,$2)', [user.id, name === 'suspended']);
    await pool.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,$2)', [user.id, name === 'suspended']);
  }
  for (const [index, name] of ['merchantA', 'merchantB'].entries()) {
    await pool.query("INSERT INTO business_onboarding(id,applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,$2,$3,'approved','synthetic-acceptance',now())", [businesses[index], fixtures[name].subject, 'Synthetic ' + name]);
    await pool.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role) VALUES($1,'business',$2,'owner')", [fixtures[name].subject, businesses[index]]);
  }
  save('fixtures.json', fixtures);
  console.log('PASS: synthetic identities, default role, privileged OTP binding and isolated application fixtures provisioned; credentials in private fixtures.json');
}

async function authorize(clientId, user, proof = 'S256') {
  const scheme = clientId === 'faji-customer-mobile' ? 'com.faji.customer' : 'com.faji.business';
  const redirect = scheme + ':/oauth/callback';
  const verifier = randomBytes(32).toString('base64url');
  const stateValue = randomBytes(24).toString('hex');
  const url = new URL(issuer + '/protocol/openid-connect/auth');
  const params = new URLSearchParams({client_id: clientId, redirect_uri: redirect, response_type: 'code',
    scope: 'openid profile email', state: stateValue, nonce: randomBytes(24).toString('hex')});
  if (proof !== 'missing') {
    params.set('code_challenge', proof === 'plain' ? verifier : createHash('sha256').update(verifier).digest('base64url'));
    params.set('code_challenge_method', proof);
  }
  url.search = params;
  const cookies = new Map();
  function capture(response) {
    for (const entry of response.headers.getSetCookie()) {
      const [first] = entry.split(';'); const index = first.indexOf('=');
      cookies.set(first.slice(0, index), first.slice(index + 1));
    }
  }
  const cookie = () => [...cookies].map(([key, value]) => key + '=' + value).join('; ');
  const safe = target => {
    const parsed = new URL(target, origin);
    assert.equal(parsed.origin, origin, 'OIDC form/redirect origin must remain private HTTPS');
    assert.ok(parsed.pathname.startsWith('/realms/faji/'));
    return parsed;
  };
  let response = await http(url); capture(response);
  for (let step = 0; step < 8 && [302,303].includes(response.status); step++) {
    response = await http(safe(response.headers.get('location')), {headers: {cookie: cookie()}}); capture(response);
  }
  if (response.status === 400) return {rejected: true};
  assert.equal(response.status, 200, 'login form');
  const html = await response.text();
  const tag = [...html.matchAll(/<form\b([^>]*)>/gi)].map(match => match[1]).find(value => /id=["']kc-form-login["']/.test(value));
  assert.ok(tag, 'real Keycloak login form required');
  const loginAction = tag.match(/action=["']([^"']+)["']/)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(loginAction);
  response = await http(safe(loginAction), {method: 'POST', headers: {...formHeaders, cookie: cookie()},
    body: new URLSearchParams({username: user.username, password: user.password, credentialId: ''})}); capture(response);
  let callback;
  for (let step = 0; step < 8; step++) {
    assert.ok([302,303].includes(response.status), 'login must reach callback without pending actions');
    callback = new URL(response.headers.get('location'), origin);
    if (callback.protocol === scheme + ':') break;
    response = await http(safe(callback), {headers: {cookie: cookie()}}); capture(response);
  }
  assert.equal(callback.origin, 'null');
  assert.equal(callback.protocol, scheme + ':');
  assert.equal(callback.pathname, '/oauth/callback');
  assert.equal(callback.searchParams.get('state'), stateValue);
  assert.ok(callback.searchParams.get('code'));
  return {code: callback.searchParams.get('code'), verifier, redirect, clientId};
}
const exchange = (grant, verifier = grant.verifier) => {
  const params = new URLSearchParams({grant_type: 'authorization_code', client_id: grant.clientId,
    redirect_uri: grant.redirect, code: grant.code});
  if (verifier !== null) params.set('code_verifier', verifier);
  return http(issuer + '/protocol/openid-connect/token', {method: 'POST', headers: formHeaders, body: params});
};
const bearer = token => ({authorization: 'Bearer ' + token});
async function apiStatus(path, token, status, method = 'GET') {
  const response = await http(apiOrigin + '/api/v1/' + path, {method, headers: token ? bearer(token) : {}});
  assert.equal(response.status, status, 'API status at ' + path);
  return response;
}
async function check() {
  const results = [];
  const passed = name => {results.push(name); console.log('PASS: ' + name);};
  const fixtures = JSON.parse(readFileSync(state + '/fixtures.json', 'utf8'));
  try {
    const discovery = await json(issuer + '/.well-known/openid-configuration');
    assert.equal(discovery.issuer, issuer);
    for (const key of ['authorization_endpoint','token_endpoint','jwks_uri','userinfo_endpoint','end_session_endpoint'])
      assert.ok(discovery[key].startsWith(issuer + '/protocol/openid-connect/'));
    if (!localVm) {
      for (const path of ['/admin/', '/realms/master/.well-known/openid-configuration'])
        assert.equal((await http(origin + path)).status, 404);
    }
    await json(apiOrigin + '/api/v1/health/ready');
    await apiStatus('auth/me', null, 401);
    if (localVm) {
      const boundary = spawnSync(process.execPath, [new URL('./loopback-boundary.mjs', import.meta.url).pathname, state], {env: process.env, encoding: 'utf8', timeout: 30000});
      assert.equal(boundary.status, 0, 'strict TLS and database role boundary checks');
      passed('untrusted CA and wrong hostname rejected; database TLS and least-privilege runtime confirmed');
    }
    passed(localVm ? 'loopback HTTPS discovery, readiness and missing bearer rejection (private edge not exercised)' : 'private HTTPS discovery, readiness, administrative route denial and missing bearer rejection');
    const adminApi = await admin();
    for (const clientId of ['faji-customer-mobile', 'faji-business-mobile']) {
      const [client] = await adminApi('/clients?clientId=' + clientId);
      assert.equal(client.publicClient, true);
      assert.equal(client.attributes['pkce.code.challenge.method'], 'S256');
      assert.equal(client.directAccessGrantsEnabled, false);
      assert.equal(client.implicitFlowEnabled, false);
      const user = clientId.includes('customer') ? fixtures.customer : fixtures.merchantA;
      for (const mode of ['missing', 'plain']) {
        const probe = await authorize(clientId, user, mode);
        if (!probe.rejected) {
          const verifier = mode === 'missing' ? null : probe.verifier;
          assert.equal((await exchange(probe, verifier)).status, 400, mode + ' PKCE must fail at code exchange');
        }
      }
      const passwordGrant = await http(issuer + '/protocol/openid-connect/token', {method: 'POST', headers: formHeaders,
        body: new URLSearchParams({grant_type: 'password', client_id: clientId, username: user.username, password: user.password})});
      assert.equal(passwordGrant.status, 400, 'native password grant must remain disabled');
      const negative = await authorize(clientId, user);
      assert.equal((await exchange(negative, randomBytes(32).toString('base64url'))).status, 400);
      const grant = await authorize(clientId, user);
      const response = await exchange(grant);
      assert.equal(response.status, 200);
      const tokens = await response.json();
      assert.ok(tokens.access_token && tokens.refresh_token && tokens.id_token);
      assert.equal((await exchange(grant)).status, 400, 'code replay must fail');
      await apiStatus('auth/me', tokens.id_token, 401);
      await apiStatus('auth/me', tokens.access_token + 'x', 401);
      const me = await (await apiStatus('auth/me', tokens.access_token, 200)).json();
      assert.equal(me.subject, user.subject);
      if (clientId.includes('business')) {
        assert.deepEqual(me.memberships.map(value => value.resourceId), [businesses[0]]);
        await apiStatus('businesses/' + businesses[0] + '/branches', tokens.access_token, 200);
        await apiStatus('businesses/' + businesses[1] + '/branches', tokens.access_token, 403);
      } else {
        assert.ok(me.roles.includes('customer'));
        assert.ok(!me.roles.includes('merchant'));
        await apiStatus('businesses/' + businesses[0] + '/branches', tokens.access_token, 403);
      }
      // Suspend after successful authentication: same signed bearer must immediately fail.
      await pool.query('UPDATE account_access SET suspended=true WHERE identity_subject=$1', [user.subject]);
      try {await apiStatus('auth/me', tokens.access_token, 403);}
      finally {await pool.query('UPDATE account_access SET suspended=false WHERE identity_subject=$1', [user.subject]);}
      const refreshed = await json(issuer + '/protocol/openid-connect/token', {method: 'POST', headers: formHeaders,
        body: new URLSearchParams({grant_type: 'refresh_token', client_id: clientId, refresh_token: tokens.refresh_token})});
      await apiStatus('auth/me', refreshed.access_token, 200);
      await apiStatus('auth/sessions/revoke-current', refreshed.access_token, 201, 'POST');
      await apiStatus('auth/me', refreshed.access_token, 403);
      const logout = await http(issuer + '/protocol/openid-connect/logout', {method: 'POST', headers: formHeaders,
        body: new URLSearchParams({client_id: clientId, refresh_token: refreshed.refresh_token})});
      assert.equal(logout.status, 204);
      assert.equal((await http(issuer + '/protocol/openid-connect/token', {method: 'POST', headers: formHeaders,
        body: new URLSearchParams({grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshed.refresh_token})})).status, 400);
      passed(clientId + ': real code/S256, wrong verifier, replay, ID/tampered bearer, scope isolation, suspension, refresh, API revocation and IdP logout');
    }
    for (const name of ['nonmember','suspended']) {
      const response = await exchange(await authorize('faji-business-mobile', fixtures[name]));
      assert.equal(response.status, 200);
      const tokens = await response.json();
      await apiStatus('auth/me', tokens.access_token, name === 'suspended' ? 403 : 200);
      await apiStatus('businesses/' + businesses[0] + '/branches', tokens.access_token, 403);
    }
    passed('merchant role without membership and suspended fixture denied protected resources');
    save('live-results.json', {result: 'PASS', transport: config.transport ?? 'tailscale', source: JSON.parse(readFileSync(state + '/source.json', 'utf8')).commit,
      timestamp: new Date().toISOString(), checks: results, physicalDevice: 'PENDING', emailJourneys: 'PENDING', mergeReady: false});
  } catch (error) {
    save('live-results.json', {result: 'FAIL', checks: results, physicalDevice: 'PENDING', mergeReady: false});
    throw error;
  }
}
async function control() {
  const fixtures = JSON.parse(readFileSync(state + '/fixtures.json', 'utf8'));
  assert.ok(Object.hasOwn(fixtures, fixtureName));
  assert.ok(['suspend','resume','membership-off','membership-on'].includes(operation));
  const subject = fixtures[fixtureName].subject;
  if (operation === 'suspend' || operation === 'resume') {
    await pool.query('UPDATE account_access SET suspended=$2,revoked_after=CASE WHEN $2 THEN now() ELSE revoked_after END WHERE identity_subject=$1', [subject, operation === 'suspend']);
    await pool.query('UPDATE user_profiles SET suspended=$2 WHERE identity_subject=$1', [subject, operation === 'suspend']);
  } else {
    await pool.query('UPDATE resource_memberships SET active=$2 WHERE identity_subject=$1', [subject, operation === 'membership-on']);
  }
  console.log('PASS: synthetic fixture state updated; resume requires a fresh login');
}
try {
  if (action === 'seed') await seed();
  else if (action === 'check') {
    await check();
    if (localVm) {
      const mail = spawnSync(process.execPath, ['tooling/keycloak-m2-email-acceptance.mjs'], {
        encoding: 'utf8', timeout: 120000,
        env: {...process.env, FAJI_KC_ORIGIN: origin, KC_BOOTSTRAP_ADMIN_USERNAME: 'device_admin', KC_BOOTSTRAP_ADMIN_PASSWORD: config.passwords.admin},
      });
      const checks = mail.stdout?.split('\n').filter(line => /^(PASS|LIMITATION):/.test(line)) ?? [];
      const result = mail.status !== 0 ? 'FAIL' : checks.some(line => line.startsWith('LIMITATION')) ? 'PARTIAL' : 'PASS';
      save('email-results.json', {result, checks});
      console.log('Email server journeys: '+result);
    }
  }
  else if (action === 'control') await control();
  else throw Error('Unknown action');
} catch (error) {
  const location = error?.stack?.split('\n').find(line => line.trim().startsWith('at '))?.trim() ?? 'unknown location';
  console.error('FAIL: device harness ' + action + '; ' + location + '; response bodies, credentials and token-bearing URLs withheld');
  process.exitCode = 1;
} finally {await pool.end();}
