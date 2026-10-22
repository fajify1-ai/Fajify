import {test} from 'node:test';import assert from 'node:assert/strict';
import {notificationOptions} from '../src/jobs';
test('notifications use bounded retry and stable dedupe key',()=>{const options=notificationOptions('evt_1');assert.equal(options.jobId,'evt_1');assert.equal(options.attempts,5);assert.equal(options.removeOnFail,false);});
test('invalid job IDs are rejected',()=>assert.throws(()=>notificationOptions('illegal:colon')));
