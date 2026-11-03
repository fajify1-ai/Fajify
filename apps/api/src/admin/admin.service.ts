import {Inject,Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';
import type {AdminOverviewView,AdminAuditPage} from './admin.dto';

/** Aggregate operational reads. No payment mutation, raw support message,
 * token, session or provider credential is returned.
 */
@Injectable()
export class AdminOperationsService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async overview():Promise<AdminOverviewView>{
  const result=await this.pool.query<AdminOverviewView>(
   "SELECT " +
   "(SELECT count(*)::int FROM business_onboarding WHERE status='pending') AS \"pendingBusinessApprovals\", " +
   "(SELECT count(*)::int FROM customer_support_cases WHERE status='open') AS \"openSupportCases\", " +
   "(SELECT count(*)::int FROM customer_reviews WHERE moderation_status='hidden' AND withdrawn=false) AS \"hiddenReviews\"");
  return result.rows[0];
 }
 async audit(input:PageQuery):Promise<AdminAuditPage>{
  const result=await this.pool.query<{id:string;actorSubject:string|null;eventType:string;occurredAt:Date}>(
   'SELECT id,actor_subject AS "actorSubject",event_type AS "eventType",occurred_at AS "occurredAt" '+
   'FROM identity_security_events ORDER BY occurred_at DESC,id DESC LIMIT $1 OFFSET $2',
   [input.limit+1,input.offset]);
  const rows=result.rows.slice(0,input.limit);
  return {items:rows.map(row=>({id:row.id,actorSubject:row.actorSubject,eventType:row.eventType,occurredAt:row.occurredAt.toISOString()})),
   nextOffset:result.rows.length>input.limit?input.offset+input.limit:null};
 }
}
