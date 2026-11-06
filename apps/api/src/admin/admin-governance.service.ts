import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool,type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';
import {AdminCommandService} from './admin-command.service';

function page<T>(rows:T[],q:PageQuery){return {items:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null};}
type Resource='branch'|'catalogue';
type RestrictionInput={requestKey:string;restricted:boolean;reason:string};
@Injectable()
export class AdminGovernanceService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AdminCommandService)private readonly commands:AdminCommandService){}
 async applications(q:PageQuery){
  const r=await this.pool.query(
   "SELECT id,display_name AS \"displayName\",status,created_at AS \"createdAt\" FROM business_onboarding "+
   "WHERE status='pending' ORDER BY created_at,id LIMIT $1 OFFSET $2",[q.limit+1,q.offset]);
  return page(r.rows,q);
 }
 async reviews(q:PageQuery){
  const r=await this.pool.query(
   'SELECT id,business_id AS "businessId",branch_id AS "branchId",rating,body,moderation_status AS "moderationStatus",created_at AS "createdAt" '+
   "FROM customer_reviews WHERE withdrawn=false ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2",
   [q.limit+1,q.offset]);
  return page(r.rows,q);
 }
 async moderation(actor:string,id:string,input:{requestKey:string;visibility:'visible'|'hidden';reason:string}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'review.moderate',resourceType:'review',
   resourceId:id,payload:{visibility:input.visibility,reason:input.reason},reason:input.reason},async c=>{
   const found=await c.query<{customer_subject:string;withdrawn:boolean;moderation_status:string}>(
    'SELECT customer_subject,withdrawn,moderation_status FROM customer_reviews WHERE id=$1 FOR UPDATE',[id]);
   if(!found.rowCount)throw new NotFoundException('Review not found');
   const review=found.rows[0];
   if(review.customer_subject===actor)throw new BadRequestException('Cannot moderate own review');
   if(review.withdrawn)throw new ConflictException('Withdrawn review cannot be moderated');
   const changed=review.moderation_status!==input.visibility;
   if(changed){
    await c.query('UPDATE customer_reviews SET moderation_status=$2,updated_at=now() WHERE id=$1',[id,input.visibility]);
    await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
     ['admin.review.moderated',JSON.stringify({reviewId:id,visibility:input.visibility})]);
   }
   return {id,moderationStatus:input.visibility,changed};
  });
 }
 private async entity(c:PoolClient,type:Resource,id:string){
  const table=type==='branch'?'business_branches':'business_catalogue';
  const column=type==='branch'?'active':'published';
  const found=await c.query<{prior:boolean;applicant_subject:string}>(`SELECT e.${column} AS prior,b.applicant_subject
   FROM ${table} e JOIN business_onboarding b ON b.id=e.business_id WHERE e.id=$1 FOR UPDATE OF e`,[id]);
  if(!found.rowCount)throw new NotFoundException('Marketplace resource not found');
  return found.rows[0];
 }
 async restriction(actor:string,type:Resource,id:string,input:RestrictionInput){
  const operation=type+'.'+(input.restricted?'restrict':'restore');
  return this.commands.execute({actor,requestKey:input.requestKey,operation,resourceType:type,resourceId:id,
   payload:{restricted:input.restricted,reason:input.reason},reason:input.reason},async c=>{
   const resource=await this.entity(c,type,id);
   if(resource.applicant_subject===actor)throw new BadRequestException('Cannot govern own merchant');
   const existing=await c.query<{restricted:boolean;prior_enabled:boolean}>(
    'SELECT restricted,prior_enabled FROM admin_marketplace_restrictions WHERE resource_type=$1 AND resource_id=$2 FOR UPDATE',[type,id]);
   if(input.restricted){
    if(existing.rows[0]?.restricted)return {id,resourceType:type,restricted:true,changed:false};
    const prior=resource.prior;
    await c.query(`INSERT INTO admin_marketplace_restrictions(resource_type,resource_id,restricted,prior_enabled,reason,changed_by)
     VALUES($1,$2,true,$3,$4,$5)
     ON CONFLICT(resource_type,resource_id) DO UPDATE SET restricted=true,prior_enabled=EXCLUDED.prior_enabled,reason=EXCLUDED.reason,changed_by=EXCLUDED.changed_by,updated_at=now()`,
     [type,id,prior,input.reason,actor]);
    await c.query(type==='branch'
     ?'UPDATE business_branches SET active=false WHERE id=$1'
     :'UPDATE business_catalogue SET published=false WHERE id=$1',[id]);
    await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
     ['admin.marketplace.restricted',JSON.stringify({resourceType:type,resourceId:id})]);
    return {id,resourceType:type,restricted:true,changed:true};
   }
   if(!existing.rows[0]?.restricted)return {id,resourceType:type,restricted:false,changed:false};
   // Remove the trigger-enforced restriction first, then restore the prior merchant choice.
   await c.query('UPDATE admin_marketplace_restrictions SET restricted=false,reason=$3,changed_by=$4,updated_at=now() WHERE resource_type=$1 AND resource_id=$2',
    [type,id,input.reason,actor]);
   await c.query(type==='branch'
    ?'UPDATE business_branches SET active=$2 WHERE id=$1'
    :'UPDATE business_catalogue SET published=$2 WHERE id=$1',
    [id,existing.rows[0].prior_enabled]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
    ['admin.marketplace.restored',JSON.stringify({resourceType:type,resourceId:id})]);
   return {id,resourceType:type,restricted:false,changed:true};
  });
 }
 async restrictions(q:PageQuery){
  const r=await this.pool.query(
   'SELECT resource_type AS "resourceType",resource_id AS "resourceId",restricted,reason,changed_by AS "changedBy",updated_at AS "updatedAt" '+
   'FROM admin_marketplace_restrictions WHERE restricted=true ORDER BY updated_at DESC,resource_id DESC LIMIT $1 OFFSET $2',
   [q.limit+1,q.offset]);return page(r.rows,q);
 }
}
