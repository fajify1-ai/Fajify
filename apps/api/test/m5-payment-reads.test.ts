import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NotFoundException} from '@nestjs/common';
import type {Pool} from 'pg';
import {PaymentReadsService,reconcileCapture,type CaptureSnapshot} from '../src/payments/payment-reads.service';

const id='ae5d7bce-c422-4eae-bf45-e68e46c06c11';
const captured:CaptureSnapshot={id,status:'succeeded',amount_minor:'9007199254740991',currency:'NGN',
 created_at:new Date('2026-11-01T00:00:00Z'),verified_at:new Date('2026-11-01T00:01:00Z'),
 receipt_id:id,journal_id:id,journal_amount:'9007199254740991',journal_currency:'NGN',
 debit_code:'gateway_clearing',credit_code:'customer_funds',audit_count:1,outbox_count:1};

test('M5 reads: customer projection preserves exact money strings and excludes provider/private records',async()=>{
 let parameters:unknown[]|undefined;
 const pool={query:async(sql:string,args:unknown[])=>{
  assert.match(sql,/WHERE id=\$1 AND customer_subject=\$2/);parameters=args;
  return {rows:[{...captured,provider_reference:'private',customer_subject:'customer',business_id:'private',unexpected:'private'}]};
 }} as unknown as Pool;
 const value=await new PaymentReadsService(pool).customerPayment('customer',id);
 assert.deepEqual(parameters,[id,'customer']);
 assert.deepEqual(value,{paymentIntentId:id,status:'succeeded',amountMinor:'9007199254740991',currency:'NGN',
  createdAt:'2026-11-01T00:00:00.000Z',verifiedAt:'2026-11-01T00:01:00.000Z'});
});
test('M5 reads: missing or foreign payment returns the same not-found result',async()=>{
 const pool={query:async()=>({rows:[]})} as unknown as Pool;
 const service=new PaymentReadsService(pool);
 for(const subject of ['owner','foreign'])await assert.rejects(()=>service.customerPayment(subject,id),NotFoundException);
 await assert.rejects(()=>service.reconciliation('admin',id),NotFoundException);
});
test('M5 reconciliation: consistent capture is explicitly limited to internal records',()=>{
 const report=reconcileCapture(captured);
 assert.equal(report.internalStatus,'consistent');assert.deepEqual(report.issues,[]);
 assert.equal(report.scope,'internal_capture');assert.equal(report.providerReconciliation,'not_checked');
 assert.equal(report.amountMinor,'9007199254740991');
});
test('M5 reconciliation: missing/mismatched evidence and duplicate effects are reported',()=>{
 const cases:Array<[Partial<CaptureSnapshot>,string]>=[
  [{verified_at:null},'verification'],[{receipt_id:null},'receipt'],[{journal_id:null},'journal'],
  [{journal_amount:'9007199254740990'},'journal'],[{journal_currency:'USD'},'journal'],
  [{debit_code:'customer_funds',credit_code:'gateway_clearing'},'journal'],
  [{debit_code:'unrelated_account'},'journal'],[{audit_count:0},'audit'],[{audit_count:2},'audit'],
  [{outbox_count:0},'outbox'],[{outbox_count:2},'outbox']
 ];
 for(const [change,issue] of cases){
  const report=reconcileCapture({...captured,...change});
  assert.equal(report.internalStatus,'inconsistent');assert.ok(report.issues.includes(issue));
 }
});
test('M5 reconciliation: pending intent requires no capture effects and no verification timestamp',()=>{
 const pending={...captured,status:'pending' as const,verified_at:null,receipt_id:null,journal_id:null,audit_count:0,outbox_count:0};
 assert.equal(reconcileCapture(pending).internalStatus,'consistent');
 const unexpected=reconcileCapture({...pending,receipt_id:id,journal_id:id,verified_at:new Date(),audit_count:1,outbox_count:1});
 assert.deepEqual(unexpected.issues,['verification','receipt','journal','audit','outbox']);
});
test('M5 reconciliation: snapshot query and attributed read audit never repair financial history',async()=>{
 const queries:Array<{sql:string;args:unknown[]}> = [];
 const pool={query:async(sql:string,args:unknown[])=>{queries.push({sql,args});return {rows:[captured]};}} as unknown as Pool;
 const report=await new PaymentReadsService(pool).reconciliation('admin-subject',id);
 assert.equal(report.internalStatus,'consistent');assert.equal(queries.length,2);
 assert.match(queries[0].sql,/LEFT JOIN ledger_entries/);
 assert.deepEqual(queries[0].args,[id]);
 assert.match(queries[1].sql,/payment.reconciliation_viewed/);
 assert.deepEqual(queries[1].args,['admin-subject',id]);
 assert.ok(!queries.some(q=>/UPDATE|DELETE/.test(q.sql)));
 const failed={query:async(sql:string)=>{if(sql.startsWith('INSERT'))throw new Error('audit unavailable');return {rows:[captured]};}} as unknown as Pool;
 await assert.rejects(()=>new PaymentReadsService(failed).reconciliation('admin',id),/audit unavailable/);
});
