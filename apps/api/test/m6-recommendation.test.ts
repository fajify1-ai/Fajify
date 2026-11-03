import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rankExperiences, type PlanningCandidate, type PlanningPreferences} from '../src/planning/recommendation.rules';

const preferences:PlanningPreferences={budgetMinor:'2000000',currency:'NGN',guests:2,startsAfter:'2026-12-01T00:00:00+01:00',startsBefore:'2026-12-03T00:00:00+01:00',location:'Lagos'};
const candidate:PlanningCandidate={id:'a',name:'Experience',category:'service',address:'Lagos Island',currency:'NGN',pricePerGuestMinor:'500000',availableSeats:4,startsAt:'2026-12-01T12:00:00+01:00',active:true,published:true,merchantApproved:true};
test('returns explainable feasible recommendations with exact group prices',()=>{
 const [result]=rankExperiences(preferences,[candidate]);
 assert.equal(result.totalMinor,'1000000');
 assert.ok(result.reasons.includes('Sufficient capacity'));
});
test('never recommends unpublished, inactive or unapproved merchant offerings',()=>{
 for(const key of ['active','published','merchantApproved'] as const)
  assert.deepEqual(rankExperiences(preferences,[{...candidate,[key]:false}]),[]);
});
test('enforces capacity, geography, time, category, currency and budget',()=>{
 assert.deepEqual(rankExperiences(preferences,[{...candidate,availableSeats:1}]),[]);
 assert.deepEqual(rankExperiences(preferences,[{...candidate,address:'Abuja'}]),[]);
 assert.deepEqual(rankExperiences(preferences,[{...candidate,startsAt:'2026-12-03T00:00:00+01:00'}]),[]);
 assert.deepEqual(rankExperiences({...preferences,categories:['event']},[candidate]),[]);
 assert.deepEqual(rankExperiences(preferences,[{...candidate,currency:'USD'}]),[]);
 assert.deepEqual(rankExperiences({...preferences,budgetMinor:'999999'},[candidate]),[]);
});
test('sorts deterministically and does not mutate input',()=>{
 const other={...candidate,id:'b'};
 const items=[other,candidate];
 assert.deepEqual(rankExperiences(preferences,items).map(x=>x.id),['a','b']);
 assert.equal(items[0].id,'b');
});
test('rejects invalid group size, money and timezone-free dates',()=>{
 assert.throws(()=>rankExperiences({...preferences,guests:0},[candidate]));
 assert.throws(()=>rankExperiences({...preferences,budgetMinor:'1.50'},[candidate]));
 assert.throws(()=>rankExperiences({...preferences,startsAfter:'2026-12-01'},[candidate]));
});

test('fixed group-price packages do not multiply quoted group price',()=>{
 const packageOffer={...candidate,category:'package',pricingModel:'per_group' as const,pricePerGuestMinor:'750000'};
 const [result]=rankExperiences(preferences,[packageOffer]);
 assert.equal(result.totalMinor,'750000');
});
test('group-price package over budget is rejected',()=>{
 const packageOffer={...candidate,category:'package',pricingModel:'per_group' as const,pricePerGuestMinor:'3000000'};
 assert.deepEqual(rankExperiences(preferences,[packageOffer]),[]);
});
