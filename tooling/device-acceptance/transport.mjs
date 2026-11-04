import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

/** Extend trust only for this disposable run; never disable TLS verification. */
export function transport(config, state, env = process.env) {
  assert.equal(env.NODE_TLS_REJECT_UNAUTHORIZED, undefined, 'TLS override prohibited');
  const localVm = config.transport === 'loopback-vm';
  if (localVm) {
    assert.match(config.origin, /^https:\/\/localhost:[0-9]{1,5}$/);
    assert.match(config.apiOrigin, /^https:\/\/localhost:[0-9]{1,5}$/);
    for (const value of [config.origin, config.apiOrigin]) {
      const port = Number(new URL(value).port);
      assert.ok(port > 0 && port <= 65535);
    }
    assert.equal(config.adminOrigin, config.origin);
    assert.equal(env.NODE_EXTRA_CA_CERTS, state + '/ca.pem', 'Only this run CA may extend normal TLS trust');
    assert.equal(createHash('sha256').update(readFileSync(state + '/ca.pem')).digest('hex'), config.caSha256, 'Run CA fingerprint mismatch');
  } else {
    assert.ok(config.transport === undefined || config.transport === 'tailscale', 'Unknown transport');
    assert.match(config.origin, /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/);
    assert.equal(env.NODE_EXTRA_CA_CERTS, undefined, 'Use normal public trust roots');
  }
  return {localVm, origin: config.origin, apiOrigin: localVm ? config.apiOrigin : config.origin,
    adminOrigin: localVm ? config.adminOrigin : 'http://127.0.0.1:' + config.ports.admin};
}
