import {createHash} from 'node:crypto';
import {BadRequestException, ConflictException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {Pool, type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerService, page} from './customer.service';
import type {PageQuery} from './customer.dto';
import type {ProfileInput, ReviewInput, SupportInput, SupportMessageInput} from './account.dto';

const ownReview=`id,branch_id AS "branchId",reservation_id AS "reservationId",order_id AS "orderId",rating,body,
 withdrawn,moderation_status AS "moderationStatus",created_at AS "createdAt",'Verified customer'::text AS author`;
const supportCase=`id,category,resource_id AS "resourceId",subject,status,created_at AS "createdAt",updated_at AS "updatedAt"`;
const notification=`id,resource_type AS "resourceType",resource_id AS "resourceId",status,title,read_at AS "readAt",created_at AS "createdAt"`;

@Injectable()
export class CustomerAccountService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool,@Inject(CustomerService) private readonly customer:CustomerService){}
 async profile(subject:string){
  const result=await this.pool.query('SELECT COALESCE(display_name,\'\') AS "displayName",created_at AS "createdAt" FROM user_profiles WHERE identity_subject=$1',[subject]);
  if(!result.rowCount)throw new NotFoundException('Profile not found');return result.rows[0];
 }
 async updateProfile(identity:VerifiedIdentity,input:ProfileInput){
  return this.customer.withAccountTransaction(identity,async c=>{
   const result=await c.query('UPDATE user_profiles SET display_name=$2,updated_at=now() WHERE identity_subject=$1 RETURNING display_name AS "displayName",created_at AS "createdAt"',[identity.subject,input.displayName.trim()]);
   return result.rows[0];
  });
 }
 async wishlist(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT i.id,i.business_id AS "businessId",i.branch_id AS "branchId",m.display_name AS "businessName",
   b.name AS "branchName",b.address,i.name,i.description,i.kind AS category,i.price_minor::text AS "priceMinor",i.currency,w.created_at AS "savedAt"
   FROM customer_wishlist w JOIN business_catalogue i ON i.id=w.catalogue_id JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id
   JOIN business_onboarding m ON m.id=i.business_id WHERE w.customer_subject=$1 AND i.active AND i.published AND b.active AND m.status='approved'
   ORDER BY w.created_at DESC,w.catalogue_id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async save(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>{
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['wishlist:'+identity.subject]);
   const exists=await c.query(`SELECT 1 FROM business_catalogue i JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id
    JOIN business_onboarding m ON m.id=i.business_id WHERE i.id=$1 AND i.active AND i.published AND b.active AND m.status='approved' FOR SHARE OF i,b,m`,[id]);
   if(!exists.rowCount)throw new NotFoundException('Offering unavailable');
   if((await c.query('SELECT 1 FROM customer_wishlist WHERE customer_subject=$1 AND catalogue_id=$2',[identity.subject,id])).rowCount)return {changed:false};
   const count=await c.query('SELECT count(*)::int AS count FROM customer_wishlist WHERE customer_subject=$1',[identity.subject]);
   if(count.rows[0].count>=500)throw new ConflictException('Wishlist limit reached');
   await c.query('INSERT INTO customer_wishlist(customer_subject,catalogue_id) VALUES($1,$2)',[identity.subject,id]);return {changed:true};
  });
 }
 async unsave(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>({changed:!!(await c.query('DELETE FROM customer_wishlist WHERE customer_subject=$1 AND catalogue_id=$2',[identity.subject,id])).rowCount}));
 }
 async review(identity:VerifiedIdentity,type:'order'|'reservation',id:string,input:ReviewInput){
  const table=type==='order'?'business_orders':'business_reservations',column=type==='order'?'order_id':'reservation_id',complete=type==='order'?'fulfilled':'completed';
  return this.customer.withAccountTransaction(identity,async c=>{
   const resource=await c.query(`SELECT business_id,branch_id,status FROM ${table} WHERE id=$1 AND customer_subject=$2 FOR SHARE`,[id,identity.subject]);
   if(!resource.rowCount)throw new NotFoundException('Experience not found');
   if(resource.rows[0].status!==complete)throw new ConflictException('Only completed experiences can be reviewed');
   const result=await c.query(`INSERT INTO customer_reviews(customer_subject,business_id,branch_id,${column},rating,body)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(${column}) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body,withdrawn=false,updated_at=now()
    WHERE customer_reviews.customer_subject=$1 RETURNING ${ownReview}`,[identity.subject,resource.rows[0].business_id,resource.rows[0].branch_id,id,input.rating,input.body.trim()]);
   if(!result.rowCount)throw new ConflictException('Review ownership changed');return result.rows[0];
  });
 }
 async reviews(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT ${ownReview} FROM customer_reviews WHERE customer_subject=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async withdrawReview(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>{
   const result=await c.query('UPDATE customer_reviews SET withdrawn=true,updated_at=now() WHERE id=$1 AND customer_subject=$2 RETURNING id',[id,identity.subject]);
   if(!result.rowCount)throw new NotFoundException('Review not found');return {changed:true};
  });
 }
 async notifications(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT ${notification} FROM customer_notifications WHERE customer_subject=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async unread(subject:string){
  return (await this.pool.query('SELECT count(*)::int AS unread FROM customer_notifications WHERE customer_subject=$1 AND read_at IS NULL',[subject])).rows[0];
 }
 async readNotification(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>{
   const result=await c.query(`UPDATE customer_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND customer_subject=$2 RETURNING ${notification}`,[id,identity.subject]);
   if(!result.rowCount)throw new NotFoundException('Notification not found');return result.rows[0];
  });
 }
 async support(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT ${supportCase} FROM customer_support_cases WHERE customer_subject=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 private async ownedCase(c:Pool|PoolClient,subject:string,id:string,lock=false){
  const result=await c.query(`SELECT ${supportCase} FROM customer_support_cases WHERE id=$1 AND customer_subject=$2${lock?' FOR UPDATE':''}`,[id,subject]);
  if(!result.rowCount)throw new NotFoundException('Support case not found');return result.rows[0];
 }
 async supportDetail(subject:string,id:string){return this.ownedCase(this.pool,subject,id);}
 async messages(subject:string,id:string,input:PageQuery){
  await this.ownedCase(this.pool,subject,id);
  const result=await this.pool.query(`SELECT m.id,m.body,m.created_at AS "createdAt" FROM customer_support_messages m
   JOIN customer_support_cases s ON s.id=m.case_id WHERE s.id=$1 AND s.customer_subject=$2
   ORDER BY m.created_at,m.id LIMIT $3 OFFSET $4`,[id,subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async createSupport(identity:VerifiedIdentity,input:SupportInput){
  if((input.category==='order'||input.category==='reservation')!==!!input.resourceId)throw new BadRequestException('Only order/reservation cases require a resource ID');
  const canonical={category:input.category,resourceId:input.resourceId?.toLowerCase()??null,subject:input.subject.trim(),message:input.message.trim()};
  const fingerprint=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return this.customer.withAccountTransaction(identity,async c=>{
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['support',identity.subject,input.requestKey])]);
   const prior=await c.query('SELECT id,fingerprint FROM customer_support_cases WHERE customer_subject=$1 AND request_key=$2',[identity.subject,input.requestKey]);
   if(prior.rowCount){if(prior.rows[0].fingerprint!==fingerprint)throw new ConflictException('Support request key reused with different input');return this.ownedCase(c,identity.subject,prior.rows[0].id);}
   if(canonical.resourceId){
    const table=input.category==='order'?'business_orders':'business_reservations';
    if(!(await c.query(`SELECT 1 FROM ${table} WHERE id=$1 AND customer_subject=$2 FOR SHARE`,[canonical.resourceId,identity.subject])).rowCount)throw new NotFoundException('Experience not found');
   }
   const result=await c.query(`INSERT INTO customer_support_cases(customer_subject,request_key,fingerprint,category,resource_id,subject)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING ${supportCase}`,[identity.subject,input.requestKey,fingerprint,canonical.category,canonical.resourceId,canonical.subject]);
   const id=result.rows[0].id as string;
   await c.query('INSERT INTO customer_support_messages(case_id,request_key,body) VALUES($1,$2,$3)',[id,input.requestKey,canonical.message]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',['customer.support.opened',JSON.stringify({caseId:id})]);return result.rows[0];
  });
 }
 async reply(identity:VerifiedIdentity,id:string,input:SupportMessageInput){
  return this.customer.withAccountTransaction(identity,async c=>{
   const support=await this.ownedCase(c,identity.subject,id,true);
   const prior=await c.query('SELECT id,body,created_at AS "createdAt" FROM customer_support_messages WHERE case_id=$1 AND request_key=$2',[id,input.requestKey]);
   if(prior.rowCount){if(prior.rows[0].body!==input.message.trim())throw new ConflictException('Reply key reused with different message');return prior.rows[0];}
   if(support.status!=='open')throw new ConflictException('Support case is closed');
   const count=await c.query('SELECT count(*)::int AS count FROM customer_support_messages WHERE case_id=$1',[id]);
   if(count.rows[0].count>=100)throw new ConflictException('Support message limit reached');
   const result=await c.query('INSERT INTO customer_support_messages(case_id,request_key,body) VALUES($1,$2,$3) RETURNING id,body,created_at AS "createdAt"',[id,input.requestKey,input.message.trim()]);
   await c.query('UPDATE customer_support_cases SET updated_at=now() WHERE id=$1',[id]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',['customer.support.replied',JSON.stringify({caseId:id})]);return result.rows[0];
  });
 }
 async closeSupport(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>{
   const current=await this.ownedCase(c,identity.subject,id,true);if(current.status==='closed')return current;
   return (await c.query(`UPDATE customer_support_cases SET status='closed',updated_at=now() WHERE id=$1 RETURNING ${supportCase}`,[id])).rows[0];
  });
 }
}
