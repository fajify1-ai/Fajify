import {randomUUID} from 'node:crypto';
import {ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool,type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';

export type FinanceIntent={id:string;business_id:string;customer_subject:string;amount_minor:string;currency:string;environment:'test'|'live';provider_reference:string;status:string};
export type Funding=Array<{account:string;amount:string}>;
export const MAX_MONEY=9007199254740991n;
export function minor(value:string){if(!/^[1-9][0-9]{0,15}$/.test(value)||BigInt(value)>MAX_MONEY)throw new ConflictException('Invalid bounded minor-unit amount');return BigInt(value);}
export function splitCommission(amount:bigint,bps:number){if(!Number.isInteger(bps)||bps<0||bps>10000)throw new ConflictException('Invalid commission');const commission=amount*BigInt(bps)/10000n;return {commission,merchant:amount-commission};}
export function refundCommission(commission:bigint,gross:bigint,previous:bigint,amount:bigint,alreadyReversed=commission*previous/gross){const remaining=commission*(previous+amount)/gross-alreadyReversed;return remaining<0n?0n:remaining>amount?amount:remaining;}
export function splitFunding(parts:Funding,amount:bigint){const total=parts.reduce((sum,p)=>sum+BigInt(p.amount),0n);if(amount<0n||amount>total||total===0n)throw new ConflictException('Invalid reserved exposure');let used=0n;return parts.map(p=>{const before=used;used+=BigInt(p.amount);return {account:p.account,amount:(used*amount/total-before*amount/total).toString()};});}

@Injectable()
export class FinanceLedger {
 constructor(@Inject(DATABASE_POOL)readonly pool:Pool){}
 async lock(c:PoolClient,businessId:string){await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['finance-business:'+businessId.toLowerCase()]);}
 async environment(c:PoolClient,environment:string){
  if((await c.query('SELECT 1 FROM payment_receipts r JOIN payment_intents p ON p.id=r.intent_id WHERE p.environment<>$1 LIMIT 1',[environment])).rowCount)throw new ConflictException('Financial environments must use separate databases');
  await c.query('INSERT INTO finance_environment(environment) VALUES($1) ON CONFLICT DO NOTHING',[environment]);
  const row=(await c.query('SELECT environment FROM finance_environment FOR SHARE')).rows[0];if(row.environment!==environment)throw new ConflictException('Financial environment differs from this database');
 }
 async tx<T>(businessId:string,run:(c:PoolClient)=>Promise<T>){
  const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await this.lock(c,businessId);const result=await run(c);await c.query('COMMIT');return result;}
  catch(e){await c.query('ROLLBACK');if(['40P01','40001','55P03'].includes((e as {code?:string}).code??''))throw new ConflictException('Concurrent financial change; retry');throw e;}finally{c.release();}
 }
 async intentTx<T>(id:string,run:(c:PoolClient,p:FinanceIntent)=>Promise<T>){
  const known=await this.pool.query('SELECT business_id FROM payment_intents WHERE id=$1',[id]);
  if(!known.rows[0])throw new NotFoundException('Payment not found');
  return this.tx(known.rows[0].business_id,async c=>{
   const p=(await c.query<FinanceIntent>('SELECT *,amount_minor::text FROM payment_intents WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!p)throw new NotFoundException('Payment not found');return run(c,p);
  });
 }
 async account(c:PoolClient,code:string){
  const [category,business,...extra]=code.split(':');if(extra.length)throw new ConflictException('Invalid account code');
  if(!['gateway_clearing','customer_funds','merchant_payable','merchant_recoverable','platform_revenue','refund_reserve','dispute_reserve','payout_reserve','gateway_fee_expense'].includes(category)||(['merchant_payable','merchant_recoverable'].includes(category)!==Boolean(business)))throw new ConflictException('Invalid account ownership');
  await c.query("INSERT INTO ledger_accounts(code,currency) VALUES($1,'NGN') ON CONFLICT(code,currency) DO NOTHING",[code]);
  const id=(await c.query('SELECT id FROM ledger_accounts WHERE code=$1 AND currency=\'NGN\'',[code])).rows[0].id as string;
  await c.query('INSERT INTO finance_account_owners(account_id,business_id,category) VALUES($1,$2,$3) ON CONFLICT(account_id) DO NOTHING',[id,business??null,category]);return id;
 }
 async post(c:PoolClient,key:string,intent:string,debit:string,credit:string,amount:bigint){
  if(amount===0n)return;if(amount<0n||debit===credit)throw new ConflictException('Invalid journal');
  const d=await this.account(c,debit),r=await this.account(c,credit);
  const prior=(await c.query('SELECT debit_account_id,credit_account_id,amount_minor::text,intent_id FROM finance_postings WHERE posting_key=$1',[key])).rows[0];
  if(prior){if(prior.debit_account_id!==d||prior.credit_account_id!==r||prior.amount_minor!==amount.toString()||prior.intent_id!==intent)throw new ConflictException('Journal idempotency conflict');return;}
  await c.query("INSERT INTO finance_postings(posting_key,intent_id,debit_account_id,credit_account_id,amount_minor) VALUES($1,$2,$3,$4,$5)",[key,intent,d,r,amount.toString()]);
 }
 async balance(c:PoolClient,code:string){
  return BigInt((await c.query(`SELECT COALESCE(sum(CASE WHEN j.credit_account_id=a.id THEN j.amount_minor ELSE -j.amount_minor END),0)::text AS balance
   FROM ledger_accounts a JOIN finance_all_postings j ON a.id IN (j.debit_account_id,j.credit_account_id) WHERE a.code=$1`,[code])).rows[0].balance);
 }
 async event(c:PoolClient,type:string,id:string,action:string,actor:string){
  await c.query('INSERT INTO finance_operation_events(resource_type,resource_id,action,actor) VALUES($1,$2,$3,$4)',[type,id,action,actor]);
 }
 async enqueue(c:PoolClient,kind:string,id:string,delay=0){
  await c.query(`INSERT INTO finance_jobs(kind,resource_id,next_at) VALUES($1,$2,now()+$3*interval '1 second')
   ON CONFLICT(kind,resource_id) DO UPDATE SET state='queued',attempts=0,next_at=EXCLUDED.next_at,last_error=NULL WHERE finance_jobs.state<>'running'`,[kind,id,delay]);
 }
 async policy(c:PoolClient,business:string){
  const row=(await c.query('SELECT * FROM finance_policies WHERE business_id=$1 ORDER BY version DESC LIMIT 1',[business])).rows[0];
  if(!row)throw new ConflictException('An approved financial policy is required');return row;
 }
 async terms(c:PoolClient,p:FinanceIntent,policyId?:string){
  let row=(await c.query('SELECT t.*,f.gateway_fee_bearer,f.settlement_delay_hours,f.refund_window_hours,f.cancellation_cutoff_minutes,f.hold_minutes FROM payment_terms t JOIN finance_policies f ON f.id=t.policy_id WHERE t.intent_id=$1',[p.id])).rows[0];
  if(!row){
   const policy=policyId?(await c.query('SELECT * FROM finance_policies WHERE id=$1 AND business_id=$2',[policyId,p.business_id])).rows[0]:await this.policy(c,p.business_id);
   if(!policy)throw new ConflictException('Invalid financial policy');
   const split=splitCommission(minor(p.amount_minor),policy.commission_bps);
   await c.query('INSERT INTO payment_terms(intent_id,policy_id,commission_minor,merchant_minor) VALUES($1,$2,$3,$4)',[p.id,policy.id,split.commission.toString(),split.merchant.toString()]);
   row={...policy,policy_id:policy.id,commission_minor:split.commission.toString(),merchant_minor:split.merchant.toString(),allocated_at:null,resolution:'pending'};
  }return row;
 }
 async allocate(c:PoolClient,p:FinanceIntent){
  const t=await this.terms(c,p);if(t.allocated_at)return;
  const fee=(await c.query('SELECT amount_minor::text FROM payment_fees WHERE intent_id=$1',[p.id])).rows[0];
  if(!fee){await this.case(c,p.id,'fee_unverified',p.id);return;}
  const charged=t.gateway_fee_bearer==='merchant'?BigInt(fee.amount_minor):0n;
  const base=BigInt(t.merchant_minor),merchant=base>charged?base-charged:0n,fromGross=base<charged?base:charged;
  await this.post(c,p.id+':allocate-merchant',p.id,'customer_funds','merchant_payable:'+p.business_id,merchant);
  await this.post(c,p.id+':allocate-commission',p.id,'customer_funds','platform_revenue',BigInt(t.commission_minor));
  await this.post(c,p.id+':allocate-fee',p.id,'customer_funds','gateway_fee_expense',fromGross);
  await this.post(c,p.id+':fee-recoverable',p.id,'merchant_recoverable:'+p.business_id,'gateway_fee_expense',charged-fromGross);
  await c.query("UPDATE payment_terms SET allocated_at=now(),resolution='confirmed' WHERE intent_id=$1",[p.id]);
 }
 async case(c:PoolClient,intent:string,kind:string,providerId:string){await c.query('INSERT INTO finance_reconciliation_cases(intent_id,kind,provider_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[intent,kind,providerId]);}
 async fee(c:PoolClient,p:FinanceIntent,amount?:number){
  if(amount===undefined)return;
  if(!Number.isSafeInteger(amount)||amount<0||BigInt(amount)>BigInt(p.amount_minor))throw new ConflictException('Provider fee mismatch');
  const old=(await c.query('SELECT amount_minor::text FROM payment_fees WHERE intent_id=$1',[p.id])).rows[0];
  if(old){if(old.amount_minor!==String(amount))await this.case(c,p.id,'fee_mismatch',p.id);else await c.query("UPDATE finance_reconciliation_cases SET state='resolved' WHERE intent_id=$1 AND kind='fee_mismatch'",[p.id]);return;}
  await c.query('INSERT INTO payment_fees(intent_id,amount_minor) VALUES($1,$2)',[p.id,String(amount)]);
  await this.post(c,p.id+':gateway-fee',p.id,'gateway_fee_expense','gateway_clearing',BigInt(amount));
  await c.query("UPDATE finance_reconciliation_cases SET state='resolved' WHERE intent_id=$1 AND kind='fee_unverified'",[p.id]);
  await this.unallocatedFee(c,p);
 }
 async unallocatedFee(c:PoolClient,p:FinanceIntent){
  const row=(await c.query("SELECT f.amount_minor::text FROM payment_fees f JOIN payment_terms t ON t.intent_id=f.intent_id JOIN finance_policies policy ON policy.id=t.policy_id WHERE f.intent_id=$1 AND t.allocated_at IS NULL AND t.resolution='refund_required' AND policy.gateway_fee_bearer='merchant'",[p.id])).rows[0];
  if(row)await this.post(c,p.id+':unfulfilled-fee',p.id,'merchant_recoverable:'+p.business_id,'gateway_fee_expense',BigInt(row.amount_minor));
 }
 async fundedParts(c:PoolClient,p:FinanceIntent,amount:bigint,commission:bigint):Promise<Funding>{
  const terms=(await c.query('SELECT allocated_at FROM payment_terms WHERE intent_id=$1',[p.id])).rows[0];
  if(!terms?.allocated_at){
   const held=BigInt((await c.query(`SELECT COALESCE(sum(CASE WHEN a.id=j.credit_account_id THEN j.amount_minor ELSE -j.amount_minor END),0)::text AS balance FROM finance_all_postings j JOIN ledger_accounts a ON a.id IN (j.credit_account_id,j.debit_account_id) WHERE j.intent_id=$1 AND a.code='customer_funds'`,[p.id])).rows[0].balance);
   const take=held>0n?(held<amount?held:amount):0n;
   return [{account:'customer_funds',amount:take.toString()},{account:'merchant_recoverable:'+p.business_id,amount:(amount-take).toString()}].filter(v=>BigInt(v.amount)>0n);
  }
  const merchant=amount-commission,code='merchant_payable:'+p.business_id;
  const available=await this.balance(c,code),fromPayable=available>0n?(available<merchant?available:merchant):0n;
  return [{account:code,amount:fromPayable.toString()},{account:'merchant_recoverable:'+p.business_id,amount:(merchant-fromPayable).toString()},{account:'platform_revenue',amount:commission.toString()}].filter(v=>BigInt(v.amount)>0n);
 }
 async reserve(c:PoolClient,p:FinanceIntent,id:string,target:string,parts:Funding){
  for(let i=0;i<parts.length;i++)await this.post(c,id+':reserve:'+i,p.id,parts[i].account,target,BigInt(parts[i].amount));
 }
 async release(c:PoolClient,p:FinanceIntent,id:string,source:string,parts:Funding){
  for(let i=0;i<parts.length;i++)await this.post(c,id+':release:'+i,p.id,source,parts[i].account,BigInt(parts[i].amount));
 }
 async refundReserved(c:PoolClient,intent:string){
  return BigInt((await c.query("SELECT COALESCE(sum(amount_minor),0)::text AS total FROM finance_refunds WHERE intent_id=$1 AND state IN ('approved','submitting','pending','processed','uncertain')",[intent])).rows[0].total);
 }
 async approveRefund(c:PoolClient,p:FinanceIntent,id:string,actor:string){
  const r=(await c.query('SELECT *,amount_minor::text FROM finance_refunds WHERE id=$1 AND intent_id=$2 FOR UPDATE',[id,p.id])).rows[0];
  if(!r)throw new NotFoundException('Refund not found');if(r.state!=='requested')return r;
  if(p.status!=='succeeded')throw new ConflictException('Verified capture required');
  if((await c.query("SELECT 1 FROM finance_disputes WHERE intent_id=$1 AND state IN ('open','lost')",[p.id])).rowCount)throw new ConflictException('Resolve disputed exposure before approving a refund');
  if((await c.query("SELECT 1 FROM settlement_claims s JOIN settlement_batches b ON b.id=s.batch_id WHERE s.intent_id=$1 AND b.state IN ('approved','submitting','pending','otp','uncertain')",[p.id])).rowCount)throw new ConflictException('Reconcile pending payout before refund');
  const previous=await this.refundReserved(c,p.id),amount=minor(r.amount_minor),gross=minor(p.amount_minor);
  if(previous+amount>gross)throw new ConflictException('Refund exceeds unreserved capture');
  const terms=(await c.query('SELECT commission_minor::text,allocated_at FROM payment_terms WHERE intent_id=$1',[p.id])).rows[0];
  const reversed=BigInt((await c.query("SELECT COALESCE(sum((part->>'amount')::bigint),0)::text AS total FROM finance_refunds r,jsonb_array_elements(r.funding) part WHERE r.intent_id=$1 AND r.state IN ('approved','submitting','pending','processed','uncertain') AND part->>'account'='platform_revenue'",[p.id])).rows[0].total);
  const commission=terms?.allocated_at?refundCommission(BigInt(terms.commission_minor),gross,previous,amount,reversed):0n;
  const funding=await this.fundedParts(c,p,amount,commission);
  await this.reserve(c,p,id,'refund_reserve',funding);
  await c.query("UPDATE finance_refunds SET state='approved',funding=$2::jsonb,decided_by=$3,updated_at=now() WHERE id=$1",[id,JSON.stringify(funding),actor]);
  await this.event(c,'refund',id,'approved',actor);await this.enqueue(c,'refund',id);
  return {...r,state:'approved'};
 }
 async fullRefund(c:PoolClient,p:FinanceIntent,reason:string){
  const old=(await c.query("SELECT id FROM finance_refunds WHERE intent_id=$1 AND request_key='system-unfulfilled'",[p.id])).rows[0];if(old)return;
  const remaining=BigInt(p.amount_minor)-await this.refundReserved(c,p.id);
  if(remaining<=0n){await c.query("UPDATE payment_terms SET resolution='refund_required' WHERE intent_id=$1",[p.id]);return;}
  const id=randomUUID();await c.query("INSERT INTO finance_refunds(id,intent_id,request_key,amount_minor,reason,created_by) VALUES($1,$2,'system-unfulfilled',$3,$4,'system:m5')",[id,p.id,remaining.toString(),reason]);
  await this.approveRefund(c,p,id,'system:m5');
  await c.query("UPDATE payment_terms SET resolution='refund_required' WHERE intent_id=$1",[p.id]);
  await this.unallocatedFee(c,p);
 }
}
