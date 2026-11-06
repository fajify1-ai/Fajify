import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bookingEligibility} from '../src/planning/booking-eligibility';
const available={nowMs:100,slotStartsMs:1000,available:4,guests:2,quotedTotalMinor:'400000',authoritativeTotalMinor:'400000',currency:'NGN',quoteCurrency:'NGN',active:true,published:true,merchantApproved:true};
test('eligible request still requires an authoritative lock and verified payment',()=>{
 assert.deepEqual(bookingEligibility(available),{allowed:true,requiresCapacityLock:true,requiresPaymentVerification:true});
});
test('rejects stale amount',()=>{
 assert.deepEqual(bookingEligibility({...available,authoritativeTotalMinor:'400001'}),{allowed:false,reason:'price_changed'});
});
test('rejects exhausted capacity',()=>{
 assert.deepEqual(bookingEligibility({...available,available:1}),{allowed:false,reason:'capacity'});
});
test('rejects withdrawn merchant approval',()=>{
 assert.deepEqual(bookingEligibility({...available,merchantApproved:false}),{allowed:false,reason:'inactive'});
});
test('rejects expired slot',()=>{
 assert.deepEqual(bookingEligibility({...available,slotStartsMs:100}),{allowed:false,reason:'expired'});
});
