import {test} from 'node:test';import assert from 'node:assert/strict';
import {notificationOptions,redisConnection} from '../src/jobs';
test('notifications use bounded retry and stable dedupe key',()=>{const options=notificationOptions('evt_1');assert.equal(options.jobId,'evt_1');assert.equal(options.attempts,5);assert.equal(options.removeOnFail,false);});
test('invalid job IDs are rejected',()=>assert.throws(()=>notificationOptions('illegal:colon')));
test('Redis URLs preserve TLS, credentials, database and IPv6 host',()=>{
 const options=redisConnection('rediss://worker:p%40ss@[::1]:6380/2');
 assert.equal(options.host,'::1');assert.equal(options.port,6380);
 assert.equal(options.username,'worker');assert.equal(options.password,'p@ss');
 assert.equal(options.db,2);assert.deepEqual(options.tls,{});
 assert.throws(()=>redisConnection('http://localhost'));
 assert.throws(()=>redisConnection('redis://localhost/not-a-db'));
});
