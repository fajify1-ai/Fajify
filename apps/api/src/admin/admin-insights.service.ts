import {Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';
import type {AdminFinanceSummary,AdminMonitoringSummary,AdminReportSummary} from './admin.dto';

function page<T>(rows:T[],q:PageQuery){return {items:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null};}
@Injectable()
export class AdminInsightsService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 /** Independently verified provider capture and final reconciliation objects;
  * never combine unverified browser redirects with completed payment totals.
  */
 async finance():Promise<AdminFinanceSummary>{
  const r=await this.pool.query<AdminFinanceSummary>(`
   SELECT
    (SELECT COALESCE(sum(p.amount_minor),0)::text FROM payment_intents p
      JOIN payment_receipts x ON x.intent_id=p.id WHERE p.status='succeeded') AS "capturedMinor",
    (SELECT COALESCE(sum(amount_minor),0)::text FROM finance_refunds WHERE state='processed') AS "refundedMinor",
    (SELECT COALESCE(sum(amount_minor),0)::text FROM settlement_batches WHERE state='succeeded') AS "settledMinor",
    (SELECT count(*)::int FROM finance_reconciliation_cases WHERE state='open') AS "openReconciliationCases",
    (SELECT count(*)::int FROM finance_disputes WHERE state='open') AS "openDisputes",
    (SELECT count(*)::int FROM finance_refunds WHERE state='uncertain') AS "uncertainRefunds",
    (SELECT COALESCE(sum(amount_minor),0)::text FROM ride_driver_payouts WHERE state='reconciled') AS "reconciledRideDriverPayoutMinor"`);
  return r.rows[0];
 }
 /** Lookback period applies to each source's own creation timestamp.
  * Ledger-backed revenue may be negative after compensating reversals.
  */
 async report(days:number):Promise<AdminReportSummary>{
  const r=await this.pool.query<AdminReportSummary>(`
   SELECT
    (SELECT count(*)::int FROM user_profiles WHERE created_at>=now()-$1::integer*interval '1 day') AS customers,
    (SELECT count(*)::int FROM business_onboarding WHERE status='approved' AND reviewed_at>=now()-$1::integer*interval '1 day') AS "approvedBusinesses",
    (SELECT count(*)::int FROM business_orders WHERE created_at>=now()-$1::integer*interval '1 day') AS "createdOrders",
    (SELECT count(*)::int FROM business_reservations WHERE created_at>=now()-$1::integer*interval '1 day') AS "createdReservations",
    (SELECT count(*)::int FROM issued_tickets WHERE created_at>=now()-$1::integer*interval '1 day') AS "issuedTickets",
    (SELECT count(*)::int FROM ride_requests WHERE created_at>=now()-$1::integer*interval '1 day') AS "requestedRides",
    (SELECT count(*)::int FROM ride_requests WHERE status='completed' AND created_at>=now()-$1::integer*interval '1 day') AS "completedRides",
    (SELECT COALESCE(sum(gross_minor),0)::text FROM ride_fares WHERE payment_state='verified' AND verified_at>=now()-$1::integer*interval '1 day') AS "verifiedRideGrossMinor",
    (SELECT COALESCE(sum(p.amount_minor),0)::text FROM payment_receipts x JOIN payment_intents p ON p.id=x.intent_id
      WHERE x.verified_at>=now()-$1::integer*interval '1 day' AND p.status='succeeded') AS "verifiedCaptureMinor",
    (SELECT COALESCE(sum(CASE WHEN j.credit_account_id=a.id THEN j.amount_minor ELSE -j.amount_minor END),0)::text
      FROM ledger_accounts a JOIN finance_all_postings j ON a.id IN(j.debit_account_id,j.credit_account_id)
      WHERE a.code='platform_revenue' AND j.created_at>=now()-$1::integer*interval '1 day') AS "ledgerPlatformRevenueMinor"`,
   [days]);
  return {...r.rows[0],days,currency:'NGN'};
 }
 async monitoring():Promise<AdminMonitoringSummary>{
  const r=await this.pool.query<Omit<AdminMonitoringSummary,'providerHealth'|'checkedAt'>>(`
   SELECT
    (SELECT count(*)::int FROM finance_jobs WHERE state='dead') AS "deadFinanceJobs",
    (SELECT count(*)::int FROM finance_jobs WHERE state='running' AND lease_until<now()) AS "expiredFinanceLeases",
    (SELECT count(*)::int FROM finance_jobs WHERE state='queued' AND next_at<now()-interval '5 minutes') AS "overdueFinanceJobs",
    (SELECT count(*)::int FROM finance_reconciliation_cases WHERE state='open') AS "openFinanceExceptions",
    (SELECT count(*)::int FROM outbox_events WHERE published_at IS NULL AND created_at<now()-interval '5 minutes') AS "staleOutboxEvents",
    (SELECT count(*)::int FROM ride_incidents WHERE status<>'resolved' AND severity IN('urgent','emergency')) AS "openUrgentRideIncidents"`);
  return {...r.rows[0],providerHealth:'unverified',checkedAt:new Date().toISOString()};
 }
 async commandAudit(q:PageQuery){
  const result=await this.pool.query(
   'SELECT id,"actorSubject",operation,"resourceType","resourceId",outcome,reason,"occurredAt" '+
   'FROM (SELECT id,actor_subject AS "actorSubject",operation,resource_type AS "resourceType",resource_id AS "resourceId",outcome,reason,occurred_at AS "occurredAt" FROM admin_action_events '+
   'UNION ALL SELECT id,granted_by AS "actorSubject",CASE WHEN active THEN \'scope.grant\' ELSE \'scope.revoke\' END AS operation,\'admin_scope\' AS "resourceType",identity_subject AS "resourceId",\'applied\' AS outcome,scope AS reason,occurred_at AS "occurredAt" FROM admin_scope_grant_events) events '+
   'ORDER BY "occurredAt" DESC,id DESC LIMIT $1 OFFSET $2',[q.limit+1,q.offset]);
  return page(result.rows,q);
 }
 /** Global support/operations scope, but every investigation read is itself
  * attributed in the append-only administrative action history.
  */
 async activity(actor:string,subject:string,q:PageQuery){
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const found=await c.query('SELECT 1 FROM user_profiles WHERE identity_subject=$1',[subject]);
   if(!found.rowCount)throw new NotFoundException('Customer not found');
   const events=await c.query(`
    SELECT id,'order'::text AS kind,status::text AS status,created_at AS "createdAt" FROM business_orders WHERE customer_subject=$1
    UNION ALL SELECT id,'reservation'::text,status::text,created_at FROM business_reservations WHERE customer_subject=$1
    UNION ALL SELECT id,'paid_hold'::text,status::text,created_at FROM paid_holds WHERE customer_subject=$1
    UNION ALL SELECT id,'plan'::text,status::text,created_at FROM customer_plans WHERE customer_subject=$1
    UNION ALL SELECT id,'support'::text,status::text,created_at FROM customer_support_cases WHERE customer_subject=$1
    UNION ALL SELECT id,'ride'::text,status::text,created_at FROM ride_requests WHERE customer_subject=$1
    UNION ALL SELECT id,'booking_ride_link'::text,status::text,created_at FROM customer_booking_ride_links WHERE customer_subject=$1
    ORDER BY "createdAt" DESC,id DESC LIMIT $2 OFFSET $3`,[subject,q.limit+1,q.offset]);
   await c.query("INSERT INTO admin_action_events(actor_subject,operation,resource_type,resource_id,outcome) VALUES($1,'integration.customer_history_read','customer',$2,'applied')",
    [actor,subject]);
   await c.query('COMMIT');
   return page(events.rows,q);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 /** Cross-domain consistency checks report problems; they never repair an
  * authoritative financial, reservation or planning record in place.
  */
 async consistency(){
  const r=await this.pool.query(`
   SELECT
    (SELECT count(*)::int FROM paid_holds h JOIN payment_intents p ON p.id=h.intent_id
     WHERE h.status='confirmed' AND NOT EXISTS(SELECT 1 FROM payment_receipts x WHERE x.intent_id=p.id))
       AS "confirmedUnverifiedHolds",
    (SELECT count(*)::int FROM payment_receipts x LEFT JOIN ledger_entries j ON j.intent_id=x.intent_id
     WHERE j.id IS NULL) AS "unpostedVerifiedCaptures",
    (SELECT count(*)::int FROM customer_plan_hold_links l
     LEFT JOIN paid_holds h ON h.id=l.hold_id
     WHERE h.id IS NULL) AS "orphanPlanHolds",
    (SELECT count(*)::int FROM paid_holds h
     JOIN business_catalogue i ON i.id=h.catalogue_id AND i.kind='package'
     WHERE h.status IN('held','confirmed') AND NOT EXISTS(
      SELECT 1 FROM package_component_holds ch WHERE ch.hold_id=h.id AND ch.released_at IS NULL))
       AS "packageHoldsMissingComponents",
    (SELECT count(*)::int FROM customer_booking_ride_links link
      JOIN ride_requests ride ON ride.id=link.ride_id WHERE link.status='active' AND ride.status='cancelled')
      AS "linksWithCancelledRides",
    (SELECT count(*)::int FROM customer_booking_ride_links link
      JOIN business_reservations r ON r.id=link.reservation_id WHERE link.status='active' AND r.status='cancelled')
      AS "linksWithCancelledReservations"`);
  return r.rows[0];
 }
 async businessReport(id:string){
  const found=await this.pool.query('SELECT id,display_name AS "displayName",status FROM business_onboarding WHERE id=$1',[id]);
  if(!found.rowCount)throw new NotFoundException('Business not found');
  const data=await this.pool.query(`
   SELECT
    (SELECT count(*)::int FROM business_branches WHERE business_id=$1 AND active) AS "activeBranches",
    (SELECT count(*)::int FROM business_orders WHERE business_id=$1 AND status='fulfilled') AS "fulfilledOrders",
    (SELECT count(*)::int FROM business_reservations WHERE business_id=$1 AND status='completed') AS "completedReservations",
    (SELECT count(*)::int FROM customer_booking_ride_links link JOIN business_reservations r ON r.id=link.reservation_id
      WHERE r.business_id=$1 AND link.status='active') AS "linkedCustomerRides",
    (SELECT COALESCE(sum(p.amount_minor),0)::text FROM payment_intents p
     JOIN payment_receipts r ON r.intent_id=p.id WHERE p.business_id=$1) AS "verifiedCapturedMinor",
    (SELECT COALESCE(sum(r.amount_minor),0)::text FROM finance_refunds r
     JOIN payment_intents p ON p.id=r.intent_id WHERE p.business_id=$1 AND r.state='processed') AS "processedRefundMinor",
    (SELECT COALESCE(sum(amount_minor),0)::text FROM settlement_batches WHERE business_id=$1 AND state='succeeded') AS "settledMinor"`,[id]);
  return {...found.rows[0],...data.rows[0],currency:'NGN'};
 }

}
