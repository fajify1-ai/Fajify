import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {grantM5Runtime} from '../../../packages/database/scripts/grant-m5-runtime';
import {BusinessService} from '../src/business/business.service';
import {ManagementService} from '../src/business/management.service';
import {AccessService} from '../src/auth/access.service';
import {CustomerService} from '../src/customer/customer.service';
import {MarketplaceService} from '../src/customer/marketplace.service';
import {PlanningService} from '../src/planning/planning.service';
import {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import {FinanceLedger} from '../src/payments/finance-ledger.service';
import {FinancialOperations} from '../src/payments/financial-operations.service';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {PaymentsService} from '../src/payments/payments.service';
import {FakePaystack} from './m5-fake-provider';
import type {VerifiedIdentity} from '../src/auth/identity.types';

const migrationUrl=process.env.FAJI_DATABASE_URL, runtimeUrl=process.env.FAJI_RUNTIME_DATABASE_URL;
const admin=new Pool({connectionString:migrationUrl,max:3,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:runtimeUrl,max:12,connectionTimeoutMillis:3000});
const customer=new CustomerService(runtime),access=new AccessService(runtime),business=new BusinessService(runtime,access);
const market=new MarketplaceService(runtime,customer),management=new ManagementService(runtime,access);
const gateway=new PaystackGateway(),ledger=new FinanceLedger(runtime),commerce=new CommerceLifecycle(ledger,customer,gateway);
const finance=new FinancialOperations(ledger,commerce,gateway),planning=new PlanningService(runtime,customer,commerce);
const suffix=randomUUID(),owner='m6-owner-'+suffix,a='m6-a-'+suffix,b='m6-b-'+suffix;
const identity=(subject:string):VerifiedIdentity=>({subject,issuer:'https://fixture.invalid',audience:['faji-api'],roles:['customer'],issuedAt:Math.floor(Date.now()/1000)-2,expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:subject+'-session'});
let merchantId:string,branch:string,component:string,pack:string,packageSlot:string,componentSlot:string;
let startsAt:string,endsAt:string;
const priorSecret=process.env.PAYSTACK_SECRET_KEY;
const policy={commissionBps:100,gatewayFeeBearer:'merchant' as const,payoutFeeBearer:'merchant' as const,settlementDelayHours:0,refundWindowHours:48,cancellationCutoffMinutes:30,holdMinutes:5};
async function newPlan(subject=a){
 return planning.create(identity(subject),{occasion:'anniversary',budgetMinor:'25000',currency:'NGN',guests:2,
  startsAfter:new Date(Date.now()+20*3600000).toISOString(),startsBefore:new Date(Date.now()+48*3600000).toISOString(),
  location:'Lagos',latitude:6.5244,longitude:3.3792,radiusKm:5,categories:['package'],attributes:['private']});
}
before(async()=>{
 assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m6_test_[a-z0-9_]+$/);
 assert.ok(migrationUrl&&runtimeUrl);
 const migration=new URL(migrationUrl!),client=new URL(runtimeUrl!);
 assert.equal(migration.hostname,client.hostname);assert.equal(migration.pathname,client.pathname);assert.notEqual(migration.username,client.username);
 await assertDisposable(admin);await assertDisposable(runtime);
 await applyMigrations(admin);await applyMigrations(admin);
 await grantM5Runtime(admin,runtimeUrl!);
 await assert.rejects(runtime.query('CREATE TABLE m6_forbidden(id integer)'),{code:'42501'});
 process.env.PAYSTACK_SECRET_KEY='sk_test_m6fixture';
 for(const who of [owner,a,b]){
  await admin.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[who]);
  await admin.query('INSERT INTO account_access(identity_subject) VALUES($1)',[who]);
 }
 merchantId=(await admin.query("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M6 Synthetic','approved','fixture-reviewer',now()) RETURNING id",[owner])).rows[0].id;
 await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,merchantId]);
 branch=(await business.createBranch(owner,merchantId,{name:'M6 Lagos',address:'Lagos, Nigeria'})).id;
 await market.publicProfile(identity(owner),merchantId,branch,{summary:'Private anniversary experience',city:'Lagos',latitude:6.5244,longitude:3.3792});
 component=(await business.createItem(owner,merchantId,branch,{name:'Private anniversary dining',kind:'service',priceMinor:0,published:true})).id;
 pack=(await business.createItem(owner,merchantId,branch,{name:'Private anniversary package',kind:'package',priceMinor:20000,published:true})).id;
 await management.replacePackage(owner,merchantId,branch,pack,[{catalogueId:component,quantity:1}]);
 await market.configurePackage(identity(owner),merchantId,branch,pack,{pricingModel:'per_group',minGuests:2,maxGuests:3,addOns:[]});
 startsAt=new Date(Date.now()+86400000).toISOString();endsAt=new Date(Date.now()+90000000).toISOString();
 componentSlot=(await business.createSlot(owner,merchantId,branch,{catalogueId:component,startsAt,endsAt,capacity:1})).id;
 packageSlot=(await business.createSlot(owner,merchantId,branch,{catalogueId:pack,startsAt,endsAt,capacity:2})).id;
 await finance.policy('fixture-admin',merchantId,policy);
});
after(async()=>{
 if(priorSecret===undefined)delete process.env.PAYSTACK_SECRET_KEY;
 else process.env.PAYSTACK_SECRET_KEY=priorSecret;
 await Promise.all([admin.end(),runtime.end()]);
});
test('private plans enforce owner and optimistic revision',async()=>{
 const plan=await newPlan();
 assert.equal(plan.revision,1);assert.deepEqual(plan.attributes,['private']);
 await assert.rejects(()=>planning.get(b,plan.id),NotFoundException);
 const changes={occasion:plan.occasion,budgetMinor:plan.budgetMinor,currency:plan.currency,guests:plan.guests,
  startsAfter:plan.startsAfter,startsBefore:plan.startsBefore,location:plan.location??undefined,
  latitude:plan.latitude??undefined,longitude:plan.longitude??undefined,radiusKm:plan.radiusKm??undefined,
  categories:plan.categories,attributes:plan.attributes,revision:plan.revision};
 const updated=await planning.update(identity(a),plan.id,{...changes,occasion:'birthday'});
 assert.equal(updated.revision,2);
 await assert.rejects(()=>planning.update(identity(a),plan.id,changes),ConflictException);
 await assert.rejects(()=>planning.update(identity(b),plan.id,changes),NotFoundException);
 await planning.archive(identity(a),plan.id);
 await assert.rejects(()=>planning.update(identity(a),plan.id,{...changes,revision:2}),ConflictException);
});
test('feedback is private and updates a single customer response',async()=>{
 const plan=await newPlan();
 const first=await planning.feedback(identity(a),plan.id,{rating:4,comment:'Good ideas'});
 const second=await planning.feedback(identity(a),plan.id,{rating:5,comment:'More relevant'});
 assert.equal(first.id,second.id);assert.equal((await planning.feedbackDetail(a,plan.id)).rating,5);
 await assert.rejects(()=>planning.feedbackDetail(b,plan.id),NotFoundException);
 await assert.rejects(()=>planning.feedback(identity(b),plan.id,{rating:1}),NotFoundException);
});
test('PostGIS filters distance and recommendation evidence remains owner-scoped',async()=>{
 const plan=await newPlan();
 const result=await planning.recommend(a,plan.id);
 assert.ok(result.items.some(v=>v.availabilityId===packageSlot&&v.totalMinor==='20000'));
 assert.ok(result.items.some(v=>v.reasons.includes('Matches your occasion')));
 assert.ok((await admin.query('SELECT count(*)::int AS n FROM customer_plan_evaluations WHERE plan_id=$1 AND customer_subject=$2',[plan.id,a])).rows[0].n>0);
 const bad=await planning.create(identity(a),{occasion:'trip',budgetMinor:'25000',currency:'NGN',guests:2,
  startsAfter:plan.startsAfter,startsBefore:plan.startsBefore,latitude:0,longitude:0,radiusKm:1,categories:['package']});
 assert.equal((await planning.recommend(a,bad.id)).items.length,0);
 await assert.rejects(()=>planning.recommend(b,plan.id),NotFoundException);
});
test('package booking reserves group and component capacity atomically, retries safely, releases once',async()=>{
 const plan=await newPlan();
 const hold=await planning.bookingHold(identity(a),plan.id,{revision:plan.revision,availabilityId:packageSlot,expectedTotalMinor:'20000',guestName:'Test Guest',requestKey:'m6-package-hold-0001'});
 assert.equal(hold.status,'held');assert.equal(hold.amountMinor,'20000');
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[packageSlot])).rows[0].reserved,2);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[componentSlot])).rows[0].reserved,1);
 assert.equal((await planning.bookingHold(identity(a),plan.id,{revision:plan.revision,availabilityId:packageSlot,expectedTotalMinor:'20000',guestName:'Test Guest',requestKey:'m6-package-hold-0001'})).id,hold.id);
 const other=await newPlan(b);
 await assert.rejects(()=>planning.bookingHold(identity(b),other.id,{revision:other.revision,availabilityId:packageSlot,expectedTotalMinor:'20000',guestName:'Other Guest',requestKey:'m6-package-hold-0002'}),ConflictException);
 await commerce.cancel(identity(a),hold.id);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[packageSlot])).rows[0].reserved,0);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[componentSlot])).rows[0].reserved,0);
 assert.equal((await admin.query('SELECT count(*)::int AS n FROM package_component_holds WHERE hold_id=$1 AND released_at IS NOT NULL',[hold.id])).rows[0].n,1);
});
test('stale displayed package amount cannot create a hold',async()=>{
 const plan=await newPlan();
 await assert.rejects(()=>planning.bookingHold(identity(a),plan.id,{revision:plan.revision,availabilityId:packageSlot,expectedTotalMinor:'19999',guestName:'Test Guest',requestKey:'m6-package-stale-0001'}),ConflictException);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[packageSlot])).rows[0].reserved,0);
});
test('revoked session cannot update plans or give feedback',async()=>{
 const plan=await newPlan(b);
 await access.revokeSession(b,identity(b).sessionId!);
 await assert.rejects(()=>planning.feedback(identity(b),plan.id,{rating:5}),ForbiddenException);
});

