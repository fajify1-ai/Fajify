import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/operations/[command]/route';
import { commandRequest, formatNaira } from '../lib/operations-contract';
import { sessionCookie, sessions } from '../lib/session';

const id = 'ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const requestKey = 'synthetic-key';

test('formats exact minor units as naira without rounding large integers', () => {
  assert.equal(formatNaira('900719925474099312'), '₦9,007,199,254,740,993.12');
  assert.equal(formatNaira('-123'), '−₦1.23');
  assert.equal(formatNaira('0'), '₦0.00');
  assert.equal(formatNaira('invalid'), '—');
});

test('allowlists operations and only forwards expected fields', () => {
  assert.deepEqual(commandRequest('support-assign', { id, requestKey, priority: 'normal', assignee: null, reason: 'Rebalance the queue', extra: true }),
    { path: `support/cases/${id}/assignment`, body: { requestKey, priority: 'normal', assignee: null, reason: 'Rebalance the queue' } });
  assert.equal(commandRequest('support-reply', { id, requestKey, message: ' ' }), null);
  assert.equal(commandRequest('support-status', { id: '../cases', requestKey, status: 'closed', reason: 'Case resolved' }), null);
  assert.equal(commandRequest('incident-status', { id, requestKey, state: 'deleted', reason: 'Case resolved' }), null);
  assert.equal(commandRequest('monitor-check', { unexpected: true }), null);
  assert.equal(commandRequest('finance-refund', { id, requestKey }), null);
});

test('command route denies other origins and absent sessions and preserves upstream authorization', async t => {
  const origin = 'https://admin.example';
  process.env.FAJI_ADMIN_WEB_ORIGIN = origin;
  process.env.FAJI_ADMIN_API_ORIGIN = 'https://api.example';
  process.env.FAJI_ADMIN_OIDC_ISSUER = 'https://identity.example/realms/faji';
  const session = await sessions.create({ accessToken: 'synthetic', expires: Date.now() + 30_000 });
  t.after(() => sessions.remove(session));
  const params = { params: Promise.resolve({ command: 'support-reply' }) };
  const send = (browserOrigin: string, cookie: string) => POST(new NextRequest(origin + '/api/operations/support-reply', {
    method: 'POST', headers: { origin: browserOrigin, cookie: `${sessionCookie}=${cookie}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id, requestKey, message: 'Synthetic reply' }),
  }), params);

  const mock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: { message: 'Administrative scope required' } }, { status: 403 }));
  assert.equal((await send('https://other.example', session)).status, 403);
  assert.equal((await send(origin, 'missing')).status, 401);
  assert.equal(mock.mock.callCount(), 0);
  assert.equal((await send(origin, session)).status, 403);
  assert.equal(mock.mock.calls[0].arguments[0], `https://api.example/api/v1/admin/support/cases/${id}/messages`);
});
