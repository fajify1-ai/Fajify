import {Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';

type PaymentRow={
 id:string;status:'pending'|'succeeded';amount_minor:string;currency:'NGN';
 created_at:Date;verified_at:Date|null;
};
export type CaptureSnapshot=PaymentRow&{
 receipt_id:string|null;journal_id:string|null;journal_amount:string|null;
 journal_currency:string|null;debit_code:string|null;credit_code:string|null;
 audit_count:number;outbox_count:number;
};

/** Internal consistency only. This does not fetch a provider statement or prove settlement. */
export function reconcileCapture(row:CaptureSnapshot){
 const captured=row.status==='succeeded';
 const checks={
  verification:captured?row.verified_at!==null:row.verified_at===null,
  receipt:captured?row.receipt_id!==null:row.receipt_id===null,
  journal:captured?row.journal_id!==null&&row.journal_amount===row.amount_minor&&
   row.journal_currency===row.currency&&row.debit_code==='gateway_clearing'&&row.credit_code==='customer_funds':row.journal_id===null,
  audit:row.audit_count===(captured?1:0),
  outbox:row.outbox_count===(captured?1:0)
 };
 const issues=Object.entries(checks).filter(([,matches])=>!matches).map(([name])=>name);
 return {
  paymentIntentId:row.id,status:row.status,amountMinor:row.amount_minor,currency:row.currency,
  scope:'internal_capture' as const,providerReconciliation:'not_checked' as const,
  internalStatus:issues.length?'inconsistent' as const:'consistent' as const,
  checks,issues
 };
}

@Injectable()
export class PaymentReadsService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}

 async customerPayment(subject:string,id:string){
  // Scope in SQL, returning the same 404 for missing and foreign identifiers.
  const result=await this.pool.query<PaymentRow>(
   'SELECT id,status,amount_minor::text,currency,created_at,verified_at FROM payment_intents WHERE id=$1 AND customer_subject=$2',
   [id,subject]
  );
  const row=result.rows[0];
  if(!row)throw new NotFoundException('Payment not found');
  return {paymentIntentId:row.id,status:row.status,amountMinor:row.amount_minor,currency:row.currency,
   createdAt:row.created_at.toISOString(),verifiedAt:row.verified_at?.toISOString()??null};
 }

 async reconciliation(actor:string,id:string){
  // One statement gives one MVCC snapshot even while a webhook commits concurrently.
  const result=await this.pool.query<CaptureSnapshot>(`SELECT p.id,p.status,p.amount_minor::text,p.currency,p.created_at,p.verified_at,
   r.intent_id AS receipt_id,j.id AS journal_id,j.amount_minor::text AS journal_amount,j.currency AS journal_currency,
   d.code AS debit_code,c.code AS credit_code,
   (SELECT count(*)::int FROM audit_events a WHERE a.resource_id=p.id AND a.resource_type='payment_intent' AND a.action='payment.verified') AS audit_count,
   (SELECT count(*)::int FROM outbox_events o WHERE o.event_type='payment.verified' AND o.payload::jsonb->>'paymentIntentId'=p.id::text) AS outbox_count
   FROM payment_intents p LEFT JOIN payment_receipts r ON r.intent_id=p.id
   LEFT JOIN ledger_entries j ON j.intent_id=p.id
   LEFT JOIN ledger_accounts d ON d.id=j.debit_account_id
   LEFT JOIN ledger_accounts c ON c.id=j.credit_account_id WHERE p.id=$1`,[id]);
  const row=result.rows[0];
  if(!row)throw new NotFoundException('Payment not found');
  const report=reconcileCapture(row);
  // A failed audit write prevents disclosure; reading never repairs financial records.
  await this.pool.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'payment.reconciliation_viewed','payment_intent',$2)",[actor,id]);
  return report;
 }
}
