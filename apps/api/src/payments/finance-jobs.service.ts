import {randomUUID} from 'node:crypto';
import {Inject,Injectable} from '@nestjs/common';
import {FinanceLedger} from './finance-ledger.service';
import {CommerceLifecycle} from './commerce-lifecycle.service';
import {FinancialOperations} from './financial-operations.service';
import {PaymentsService} from './payments.service';

@Injectable()
export class FinanceJobs {
 constructor(@Inject(FinanceLedger)readonly ledger:FinanceLedger,@Inject(CommerceLifecycle)readonly commerce:CommerceLifecycle,@Inject(FinancialOperations)readonly operations:FinancialOperations,@Inject(PaymentsService)readonly payments:PaymentsService){}
 async consume(limit=100){
  const c=await this.ledger.pool.connect();try{
   await c.query('BEGIN');const rows=(await c.query(`SELECT o.id,o.event_type,o.payload FROM outbox_events o
    WHERE o.event_type IN ('payment.verified','business.order.fulfilled','business.reservation.completed','business.order.cancelled','business.reservation.cancelled')
    AND NOT EXISTS(SELECT 1 FROM finance_consumed_events f WHERE f.event_id=o.id)
    ORDER BY o.created_at,o.id LIMIT $1 FOR UPDATE OF o SKIP LOCKED`,[limit])).rows;
   for(const event of rows){
    let payload;try{payload=JSON.parse(event.payload);}catch{payload=null;}
    if(!payload||typeof payload!=='object'){await this.ledger.enqueue(c,'poison',event.id);}
    else if(event.event_type==='payment.verified'&&typeof payload.paymentIntentId==='string')await this.ledger.enqueue(c,'payment',payload.paymentIntentId,30);
    else if(event.event_type.endsWith('.cancelled')&&typeof payload.resourceId==='string')await this.ledger.enqueue(c,'cancellation',event.id);
    else if(!event.event_type.endsWith('.fulfilled')&&!event.event_type.endsWith('.completed'))await this.ledger.enqueue(c,'poison',event.id);
    await c.query('INSERT INTO finance_consumed_events(event_id) VALUES($1) ON CONFLICT DO NOTHING',[event.id]);
   }
   await c.query('COMMIT');return rows.length;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async run(kind:string,id:string){
  if(kind==='cancellation'){
   const event=(await this.ledger.pool.query('SELECT event_type,payload FROM outbox_events WHERE id=$1',[id])).rows[0];if(event){const payload=JSON.parse(event.payload);await this.operations.cancelResource(event.event_type.includes('reservation')?'reservation':'order',payload.resourceId);}return {done:true,recurring:false};
  }
  if(kind==='refund')return {done:await this.operations.submitRefund(id),recurring:false};
  if(kind==='payout'){
   const done=await this.operations.submitPayout(id),row=(await this.ledger.pool.query('SELECT state FROM settlement_batches WHERE id=$1',[id])).rows[0];
   return {done,recurring:row?.state==='succeeded'};
  }
  if(kind==='dispute')return {done:await this.operations.reconcileDispute(id),recurring:false};
  if(kind==='payment'){
   const p=(await this.ledger.pool.query('SELECT provider_reference,status FROM payment_intents WHERE id=$1',[id])).rows[0];if(!p)return {done:true,recurring:false};
   if(p.status!=='succeeded'){
    const status=await this.commerce.gateway.transaction(p.provider_reference);
    if(status.status==='success')await this.payments.recheck('system:m5-reconciler',id);
    else return {done:['failed','abandoned','reversed'].includes(status.status),recurring:false};
   }
   return {done:await this.operations.reconcilePayment(id),recurring:true};
  }throw new Error('Unsupported finance job');
 }
 async tick(limit=10){
  await this.commerce.expire(100);await this.consume(100);await this.operations.fulfilment(100);
  await this.ledger.pool.query("UPDATE finance_jobs SET state='dead',last_error='LEASE_RETRY_EXHAUSTED' WHERE state='running' AND lease_until<now() AND attempts>=8");
  const lease=randomUUID();
  const rows=(await this.ledger.pool.query(`UPDATE finance_jobs j SET state='running',attempts=j.attempts+1,lease_id=$2,lease_until=now()+interval '2 minutes'
   FROM (SELECT id FROM finance_jobs WHERE attempts<8 AND ((state='queued' AND next_at<=now()) OR (state='running' AND lease_until<now()))
    ORDER BY next_at,id LIMIT $1 FOR UPDATE SKIP LOCKED) ready WHERE j.id=ready.id RETURNING j.*`,[limit,lease])).rows;
  for(const job of rows){
   const renewed=await this.ledger.pool.query("UPDATE finance_jobs SET lease_until=now()+interval '2 minutes' WHERE id=$1 AND lease_id=$2 AND state='running' RETURNING id",[job.id,lease]);
   if(!renewed.rowCount)continue; // Another worker recovered an expired lease before this row was reached.
   try{
    const result=await this.run(job.kind,job.resource_id);
    const interval=Math.min(86400,Math.max(30,Number(process.env.FINANCE_RECONCILE_INTERVAL_SECONDS)||900));
    await this.ledger.pool.query(`UPDATE finance_jobs SET state=$3,attempts=0,next_at=now()+$4*interval '1 second',lease_id=NULL,lease_until=NULL,last_error=NULL
     WHERE id=$1 AND lease_id=$2`,[job.id,lease,result.done&&!result.recurring?'done':'queued',result.recurring?interval:60]);
   }catch(error){
    const code=error instanceof Error?error.name.slice(0,80):'UNKNOWN_ERROR';
    await this.ledger.pool.query(`UPDATE finance_jobs SET state=CASE WHEN attempts>=8 THEN 'dead' ELSE 'queued' END,
     next_at=now()+LEAST(300,power(2,attempts)::int)*interval '1 second',lease_id=NULL,lease_until=NULL,last_error=$3 WHERE id=$1 AND lease_id=$2`,[job.id,lease,code]);
   }
  }return rows.length;
 }
}
