import 'reflect-metadata';
import {after, before, test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {grantM5Runtime} from '../../../packages/database/scripts/grant-m5-runtime';
import {AccessService} from '../src/auth/access.service';
import type {VerifiedIdentity} from '../src/auth/identity.types';
import {BusinessService} from '../src/business/business.service';
import {CustomerService} from '../src/customer/customer.service';
import {FinanceLedger} from '../src/payments/finance-ledger.service';
import {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import {FinancialOperations} from '../src/payments/financial-operations.service';
import {OrderIntentsService} from '../src/payments/order-intents.service';
import {PaymentReadsService} from '../src/payments/payment-reads.service';
import {PaymentsService} from '../src/payments/payments.service';
import {PaystackGateway} from '../src/payments/paystack.gateway';

const migrationUrl=process.env.FAJI_DATABASE_URL;
const runtimeUrl=process.env.FAJI_RUNTIME_DATABASE_URL;
assert.ok(migrationUrl,'FAJI_DATABASE_URL required');
assert.ok(runtimeUrl,'FAJI_RUNTIME_DATABASE_URL required');
assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m[35]_test_[a-z0-9_]+$/);
const admin=new Pool({connectionString:migrationUrl,max:3,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:runtimeUrl,max:16,connectionTimeoutMillis:3000});
const customers=new CustomerService(runtime);
const ledger=new FinanceLedger(runtime);
const commerce=new CommerceLifecycle(ledger,customers);
const gateway=new PaystackGateway();
const operations=new FinancialOperations(ledger,commerce,gateway);
const payments=new PaymentsService(runtime,gateway,commerce,operations);
const preparations=new OrderIntentsService(customers);
const reads=new PaymentReadsService(runtime);
const merchant=new BusinessService(runtime,new AccessService(runtime));
const suffix=randomUUID(),owner='sim-owner-'+suffix,customer='sim-customer-'+suffix,other='sim-other-'+suffix;
const identity=(subject:string):VerifiedIdentity=>({subject,issuer:'https://fixture.invalid',audience:['faji-api'],roles:['customer'],
 issuedAt:Math.floor(Date.now()/1000)-1,expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:subject});
const policy={commissionBps:137,gatewayFeeBearer:'merchant' as const,payoutFeeBearer:'merchant' as const,
 settlementDelayHours:0,refundWindowHours:48,cancellationCutoffMinutes:30,holdMinutes:5};
let business:string,branch:string,product:string;
const priorMode=process.env.FAJI_PAYMENT_MODE,priorSecret=process.env.PAYSTACK_SECRET_KEY,priorFetch=globalThis.fetch;
const forbiddenFetch:typeof fetch=async()=>{throw new Error('Simulated payment attempted network access');};

before(async()=>{
 const database=new URL(migrationUrl!),runtimeDatabase=new URL(runtimeUrl!);
 assert.equal(runtimeDatabase.host,database.host);assert.equal(runtimeDatabase.pathname,database.pathname);
 assert.notEqual(runtimeDatabase.username,database.username);
 await assertDisposable(admin);await applyMigrations(admin);await grantM5Runtime(admin,runtimeDatabase.toString());
 process.env.FAJI_PAYMENT_MODE='simulated';delete process.env.PAYSTACK_SECRET_KEY;globalThis.fetch=forbiddenFetch;
 for(const subject of [owner,customer,other]){
  await admin.query('INSERT INTO account_access(identity_subject) VALUES($1)',[subject]);
  await admin.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[subject]);
 }
 business=(await admin.query(`INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at)
  VALUES($1,'Simulation acceptance','approved','simulation-test-admin',now()) RETURNING id`,[owner])).rows[0].id;
 await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,business]);
 branch=(await merchant.createBranch(owner,business,{name:'Simulation branch'})).id as string;
 product=(await merchant.createItem(owner,business,branch,{name:'Simulation item',kind:'product',priceMinor:12345,published:true})).id as string;
 await operations.policy('simulation-test-admin',business,policy);
});

after(async()=>{
 globalThis.fetch=priorFetch;
 if(priorMode===undefined)delete process.env.FAJI_PAYMENT_MODE;else process.env.FAJI_PAYMENT_MODE=priorMode;
 if(priorSecret===undefined)delete process.env.PAYSTACK_SECRET_KEY;else process.env.PAYSTACK_SECRET_KEY=priorSecret;
 await Promise.all([admin.end(),runtime.end()]);
});

async function prepare(subject=customer,key=randomUUID()){
 const order=await customers.placeOrder(identity(subject),{branchId:branch,requestKey:randomUUID(),
  items:[{catalogueId:product,quantity:1,expectedPriceMinor:'12345'}]});
 const intent=await preparations.prepare(identity(subject),order.id,key);
 const replay=await preparations.prepare(identity(subject),order.id,key);
 assert.equal(replay.paymentIntentId,intent.paymentIntentId);
 await commerce.checkout(identity(subject),intent.paymentIntentId,subject+'@example.invalid');
 return {order:intent.orderId,id:intent.paymentIntentId};
}

