import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {IncomingMessage} from 'node:http';
import {requestIp,trustedProxies} from '../src/auth/request-ip';
const req=(remote:string,forwarded:string)=>({headers:{'x-faji-client-ip':forwarded},socket:{remoteAddress:remote}}) as IncomingMessage;
test('untrusted direct peers cannot choose their abuse-prevention IP bucket',()=>{assert.equal(requestIp(req('127.0.0.1','198.51.100.42'),trustedProxies('172.30.88.0/24')),'127.0.0.1');});
test('only a configured trusted ingress may supply one valid client address',()=>{assert.equal(requestIp(req('::ffff:172.30.88.10','198.51.100.42'),trustedProxies('172.30.88.0/24')),'198.51.100.42');assert.equal(requestIp(req('172.30.88.10','198.51.100.42, 203.0.113.2'),trustedProxies('172.30.88.0/24')),'172.30.88.10');});
test('malformed proxy configuration fails before serving traffic',()=>{assert.throws(()=>trustedProxies('not-a-network'));});
