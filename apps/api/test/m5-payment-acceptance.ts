import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {Pool} from 'pg';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {PaymentsService} from '../src/payments/payments.service';
import {PaymentReadsService} from '../src/payments/payment-reads.service';

test('M5 PostgreSQL: migrations, concurrent replay, immutable balanced postings and atomic rollback',async()=>{
 assert.ok(process.env.FAJI_DATABASE_URL,'FAJI_DATABASE_URL required');
 assert.ok(process.env.FAJI_RUNTIME_DATABASE_URL,'A separate restricted runtime URL is required');
 assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m5_test_[a-z0-9_]+$/);
 const migrationUrl=new URL(process.env.FAJI_DATABASE_URL),runtimeUrl=new URL(process.env.FAJI_RUNTIME_DATABASE_URL);
 assert.equal(runtimeUrl.host,migrationUrl.host);assert.equal(runtimeUrl.pathname,migrationUrl.pathname);
 assert.notEqual(runtimeUrl.username,migrationUrl.username);
 assert.match(runtimeUrl.username,/^[a-z_][a-z0-9_]*$/);
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:2,connectionTimeoutMillis:3000});
 const runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:12,connectionTimeoutMillis:3000});
 const subject='m5_'+randomUUID(),reference='faji_'+randomUUID(),key=randomUUID();
 try{
  await assertDisposable(pool);await assertDisposable(runtime);await applyMigrations(pool);await applyMigrations(pool);
  const role='"'+runtimeUrl.username+'"';
  await pool.query('GRANT USAGE ON SCHEMA public TO '+role);
  await pool.query('GRANT SELECT,INSERT,UPDATE ON payment_intents TO '+role);
  await pool.query('GRANT SELECT,INSERT ON payment_receipts,ledger_entries,audit_events,outbox_events TO '+role);
  await pool.query('GRANT SELECT ON ledger_accounts TO '+role);
  const privileges=(await runtime.query('SELECT rolsuper,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user')).rows[0];
  assert.deepEqual(privileges,{rolsuper:false,rolcreaterole:false,rolcreatedb:false});
  assert.equal((await runtime.query("SELECT count(*)::int AS n FROM pg_tables WHERE tablename IN ('payment_intents','payment_receipts','ledger_entries','ledger_accounts') AND tableowner=current_user")).rows[0].n,0);
  await assert.rejects(runtime.query('CREATE TABLE m5_privilege_escape(id integer)'),{code:'42501'});
  await assert.rejects(runtime.query('TRUNCATE ledger_entries'),{code:'42501'});
  await assert.rejects(runtime.query('UPDATE _faji_migrations SET checksum=checksum'),{code:'42501'});
  await pool.query('INSERT INTO account_access(identity_subject) VALUES($1)',[subject]);
  const business=(await pool.query("INSERT INTO business_onboarding(applicant_subject,display_name) VALUES($1,'M5 Fixture') RETURNING id",[subject])).rows[0].id;
  const intent=(await pool.query(`INSERT INTO payment_intents(customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
   VALUES($1,$2,$3,$4,'test',12500,'NGN') RETURNING id`,[subject,business,key,reference])).rows[0].id;
  const gateway=new PaystackGateway();
  process.env.PAYSTACK_SECRET_KEY='sk_test_disposablefixture';
  gateway.verify=async()=>({id:BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString(),reference,amountMinor:12500,currency:'NGN',environment:'test'});
  // Keep a stable provider transaction identity across concurrent callbacks.
  const charge=await gateway.verify(reference);gateway.verify=async()=>charge;
  const service=new PaymentsService(runtime,gateway);
  const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference}}));
  const signature=createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  await Promise.all(Array.from({length:12},()=>service.webhook(raw,signature)));
  const state=(await pool.query(`SELECT p.status,(SELECT count(*) FROM payment_receipts WHERE intent_id=p.id)::int AS receipts,
   (SELECT count(*) FROM ledger_entries WHERE intent_id=p.id)::int AS journals,
   (SELECT count(*) FROM audit_events WHERE resource_id=p.id AND action='payment.verified')::int AS audits,
   (SELECT count(*) FROM outbox_events WHERE event_type='payment.verified' AND payload::jsonb->>'paymentIntentId'=p.id::text)::int AS events
   FROM payment_intents p WHERE p.id=$1`,[intent])).rows[0];
  assert.deepEqual(state,{status:'succeeded',receipts:1,journals:1,audits:1,events:1});
  await assert.rejects(runtime.query('DELETE FROM payment_receipts WHERE intent_id=$1',[intent]),{code:'42501'});
  await assert.rejects(runtime.query('UPDATE ledger_entries SET amount_minor=1 WHERE intent_id=$1',[intent]),{code:'42501'});
  const reads=new PaymentReadsService(runtime);
  const owned=await reads.customerPayment(subject,intent);
  assert.equal(owned.amountMinor,'12500');assert.equal(owned.status,'succeeded');
  await assert.rejects(()=>reads.customerPayment('foreign-customer',intent),{status:404});
  assert.equal((await reads.reconciliation('m5-admin-fixture',intent)).internalStatus,'consistent');
  const duplicate=(await pool.query("INSERT INTO outbox_events(event_type,payload) VALUES('payment.verified',$1) RETURNING id",[JSON.stringify({paymentIntentId:intent})])).rows[0].id;
  const inconsistent=await reads.reconciliation('m5-admin-fixture',intent);
  assert.equal(inconsistent.internalStatus,'inconsistent');assert.deepEqual(inconsistent.issues,['outbox']);
  await pool.query('DELETE FROM outbox_events WHERE id=$1',[duplicate]);
  for(const sql of [
   'UPDATE ledger_entries SET amount_minor=1 WHERE intent_id=$1',
   'DELETE FROM ledger_entries WHERE intent_id=$1',
   'DELETE FROM payment_receipts WHERE intent_id=$1',
   "UPDATE payment_intents SET status='pending',verified_at=NULL WHERE id=$1",
   'UPDATE payment_intents SET amount_minor=1 WHERE id=$1'
  ])await assert.rejects(pool.query(sql,[intent]));

  const pending=(await pool.query(`INSERT INTO payment_intents(customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
   VALUES($1,$2,$3,$4,'test',500,'NGN') RETURNING id`,[subject,business,randomUUID(),'faji_'+randomUUID()])).rows[0].id;
  await assert.rejects(pool.query("UPDATE payment_intents SET status='succeeded',verified_at=now() WHERE id=$1",[pending]),/reconcile/);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("INSERT INTO payment_receipts(intent_id,provider_transaction_id,payload_sha256) VALUES($1,$2,repeat('a',64))",[pending,randomUUID()]);
   await client.query(`INSERT INTO ledger_entries(intent_id,debit_account_id,credit_account_id,currency,amount_minor)
    SELECT $1,d.id,c.id,'NGN',499 FROM ledger_accounts d,ledger_accounts c WHERE d.code='gateway_clearing' AND c.code='customer_funds'`,[pending]);
   await client.query("UPDATE payment_intents SET status='succeeded',verified_at=now() WHERE id=$1",[pending]);
   await assert.rejects(client.query('COMMIT'),/reconcile/);
   await client.query('ROLLBACK');
  }finally{client.release();}
  assert.equal((await pool.query('SELECT status FROM payment_intents WHERE id=$1',[pending])).rows[0].status,'pending');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM payment_receipts WHERE intent_id=$1',[pending])).rows[0].n,0);

  // A missed webhook can be recovered; concurrent recovery and webhook attempts share one posting path.
  const recoveryReference='faji_'+randomUUID();
  const recoveryIntent=(await pool.query(`INSERT INTO payment_intents(customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency)
   VALUES($1,$2,$3,$4,'test',12500,'NGN') RETURNING id`,[subject,business,randomUUID(),recoveryReference])).rows[0].id;
  gateway.verify=async ref=>({...charge,id:(BigInt(charge.id)+1n).toString(),reference:ref});
  const recoveryPayload=Buffer.from(JSON.stringify({event:'charge.success',data:{reference:recoveryReference}}));
  const recoverySignature=createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(recoveryPayload).digest('hex');
  await Promise.all([
   ...Array.from({length:6},()=>service.recheck('m5-admin-fixture',recoveryIntent)),
   ...Array.from({length:6},()=>service.webhook(recoveryPayload,recoverySignature))
  ]);
  const recovered=(await pool.query(`SELECT r.evidence_source,r.verification_actor,
   (SELECT count(*)::int FROM ledger_entries WHERE intent_id=r.intent_id) AS journals,
   (SELECT count(*)::int FROM audit_events WHERE resource_id=r.intent_id AND action='payment.verified') AS captures,
   (SELECT count(*)::int FROM audit_events WHERE resource_id=r.intent_id AND action='payment.provider_recheck_confirmed') AS rechecks
   FROM payment_receipts r WHERE intent_id=$1`,[recoveryIntent])).rows[0];
  assert.equal(recovered.journals,1);assert.equal(recovered.captures,1);assert.equal(recovered.rechecks,6);
  assert.ok(['webhook','provider_recheck'].includes(recovered.evidence_source));
  assert.equal(recovered.verification_actor,recovered.evidence_source==='webhook'?null:'m5-admin-fixture');
  assert.equal((await reads.reconciliation('m5-admin-fixture',recoveryIntent)).internalStatus,'consistent');
  for(const [source,actor] of [['provider_recheck',null],['webhook','untrusted-actor']])
   await assert.rejects(pool.query("INSERT INTO payment_receipts(intent_id,provider_transaction_id,payload_sha256,evidence_source,verification_actor) VALUES($1,$2,repeat('b',64),$3,$4)",[pending,randomUUID(),source,actor]),{code:'23514'});
 }finally{await Promise.all([pool.end(),runtime.end()]);}
 // Preserve append-only evidence in this disposable database; discard the database after review.
});
