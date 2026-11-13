import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/merchant-applications/route';
import { parseQueue } from '../lib/merchant-contract';
import { elevationExpiry } from '../lib/oidc';
import { redisStore, sessionCookie, sessions, transactions } from '../lib/session';

const origin = 'https://admin.example';
const api = 'https://api.example';
const id = 'ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const row = { id, displayName: 'Synthetic merchant', createdAt: '2026-11-13T10:00:00Z', status: 'pending' };

test('queue parser retains only the supported projection and bounds pagination', () => {
  assert.deepEqual(parseQueue({ items: [{ ...row, extra: 'discarded' }], nextOffset: null }, 0), { items: [row], nextOffset: null });
  assert.throws(() => parseQueue({ items: [row], nextOffset: 20 }, 0));
  assert.throws(() => parseQueue({ items: [{ ...row, status: 'approved' }], nextOffset: null }, 0));
  assert.equal(parseQueue({ items: Array.from({ length: 20 }, () => row), nextOffset: 10020 }, 10000).nextOffset, null);
});

test('elevation uses the shorter of access token and recent MFA lifetimes', () => {
  const claims = { sub: 'operator', azp: 'faji-admin-web', acr: 'faji-mfa', auth_time: 900, exp: 1300,
    realm_access: { roles: ['platform-admin'] } };
  const expiry = (payload: typeof claims, now = 1000) => elevationExpiry(payload, 'operator', 'faji-mfa', 'faji-api', now);
  assert.equal(expiry(claims), 1200000);
  assert.equal(expiry({ ...claims, exp: 1050 }), 1050000);
  assert.equal(expiry(claims, 1201), null);
  assert.equal(expiry({ ...claims, azp: 'faji-business-mobile' }), null);
  assert.equal(expiry({ ...claims, acr: 'password' }), null);
  assert.equal(expiry({ ...claims, auth_time: 1001 }), null);
  assert.equal(expiry({ ...claims, sub: 'merchant' }), null);
  assert.equal(expiry({ ...claims, realm_access: { roles: ['customer'] } }), null);
});

test('OIDC transactions can be consumed once and expired sessions are denied', async () => {
  const transaction = { state: 'state', nonce: 'nonce', verifier: 'verifier', expires: Date.now() + 1000 };
  const id = await transactions.create(transaction);
  assert.deepEqual(await transactions.take(id), transaction);
  assert.equal(await transactions.take(id), undefined);
  const expired = await sessions.create({ accessToken: 'synthetic', expires: Date.now() - 1 });
  assert.equal(await sessions.get(expired), undefined);
});

test('web routes require an operator session and forward only the authoritative commands', async (t) => {
  process.env.FAJI_ADMIN_WEB_ORIGIN = origin;
  process.env.FAJI_ADMIN_API_ORIGIN = api;
  process.env.FAJI_ADMIN_OIDC_ISSUER = 'https://identity.example/realms/faji';
  const session = await sessions.create({ accessToken: 'synthetic', expires: Date.now() + 10_000 });
  t.after(() => sessions.remove(session));

  let upstream: Response;
  const fetch = t.mock.method(globalThis, 'fetch', async (_url: string, _init: { body: string }) => upstream);
  const request = (method: string, browserOrigin = origin, cookie = session) => new NextRequest(
    origin + '/api/merchant-applications?offset=20', {
      method,
      headers: { origin: browserOrigin, cookie: `${sessionCookie}=${cookie}`, 'content-type': 'application/json' },
      ...(method === 'POST' && { body: JSON.stringify({ id, decision: 'approved', extra: 'discarded' }) }),
    });

  assert.equal((await POST(request('POST', 'https://untrusted.example'))).status, 403);
  assert.equal((await POST(request('POST', origin, 'unknown'))).status, 401);
  assert.equal((await GET(request('GET', origin, 'unknown'))).status, 401);
  assert.equal(fetch.mock.callCount(), 0);

  upstream = Response.json({ items: [row], nextOffset: null });
  assert.deepEqual(await (await GET(request('GET'))).json(), { items: [row], nextOffset: null });
  assert.equal(fetch.mock.calls[0].arguments[0], api + '/api/v1/admin/governance/approvals?limit=20&offset=20');

  upstream = Response.json({ error: { message: 'Administrative scope required' } }, { status: 403 });
  const forbidden = await GET(request('GET'));
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { code: 'queue_scope_required' });

  upstream = Response.json({ id, status: 'approved' }, { status: 201 });
  assert.deepEqual(await (await POST(request('POST'))).json(), { status: 'approved' });
  assert.equal(fetch.mock.calls[2].arguments[0], api + `/api/v1/business/onboarding/${id}/review`);
  assert.equal(fetch.mock.calls[2].arguments[1]?.body, JSON.stringify({ decision: 'approved' }));

  upstream = Response.json({ error: { message: 'Privileged authentication required' } }, { status: 403 });
  assert.equal((await POST(request('POST'))).status, 401);
  upstream = Response.json({ error: { message: 'Business application already reviewed' } }, { status: 409 });
  assert.equal((await POST(request('POST'))).status, 409);
});

test('shared sessions use TTL and consume login transactions atomically across store instances', async t => {
  const records = new Map<string, string>();
  const commands: string[][] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const args = JSON.parse(String(init?.body));
    commands.push(args);
    const [op, key, value] = args;
    if (op === 'SET') {
      records.set(key, value);
      return Response.json({ result: 'OK' });
    }
    const found = records.get(key) ?? null;
    if (op === 'GETDEL' || op === 'DEL') records.delete(key);
    return Response.json({ result: found });
  });
  const endpoint = new URL('https://redis.example/');
  const first = redisStore('https://admin.example', 'transaction', endpoint, 'synthetic');
  const second = redisStore('https://admin.example', 'transaction', endpoint, 'synthetic');
  const value = { expires: Date.now() + 5000 };
  const id = await first.create(value);
  assert.deepEqual(await second.get(id), value);
  const results = await Promise.all([first.take(id), second.take(id)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(commands[0][3], 'PX');
  assert.equal(commands[0][5], 'NX');
  assert.deepEqual(commands.slice(1).map(parts => parts[0]), ['GET', 'GETDEL', 'GETDEL']);
});