test('provider-verified package capture issues one confirmed reservation without releasing component capacity',async()=>{
 const plan=await newPlan();
 const hold=await planning.bookingHold(identity(a),plan.id,{revision:plan.revision,availabilityId:packageSlot,expectedTotalMinor:'20000',guestName:'Paid Guest',requestKey:'m6-paid-package-0001'});
 const fake=new FakePaystack(),oldFetch=globalThis.fetch,oldCallback=process.env.PAYMENT_CALLBACK_URL;
 try{
  globalThis.fetch=fake.fetch;
  process.env.PAYMENT_CALLBACK_URL='https://fixture.invalid/payment-callback';
  const payments=new PaymentsService(runtime,gateway,commerce,finance);
  const started=await commerce.checkout(identity(a),hold.paymentIntentId,'customer@example.invalid');
  assert.equal(started.checkoutEnabled,true);
  const intent=(await admin.query<{provider_reference:string;amount_minor:string}>(
   'SELECT provider_reference,amount_minor::text FROM payment_intents WHERE id=$1',[hold.paymentIntentId])).rows[0];
  const charge=fake.transactions.get(intent.provider_reference)??fake.charge(intent.provider_reference,Number(intent.amount_minor));
  charge.status='success';charge.fees=15;
  const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference:intent.provider_reference}}));
  const signature=createHmac('sha512',process.env.PAYSTACK_SECRET_KEY!).update(raw).digest('hex');
  await Promise.all([payments.webhook(raw,signature),payments.webhook(raw,signature)]);
  const confirmed=(await admin.query('SELECT reservation_id,status FROM paid_holds WHERE id=$1',[hold.id])).rows[0];
  assert.equal(confirmed.status,'confirmed');assert.ok(confirmed.reservation_id);
  assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[componentSlot])).rows[0].reserved,1);
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM business_reservations WHERE id=$1',[confirmed.reservation_id])).rows[0].n,1);
  await assert.rejects(()=>customer.cancelReservation(identity(a),confirmed.reservation_id),ConflictException);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldCallback===undefined)delete process.env.PAYMENT_CALLBACK_URL;else process.env.PAYMENT_CALLBACK_URL=oldCallback;
 }
});

test('expired package holds restore every allocated component exactly once',async()=>{
 const plan=await newPlan();
 const hold=await planning.bookingHold(identity(a),plan.id,{revision:plan.revision,availabilityId:packageSlot,expectedTotalMinor:'20000',guestName:'Expiry Guest',requestKey:'m6-expiry-package-0001'});
 const c=await admin.connect();
 try{
  await assertDisposable(admin);await c.query('BEGIN');
  await c.query('ALTER TABLE paid_holds DISABLE TRIGGER paid_holds_guard');
  await c.query("UPDATE paid_holds SET expires_at=now()-interval '1 second' WHERE id=$1",[hold.id]);
  await c.query('ALTER TABLE paid_holds ENABLE TRIGGER paid_holds_guard');
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 await commerce.expire();
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[packageSlot])).rows[0].reserved,0);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[componentSlot])).rows[0].reserved,0);
 const released=await admin.query('SELECT released_at FROM package_component_holds WHERE hold_id=$1',[hold.id]);
 assert.equal(released.rows.length,1);assert.ok(released.rows[0].released_at);
});
