import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertTripTransition, canOfferRideToDriver, canTransitionTrip,
  isUsableDriverPosition, tripStates,
} from '../src/rides/ride-domain';

test('ride transition graph forbids shortcuts, self-transitions and terminal reopening', () => {
  assert.equal(canTransitionTrip('requested', 'offered'), true);
  assert.equal(canTransitionTrip('offered', 'assigned'), true);
  assert.equal(canTransitionTrip('driver_arrived', 'in_progress'), true);
  assert.equal(canTransitionTrip('in_progress', 'completed'), true);
  assert.equal(canTransitionTrip('requested', 'completed'), false);
  assert.equal(canTransitionTrip('in_progress', 'cancelled'), false);
  for (const state of tripStates) {
    assert.equal(canTransitionTrip(state, state), false);
  }
  for (const terminal of ['completed', 'cancelled'] as const) {
    for (const state of tripStates) assert.equal(canTransitionTrip(terminal, state), false);
  }
  assert.throws(() => assertTripTransition('requested', 'completed'), /Illegal trip transition/);
  assert.doesNotThrow(() => assertTripTransition('requested', 'offered'));
});

test('offers require approved available driver, vehicle, unexpired documents and no active assignment', () => {
  const now = new Date('2026-11-03T00:00:00Z');
  const driver = {
    approved: true, suspended: false, vehicleApproved: true,
    documentsExpireAt: new Date('2026-11-04T00:00:00Z'),
    available: true, hasActiveAssignment: false,
  };
  assert.equal(canOfferRideToDriver(driver, now), true);
  assert.equal(canOfferRideToDriver({...driver, approved:false}, now), false);
  assert.equal(canOfferRideToDriver({...driver, suspended:true}, now), false);
  assert.equal(canOfferRideToDriver({...driver, vehicleApproved:false}, now), false);
  assert.equal(canOfferRideToDriver({...driver, documentsExpireAt:null}, now), false);
  assert.equal(canOfferRideToDriver({...driver, documentsExpireAt:now}, now), false);
  assert.equal(canOfferRideToDriver({...driver, available:false}, now), false);
  assert.equal(canOfferRideToDriver({...driver, hasActiveAssignment:true}, now), false);
});

test('driver GPS requires consent, valid coordinates, nonfuture and fresh timestamps', () => {
  const now = new Date('2026-11-03T00:00:00Z');
  const point = {latitude:6.5244, longitude:3.3792, recordedAt: new Date(now.getTime()-5_000), consentGranted:true};
  assert.equal(isUsableDriverPosition(point, now, 10_000), true);
  assert.equal(isUsableDriverPosition({...point, consentGranted:false}, now, 10_000), false);
  assert.equal(isUsableDriverPosition({...point, latitude:91}, now, 10_000), false);
  assert.equal(isUsableDriverPosition({...point, longitude:181}, now, 10_000), false);
  assert.equal(isUsableDriverPosition({...point, recordedAt:new Date(now.getTime()+1)}, now, 10_000), false);
  assert.equal(isUsableDriverPosition(point, now, 1_000), false);
  assert.equal(isUsableDriverPosition(point, now, -1), false);
});
