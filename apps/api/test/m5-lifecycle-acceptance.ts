import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {grantM5Runtime} from '../../../packages/database/scripts/grant-m5-runtime';
import {CustomerService} from '../src/customer/customer.service';
import {BusinessService} from '../src/business/business.service';
import {AccessService} from '../src/auth/access.service';
import type {VerifiedIdentity} from '../src/auth/identity.types';
import {FinanceLedger} from '../src/payments/finance-ledger.service';
import {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import {FinancialOperations} from '../src/payments/financial-operations.service';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {PaymentsService} from '../src/payments/payments.service';
import {OrderIntentsService} from '../src/payments/order-intents.service';
import {FinanceJobs} from '../src/payments/finance-jobs.service';
import {FakePaystack} from './m5-fake-provider';

test('M5 complete financial lifecycle on marked PostgreSQL 16 with restricted runtime and isolated Paystack transport',async t=>{
 assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m5_test_[a-z0-9_]+$/);
 assert.ok(process.env.FAJI_DATABASE_URL);assert.ok(process.env.FAJI_RUNTIME_DATABASE_URL);
 const adminUrl=new URL(process.env.FAJI_DATABASE_URL!),runtimeUrl=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);
 assert.equal(adminUrl.host,runtimeUrl.host);assert.equal(adminUrl.pathname,runtimeUrl.pathname);assert.notEqual(adminUrl.username,runtimeUrl.username);
 const admin=new Pool({connectionString:adminUrl.toString(),max:3}),runtime=new Pool({connectionString:runtimeUrl.toString(),max:16});
 const ledger=new FinanceLedger(runtime),customers=new CustomerService(runtime),gateway=new PaystackGateway(),commerce=new CommerceLifecycle(ledger,customers,gateway),operations=new FinancialOperations(ledger,commerce,gateway),payments=new PaymentsService(runtime,gateway,commerce,operations),preparations=new OrderIntentsService(customers,gateway),jobs=new FinanceJobs(ledger,commerce,operations,payments);
 const merchant=new BusinessService(runtime,new AccessService(runtime)),fake=new FakePaystack(),previousFetch=globalThis.fetch,environment={...process.env};
 const suffix=randomUUID(),owner='m5-owner-'+suffix,a='m5-a-'+suffix,b='m5-b-'+suffix;
 const identity=(subject:string):VerifiedIdentity=>({subject,issuer:'https://fixture.invalid',audience:['faji-api'],roles:['customer'],issuedAt:Math.floor(Date.now()/1000)-1,expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:subject});
 const policy={commissionBps:137,gatewayFeeBearer:'merchant' as const,payoutFeeBearer:'merchant' as const,settlementDelayHours:0,refundWindowHours:48,cancellationCutoffMinutes:30,holdMinutes:5};
 async function fixture(){
  const business=(await admin.query("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M5 full lifecycle','approved','synthetic-reviewer',now()) RETURNING id",[owner])).rows[0].id;
  await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,business]);
  const branch=(await merchant.createBranch(owner,business,{name:'Synthetic Lagos'})).id as string;
  await operations.policy('fixture-admin',business,policy);
  const product=(await merchant.createItem(owner,business,branch,{name:'Synthetic product',kind:'product',priceMinor:10001,published:true})).id as string;
  const service=(await merchant.createItem(owner,business,branch,{name:'Synthetic paid service',kind:'service',priceMinor:10001,published:true})).id as string;
  const event=(await merchant.createItem(owner,business,branch,{name:'Synthetic ticket event',kind:'event',priceMinor:10001,published:true})).id as string;
  await admin.query("INSERT INTO business_event_config(catalogue_id,business_id,branch_id,starts_at,ends_at,max_guests) VALUES($1,$2,$3,now()+interval '1 day',now()+interval '2 days',10)",[event,business,branch]);
  await commerce.inventory(identity(owner),business,branch,event,2);
  const slot=(await merchant.createSlot(owner,business,branch,{catalogueId:service,startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:1})).id as string;
  return {business,branch,product,service,event,slot};
 }
 async function order(f:Awaited<ReturnType<typeof fixture>>){
  const o=await customers.placeOrder(identity(a),{branchId:f.branch,requestKey:randomUUID(),items:[{catalogueId:f.product,quantity:1,expectedPriceMinor:'10001'}]});
  const prepared=await preparations.prepare(identity(a),o.id,randomUUID());return {order:o.id,id:prepared.paymentIntentId};
 }
 async function checkout(id:string){const session=await commerce.checkout(identity(a),id,'fixture@example.invalid');assert.equal(session.checkoutEnabled,true);return session;}
 async function capture(id:string,fees=15){
  const p=(await admin.query('SELECT provider_reference,amount_minor::text FROM payment_intents WHERE id=$1',[id])).rows[0];
  let charge=fake.transactions.get(p.provider_reference);if(!charge)charge=fake.charge(p.provider_reference,Number(p.amount_minor));charge.status='success';charge.fees=fees;
  const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference:p.provider_reference,amount:1,status:'spoofed'}})),sig=createHmac('sha512',process.env.PAYSTACK_SECRET_KEY!).update(raw).digest('hex');
  await Promise.all(Array.from({length:4},()=>payments.webhook(raw,sig)));return charge;
 }
 async function fulfil(f:Awaited<ReturnType<typeof fixture>>,id:string){for(const status of ['accepted','preparing','ready','fulfilled'] as const)await merchant.orderStatus(owner,f.business,f.branch,id,status);await operations.fulfilment();}
 async function balance(code:string){return ledger.tx(randomUUID(),c=>ledger.balance(c,code));}
 // Fixture-only passage of time: only the migration owner can disable a guard, in this
 // marked disposable database, and it is restored before commit. Production has no clock bypass.
 async function timeFixture(table:'paid_holds'|'business_event_config',id:string){
  await assertDisposable(admin);const c=await admin.connect();try{await c.query('BEGIN');
   const trigger=table==='paid_holds'?'paid_holds_guard':'business_event_inventory_guard';await c.query(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`);
   if(table==='paid_holds')await c.query("UPDATE paid_holds SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);
   else await c.query("UPDATE business_event_config SET starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' WHERE catalogue_id=$1",[id]);
   await c.query(`ALTER TABLE ${table} ENABLE TRIGGER ${trigger}`);await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 try{
  await assertDisposable(admin);await assertDisposable(runtime);await applyMigrations(admin);await applyMigrations(admin);await grantM5Runtime(admin,runtimeUrl.toString());
  globalThis.fetch=fake.fetch;process.env.PAYSTACK_SECRET_KEY='sk_test_disposablefixture';process.env.PAYMENT_CALLBACK_URL='https://fixture.invalid/callback';process.env.TICKET_SIGNING_KEYS=JSON.stringify({fixture:'4'.repeat(64)});process.env.TICKET_ACTIVE_KEY_ID='fixture';
  for(const subject of [owner,a,b]){await admin.query('INSERT INTO account_access(identity_subject) VALUES($1)',[subject]);await admin.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[subject]);}
  await t.test('runtime cannot perform DDL, change migrations, edit capture history or reach identity sentinel',async()=>{
   for(const sql of ['CREATE TABLE m5_escape(id int)','TRUNCATE ledger_entries','UPDATE _faji_migrations SET checksum=checksum'])await assert.rejects(runtime.query(sql),{code:'42501'});
   assert.equal((await runtime.query("SELECT has_database_privilege(current_user,'keycloak_m1_sentinel','CONNECT') AS allowed")).rows[0].allowed,false);
  });
  await t.test('immutable environment initializes concurrently with SELECT/INSERT only and rejects a different provider domain',async()=>{
   assert.equal((await runtime.query("SELECT has_table_privilege(current_user,'finance_environment','UPDATE') AS allowed")).rows[0].allowed,false);
   await Promise.all(Array.from({length:4},()=>ledger.tx(randomUUID(),c=>ledger.environment(c,'test'))));
   assert.deepEqual((await runtime.query('SELECT environment FROM finance_environment')).rows,[{environment:'test'}]);
   await assert.rejects(()=>ledger.tx(randomUUID(),c=>ledger.environment(c,'live')),{status:409});
   await assert.rejects(runtime.query("UPDATE finance_environment SET environment='live'"),{code:'42501'});
  });
  await t.test('server-priced checkout persists once, capture allocates exact fee and policy snapshots and gates fulfilment',async()=>{
   const f=await fixture(),o=await order(f);await assert.rejects(()=>merchant.orderStatus(owner,f.business,f.branch,o.order,'accepted'));
   const init=await checkout(o.id),count=fake.count('POST','/transaction/initialize');const replay=await checkout(o.id);assert.equal(replay.authorizationUrl,init.authorizationUrl);
   assert.equal(fake.count('POST','/transaction/initialize'),count);
   await assert.rejects(()=>commerce.checkout(identity(b),o.id,'fixture@example.invalid'),{status:404});
   const charge=await capture(o.id);assert.equal(charge.amount,10001);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM ledger_entries WHERE intent_id=$1',[o.id])).rows[0].n,1);
   assert.equal(await balance('merchant_payable:'+f.business),9849n); // gross 10001, commission 137, verified fee 15
   const terms=(await admin.query('SELECT commission_minor::text,merchant_minor::text FROM payment_terms WHERE intent_id=$1',[o.id])).rows[0];assert.deepEqual(terms,{commission_minor:'137',merchant_minor:'9864'});
   await operations.policy('fixture-admin',f.business,{...policy,commissionBps:5000});assert.equal((await admin.query('SELECT commission_minor::text FROM payment_terms WHERE intent_id=$1',[o.id])).rows[0].commission_minor,'137');
   await assert.rejects(admin.query('UPDATE finance_policies SET commission_bps=0 WHERE business_id=$1',[f.business]));await assert.rejects(admin.query('UPDATE payment_terms SET merchant_minor=1 WHERE intent_id=$1',[o.id]));
   await fulfil(f,o.order);assert.ok((await admin.query('SELECT eligible_at<=now() AS yes FROM payment_terms WHERE intent_id=$1',[o.id])).rows[0].yes);
   await assert.rejects(()=>operations.merchantFinance(identity(b),f.business,10,0),{status:403});
  });
  await t.test('lost initialization stays uncertain and an explicit same-reference retry cannot create a second charge',async()=>{
   const f=await fixture(),o=await order(f);fake.loseInitializationResponse=true;await assert.rejects(()=>checkout(o.id));
   const state=(await admin.query('SELECT state FROM checkout_sessions WHERE intent_id=$1',[o.id])).rows[0];assert.equal(state.state,'uncertain');
   const calls=fake.count('POST','/transaction/initialize');const retry=await commerce.checkout(identity(a),o.id,'fixture@example.invalid');assert.equal(retry.checkoutEnabled,false);assert.equal(fake.count('POST','/transaction/initialize'),calls);
   await admin.query("UPDATE checkout_sessions SET attempted_at=now()-interval '1 minute' WHERE intent_id=$1",[o.id]);await assert.rejects(()=>commerce.retryInitialization('fixture-admin',o.id));assert.equal((await admin.query('SELECT count(*)::int AS n FROM payment_order_links WHERE order_id=$1',[o.order])).rows[0].n,1);
   await capture(o.id);assert.equal((await commerce.checkout(identity(a),o.id,'fixture@example.invalid')).state,'paid');
  });
  await t.test('concurrent holds consume one seat; expiry releases once; a late capture creates refund without a reservation',async()=>{
   const f=await fixture(),input={kind:'reservation' as const,sourceId:f.slot,quantity:1,guestName:'Fixture',requestKey:randomUUID()};
   const [one,two]=await Promise.all([commerce.hold(identity(a),input),commerce.hold(identity(a),input)]);assert.equal(one.id,two.id);
   await assert.rejects(()=>commerce.hold(identity(b),{...input,requestKey:randomUUID()}),{status:409});
   await checkout(one.paymentIntentId);await timeFixture('paid_holds',one.id);await Promise.all([commerce.expire(),commerce.expire()]);
   assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[f.slot])).rows[0].reserved,0);
   await capture(one.paymentIntentId);assert.equal((await admin.query('SELECT count(*)::int AS n FROM business_reservations WHERE availability_id=$1',[f.slot])).rows[0].n,0);
   const refund=(await admin.query('SELECT amount_minor::text,state FROM finance_refunds WHERE intent_id=$1',[one.paymentIntentId])).rows[0];assert.deepEqual(refund,{amount_minor:'10001',state:'approved'});
   assert.equal((await commerce.holds(a,100,0)).find(h=>h.id===one.id)?.status,'expired');
  });
  await t.test('verified paid reservation confirms once; cancellation restores capacity and refunds remaining capture',async()=>{
   const f=await fixture(),hold=await commerce.hold(identity(a),{kind:'reservation',sourceId:f.slot,quantity:1,guestName:'Fixture',requestKey:randomUUID()});await checkout(hold.paymentIntentId);await capture(hold.paymentIntentId);
   const confirmed=(await commerce.holds(a,100,0)).find(h=>h.id===hold.id)!;assert.equal(confirmed.status,'confirmed');assert.ok(confirmed.reservationId);
   await Promise.all([commerce.cancel(identity(a),hold.id),commerce.cancel(identity(a),hold.id)]);
   assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[f.slot])).rows[0].reserved,0);assert.equal((await admin.query('SELECT count(*)::int AS n FROM finance_refunds WHERE intent_id=$1',[hold.paymentIntentId])).rows[0].n,1);
  });
  await t.test('ticket inventory, owned QR, wrong-branch denial and concurrent one-time redemption',async()=>{
   const f=await fixture(),hold=await commerce.hold(identity(a),{kind:'ticket',sourceId:f.event,quantity:2,guestName:'Fixture',requestKey:randomUUID()});await checkout(hold.paymentIntentId);await capture(hold.paymentIntentId);
   await assert.rejects(()=>commerce.hold(identity(b),{kind:'ticket',sourceId:f.event,quantity:1,guestName:'Other',requestKey:randomUUID()}),{status:409});
   const tickets=(await commerce.tickets(a,100,0)).filter(v=>v.holdId===hold.id);assert.equal(tickets.length,2);assert.ok(!(await commerce.tickets(b,100,0)).some(v=>v.holdId===hold.id));
   await assert.rejects(()=>commerce.redeem(identity(owner),f.business,randomUUID(),tickets[0].qrToken!),{status:404});
   await timeFixture('business_event_config',f.event);
   const attempts=await Promise.allSettled([commerce.redeem(identity(owner),f.business,f.branch,tickets[0].qrToken!),commerce.redeem(identity(owner),f.business,f.branch,tickets[0].qrToken!)]);assert.equal(attempts.filter(v=>v.status==='fulfilled').length,1);
   await assert.rejects(()=>commerce.cancel(identity(a),hold.id),{status:409});
   const refund=await operations.adminRefund('fixture-admin',hold.paymentIntentId,{requestKey:randomUUID(),amountMinor:'20002',reason:'Synthetic support refund'});await operations.decision('fixture-admin',refund.id,true);
   await assert.rejects(()=>commerce.redeem(identity(owner),f.business,f.branch,tickets[1].qrToken!),{status:409});
   assert.equal((await admin.query('SELECT issued FROM ticket_inventory WHERE catalogue_id=$1',[f.event])).rows[0].issued,1);
  });
  await t.test('ambiguous refund is discovered without another POST; verified processing is idempotent; cumulative excess is rejected',async()=>{
   const f=await fixture(),o=await order(f);await checkout(o.id);await capture(o.id);
   const r=await operations.requestRefund(identity(a),o.id,{requestKey:randomUUID(),amountMinor:'3000',reason:'Synthetic partial refund'});await operations.decision('fixture-admin',r.id,true);
   fake.loseRefundResponse=true;const before=fake.count('POST','/refund');assert.equal(await operations.submitRefund(r.id),false);assert.equal(await operations.submitRefund(r.id),false);assert.equal(fake.count('POST','/refund'),before+1);
   const provider=(await admin.query('SELECT provider_id FROM finance_refunds WHERE id=$1',[r.id])).rows[0].provider_id;fake.refunds.get(provider).status='processed';await Promise.all([operations.reconcileRefund(r.id),operations.reconcileRefund(r.id)]);
   assert.equal((await admin.query("SELECT count(*)::int AS n FROM finance_postings WHERE posting_key=$1",[r.id+':processed'])).rows[0].n,1);
   const excess=await operations.adminRefund('fixture-admin',o.id,{requestKey:randomUUID(),amountMinor:'8000',reason:'Synthetic excessive refund'});await assert.rejects(()=>operations.decision('fixture-admin',excess.id,true),{status:409});await operations.decision('fixture-admin',excess.id,false);
   const failed=await operations.adminRefund('fixture-admin',o.id,{requestKey:randomUUID(),amountMinor:'1000',reason:'Synthetic failed refund'});await operations.decision('fixture-admin',failed.id,true);const reserved=await balance('merchant_payable:'+f.business);await operations.submitRefund(failed.id);const fp=(await admin.query('SELECT provider_id FROM finance_refunds WHERE id=$1',[failed.id])).rows[0].provider_id;fake.refunds.get(fp).status='failed';await operations.reconcileRefund(failed.id);assert.ok(await balance('merchant_payable:'+f.business)>reserved);
   await operations.cancelResource('order',o.order);assert.equal((await admin.query("SELECT amount_minor::text FROM finance_refunds WHERE intent_id=$1 AND request_key='system-unfulfilled'",[o.id])).rows[0].amount_minor,'7001');
  });
  await t.test('failed order retry keeps stable attempts and late old success never confirms a second purchase',async()=>{
   const f=await fixture(),o=await order(f);const foreign=await order(f),extra=await order(f);await assert.rejects(admin.query('INSERT INTO payment_order_attempts(intent_id,order_id,previous_intent_id) VALUES($1,$2,$3)',[extra.id,o.order,foreign.id]),/same unpaid order/);await checkout(o.id);const p=(await admin.query('SELECT provider_reference FROM payment_intents WHERE id=$1',[o.id])).rows[0];fake.transactions.get(p.provider_reference).status='failed';
   const key=randomUUID(),retry=await commerce.retryOrder(identity(a),o.order,o.id,key);assert.equal((await commerce.retryOrder(identity(a),o.order,o.id,key)).paymentIntentId,retry.paymentIntentId);await checkout(retry.paymentIntentId);await capture(retry.paymentIntentId);await capture(o.id);
   assert.equal((await admin.query('SELECT resolution FROM payment_terms WHERE intent_id=$1',[o.id])).rows[0].resolution,'refund_required');assert.equal((await admin.query('SELECT resolution FROM payment_terms WHERE intent_id=$1',[retry.paymentIntentId])).rows[0].resolution,'confirmed');
  });
  await t.test('settlement claims race safely; OTP requires canonical success; reversal compensates and fee recovery remains exact',async()=>{
   const f=await fixture(),o=await order(f);await checkout(o.id);await capture(o.id);await fulfil(f,o.order);
   const recipient=await operations.registerRecipient('fixture-admin',f.business,'RCP_fixture'),key=randomUUID();
   const simultaneous=await Promise.all([operations.batch('fixture-admin',f.business,recipient.id,key),operations.batch('fixture-admin',f.business,recipient.id,key)]);assert.equal(simultaneous[0].id,simultaneous[1].id);const batch=simultaneous[0];assert.equal(batch.amountMinor,'9849');
   await assert.rejects(()=>operations.batch('fixture-admin',f.business,recipient.id,randomUUID()),{status:409});
   fake.transferState='otp';fake.loseTransferResponse=true;const submissions=fake.count('POST','/transfer');assert.equal(await operations.submitPayout(batch.id),false);assert.equal(await operations.submitPayout(batch.id),false);assert.equal(fake.count('POST','/transfer'),submissions+1);assert.equal((await admin.query('SELECT state FROM settlement_batches WHERE id=$1',[batch.id])).rows[0].state,'otp');await operations.finalize('fixture-admin',batch.id,'123456');await Promise.all([operations.reconcilePayout(batch.id),operations.reconcilePayout(batch.id)]);
   assert.equal(await balance('merchant_payable:'+f.business),0n);assert.equal(await balance('merchant_recoverable:'+f.business),-10n);
   const ref=(await admin.query('SELECT provider_reference FROM settlement_batches WHERE id=$1',[batch.id])).rows[0].provider_reference;fake.transfers.get(ref).status='reversed';fake.transfers.get(ref).fee_charged=0;await operations.reconcilePayout(batch.id);await operations.reconcilePayout(batch.id);
   assert.equal(await balance('merchant_payable:'+f.business),9849n);assert.equal(await balance('merchant_recoverable:'+f.business),0n);
   const next=await operations.batch('fixture-admin',f.business,recipient.id,randomUUID());await operations.cancelPayout('fixture-admin',next.id);assert.equal(await balance('merchant_payable:'+f.business),9849n);fake.transferState='success';
  });
  await t.test('post-payout refunds create recovery debt and the next eligible balance can be a recovery-only idempotent batch',async()=>{
   const f=await fixture(),o=await order(f);await checkout(o.id);await capture(o.id);await fulfil(f,o.order);const recipient=await operations.registerRecipient('fixture-admin',f.business,'RCP_recovery');
   const first=await operations.batch('fixture-admin',f.business,recipient.id,randomUUID());await operations.submitPayout(first.id);
   const refund=await operations.adminRefund('fixture-admin',o.id,{requestKey:randomUUID(),amountMinor:'10001',reason:'Synthetic post-payout refund'});await operations.decision('fixture-admin',refund.id,true);assert.ok(await balance('merchant_recoverable:'+f.business)<-9849n);
   const second=await order(f);await checkout(second.id);await capture(second.id);await fulfil(f,second.order);const key=randomUUID(),batch=await operations.batch('fixture-admin',f.business,recipient.id,key);assert.equal(batch.status,'recovered');assert.equal(batch.amountMinor,'0');assert.equal(batch.recoveredMinor,'9849');assert.equal((await operations.batch('fixture-admin',f.business,recipient.id,key)).id,batch.id);assert.equal(await balance('merchant_payable:'+f.business),0n);
  });
  await t.test('disputes reserve exposure, a win restores funding and partial loss consumes only verified loss',async()=>{
   const f=await fixture(),o=await order(f);await checkout(o.id);const charge=await capture(o.id);const before=await balance('merchant_payable:'+f.business);
   const d={id:String(++fake.serial),transaction:{id:charge.id},currency:'NGN',domain:'test',status:'pending',amount:10001};fake.disputes.set(d.id,d);await operations.reconcileDispute(d.id);assert.equal(await balance('merchant_payable:'+f.business),0n);
   Object.assign(d,{status:'resolved',resolution:'declined'});await operations.reconcileDispute(d.id);assert.equal(await balance('merchant_payable:'+f.business),before);
   const lost={...d,id:String(++fake.serial),status:'pending'};fake.disputes.set(lost.id,lost);await operations.reconcileDispute(lost.id);Object.assign(lost,{status:'resolved',resolution:'merchant-accepted',refund_amount:3333});await operations.reconcileDispute(lost.id);await operations.reconcileDispute(lost.id);
   assert.equal((await admin.query('SELECT resolved_amount_minor::text FROM finance_disputes WHERE provider_id=$1',[lost.id])).rows[0].resolved_amount_minor,'3333');assert.equal(await balance('dispute_reserve'),0n);
   const r=await operations.adminRefund('fixture-admin',o.id,{requestKey:randomUUID(),amountMinor:'100',reason:'Must not exceed chargeback exposure'});await assert.rejects(()=>operations.decision('fixture-admin',r.id,true),{status:409});
  });
  await t.test('worker deduplicates outbox, recovers expired leases and dead-letters repeated errors with redacted diagnostics',async()=>{
   const consumed=await jobs.consume(10000);assert.ok(consumed>0);assert.equal(await jobs.consume(10000),0);
   const poison=randomUUID();await admin.query("INSERT INTO finance_jobs(id,kind,resource_id,state,attempts,lease_id,lease_until,next_at) VALUES($1,'poison',$2,'running',7,$3,now()-interval '1 minute',now()-interval '1 day')",[poison,randomUUID(),randomUUID()]);
   await jobs.tick(1);const row=(await admin.query('SELECT state,attempts,last_error FROM finance_jobs WHERE id=$1',[poison])).rows[0];assert.deepEqual(row,{state:'dead',attempts:8,last_error:'Error'});
   const f=await fixture(),o=await order(f);await checkout(o.id);await capture(o.id);await assert.rejects(admin.query('UPDATE finance_postings SET amount_minor=1 WHERE intent_id=$1',[o.id]));
   const foreign=await fixture();await assert.rejects(()=>ledger.intentTx(o.id,async(c,p)=>ledger.post(c,randomUUID(),p.id,'merchant_payable:'+foreign.business,'gateway_clearing',1n)));
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM (SELECT posting_key FROM finance_postings GROUP BY posting_key HAVING count(*)>1) x')).rows[0].n,0);
  });
 }finally{
  globalThis.fetch=previousFetch;for(const key of ['PAYSTACK_SECRET_KEY','PAYMENT_CALLBACK_URL','TICKET_SIGNING_KEYS','TICKET_ACTIVE_KEY_ID']){if(environment[key]===undefined)delete process.env[key];else process.env[key]=environment[key];}await Promise.all([admin.end(),runtime.end()]);
 }
});