test('simulated payment outcomes persist atomically, are terminal/idempotent, and never call a provider',async()=>{
 const succeeded=await prepare(),failed=await prepare(),cancelled=await prepare(),pending=await prepare();
 const capture=await Promise.all(Array.from({length:5},()=>payments.simulate('simulation-admin',succeeded.id,'succeeded')));
 assert.equal(capture.filter(result=>!result.replayed).length,1);
 assert.equal(capture.every(result=>result.status==='succeeded'&&result.mode==='simulated'),true);
 assert.deepEqual(await payments.simulate('simulation-admin',failed.id,'failed'),{
  paymentIntentId:failed.id,status:'failed',replayed:false,mode:'simulated'
 });
 assert.equal((await payments.simulate('simulation-admin',failed.id,'failed')).replayed,true);
 await assert.rejects(()=>payments.simulate('simulation-admin',failed.id,'succeeded'),{status:409});
 assert.deepEqual(await payments.simulate('simulation-admin',cancelled.id,'cancelled'),{
  paymentIntentId:cancelled.id,status:'cancelled',replayed:false,mode:'simulated'
 });
 assert.equal((await payments.simulate('simulation-admin',cancelled.id,'cancelled')).replayed,true);
 await assert.rejects(()=>payments.simulate('simulation-admin',cancelled.id,'succeeded'),{status:409});

 const rows=(await admin.query(`SELECT p.id,p.status,p.amount_minor::text,p.currency,p.execution_mode,
  (SELECT count(*)::int FROM payment_receipts r WHERE r.intent_id=p.id) AS receipts,
  (SELECT count(*)::int FROM ledger_entries j WHERE j.intent_id=p.id) AS journals,
  (SELECT count(*)::int FROM payment_lifecycle_events e WHERE e.intent_id=p.id) AS history
  FROM payment_intents p WHERE p.id=ANY($1::uuid[]) ORDER BY p.id`,[[succeeded.id,failed.id,cancelled.id,pending.id]])).rows;
 const byId=new Map(rows.map(row=>[row.id,row]));
 assert.equal(byId.get(succeeded.id)?.status,'succeeded');
 assert.equal(byId.get(succeeded.id)?.amount_minor,'12345');
 assert.equal(byId.get(succeeded.id)?.currency,'NGN');
 assert.equal(byId.get(succeeded.id)?.execution_mode,'simulated');
 assert.deepEqual([byId.get(succeeded.id)?.receipts,byId.get(succeeded.id)?.journals],[1,1]);
 assert.deepEqual([byId.get(failed.id)?.status,byId.get(failed.id)?.receipts,byId.get(failed.id)?.journals],['failed',0,0]);
 assert.deepEqual([byId.get(cancelled.id)?.status,byId.get(cancelled.id)?.receipts,byId.get(cancelled.id)?.journals],['cancelled',0,0]);
 assert.deepEqual([byId.get(pending.id)?.status,byId.get(pending.id)?.receipts,byId.get(pending.id)?.journals],['pending',0,0]);
 for(const id of [succeeded.id,failed.id,cancelled.id,pending.id]){
  const history=await runtime.query('SELECT event_type,previous_status,resulting_status,source FROM payment_lifecycle_events WHERE intent_id=$1 ORDER BY created_at,id',[id]);
  assert.equal(history.rows[0].event_type,'created');
  assert.equal(history.rows[0].source,'system');
 }
 const successHistory=(await runtime.query("SELECT event_type,source FROM payment_lifecycle_events WHERE intent_id=$1 AND event_type='simulated_success'",[succeeded.id])).rows;
 assert.deepEqual(successHistory,[{event_type:'simulated_success',source:'simulation'}]);
 assert.equal((await reads.customerPayment(customer,succeeded.id)).events.at(-1)?.type,'simulated_success');
 await assert.rejects(()=>reads.customerPayment(other,succeeded.id),{status:404});
 const unique=(await admin.query('SELECT count(DISTINCT provider_reference)::int AS references FROM payment_intents WHERE id=ANY($1::uuid[])',[[succeeded.id,failed.id,cancelled.id,pending.id]])).rows[0];
 assert.equal(unique.references,4);
 assert.equal((await runtime.query('SELECT count(*)::int AS n FROM finance_operation_events WHERE resource_type=$1 AND resource_id=ANY($2::text[])',['payment',[succeeded.id,failed.id,cancelled.id]])).rows[0].n,4);
});

test('simulation is opt-in and terminal payment states are protected by database constraints',async()=>{
 const payment=await prepare(),mode=process.env.FAJI_PAYMENT_MODE;
 delete process.env.FAJI_PAYMENT_MODE;
 await assert.rejects(()=>payments.simulate('simulation-admin',payment.id,'succeeded'),{status:503});
 process.env.FAJI_PAYMENT_MODE=mode;
 await payments.simulate('simulation-admin',payment.id,'failed');
 await assert.rejects(runtime.query("UPDATE payment_intents SET status='succeeded',verified_at=now() WHERE id=$1",[payment.id]));
 await assert.rejects(runtime.query("UPDATE payment_lifecycle_events SET actor_subject='forged' WHERE intent_id=$1",[payment.id]));
 await assert.rejects(()=>payments.simulate('simulation-admin',payment.id,'cancelled'),{status:409});
});
