import {createHash} from 'node:crypto';
import {BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {Pool, type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';
import type {CustomerOrderInput, CustomerReservationInput, DiscoveryQuery, PageQuery} from './customer.dto';

const visible = `FROM business_catalogue i
 JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id
 JOIN business_onboarding m ON m.id=i.business_id
 WHERE i.active AND i.published AND b.active AND m.status='approved'`;
const offering = `i.id,i.business_id AS "businessId",i.branch_id AS "branchId",
 m.display_name AS "businessName",b.name AS "branchName",b.address,
 i.name,i.description,i.kind AS category,i.price_minor::text AS "priceMinor",i.currency`;
const reservation = `id,business_id AS "businessId",branch_id AS "branchId",
 availability_id AS "availabilityId",guests,guest_name AS "guestName",status,created_at AS "createdAt"`;
const order = `id,business_id AS "businessId",branch_id AS "branchId",
 status,total_minor::text AS "totalMinor",currency,created_at AS "createdAt"`;

export function page<T>(rows:T[], input:PageQuery){
 return {items:rows.slice(0,input.limit),nextOffset:rows.length>input.limit?input.offset+input.limit:null};
}
/** LIKE metacharacters in customer search are literal text, never a wildcard language. */
export function searchPattern(value:string){return '%'+value.trim().replace(/[\\%_]/g,'\\$&')+'%';}

@Injectable()
export class CustomerService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}

 async discover(input:DiscoveryQuery){
  const filters:string[]=[]; const values:unknown[]=[];
  if(input.q){values.push(searchPattern(input.q));filters.push(`(i.name ILIKE $${values.length} OR m.display_name ILIKE $${values.length} OR b.name ILIKE $${values.length})`);}
  if(input.location){values.push(searchPattern(input.location));filters.push(`b.address ILIKE $${values.length}`);}
  if(input.category){values.push(input.category);filters.push(`i.kind=$${values.length}`);}
  if(input.branchId){values.push(input.branchId);filters.push(`b.id=$${values.length}`);}
  values.push(input.limit+1,input.offset);
  const rows=await this.pool.query(`SELECT ${offering} ${visible}${filters.map(v=>' AND '+v).join('')}
   ORDER BY i.created_at DESC,i.id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  return page(rows.rows,input);
 }
 async detail(id:string){
  const result=await this.pool.query(`SELECT ${offering} ${visible} AND i.id=$1`,[id]);
  if(!result.rowCount)throw new NotFoundException('Offering unavailable');
  return result.rows[0];
 }
 async slots(id:string,input:PageQuery){
  await this.detail(id);
  const result=await this.pool.query(`SELECT a.id,a.catalogue_id AS "catalogueId",a.starts_at AS "startsAt",
   a.ends_at AS "endsAt",a.capacity-a.reserved AS remaining
   FROM business_availability a JOIN business_catalogue i ON i.id=a.catalogue_id AND i.business_id=a.business_id AND i.branch_id=a.branch_id
   JOIN business_branches b ON b.id=a.branch_id AND b.business_id=a.business_id
   JOIN business_onboarding m ON m.id=a.business_id
   WHERE i.id=$1 AND i.active AND i.published AND b.active AND m.status='approved'
   AND a.active AND a.starts_at>now() AND a.reserved<a.capacity
   ORDER BY a.starts_at,a.id LIMIT $2 OFFSET $3`,[id,input.limit+1,input.offset]);
  return page(result.rows,input);
 }
 async withAccountTransaction<T>(identity:VerifiedIdentity,run:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();
  try {
   await c.query('BEGIN');
   await c.query("SELECT set_config('faji.customer_actor',$1,true)",[identity.subject]);
   await c.query("SET LOCAL statement_timeout='5s'");
   await c.query("SET LOCAL lock_timeout='3s'");
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['customer-account',identity.subject])]);
   // Guard checks precede this; locks serialize writes with account suspension/revocation.
   const account=await c.query(`SELECT a.suspended,a.revoked_after,p.suspended AS profile_suspended
    FROM account_access a JOIN user_profiles p USING(identity_subject)
    WHERE a.identity_subject=$1 FOR SHARE OF a,p`,[identity.subject]);
   const row=account.rows[0];
   if(!row||row.suspended||row.profile_suspended||identity.expiresAt<=Date.now()/1000||row.revoked_after&&row.revoked_after.getTime()/1000>=identity.issuedAt)
    throw new ForbiddenException('Account unavailable');
   if(identity.sessionId){
    // Match the advisory lock in the session revoker so logout cannot overtake this write.
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['session:'+identity.subject+':'+identity.sessionId]);
    if((await c.query('SELECT 1 FROM revoked_identity_sessions WHERE identity_subject=$1 AND session_id=$2',[identity.subject,identity.sessionId])).rowCount)
     throw new ForbiddenException('Session revoked');
   }
   const value=await run(c);await c.query('COMMIT');return value;
  }catch(e){
   await c.query('ROLLBACK');
   if(['55P03','40P01','40001'].includes((e as {code?:string}).code??''))throw new ConflictException('Concurrent change; retry with the same request key');
   throw e;
  }finally{c.release();}
 }
 private async retry(c:PoolClient,subject:string,operation:'order'|'reservation',key:string,input:unknown):Promise<{fingerprint:string;id?:string}>{
  if(!/^[A-Za-z0-9_-]{8,100}$/.test(key))throw new BadRequestException('Invalid request key');
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['customer',subject,operation,key])]);
  const previous=await c.query('SELECT resource_id,fingerprint FROM customer_request_keys WHERE customer_subject=$1 AND operation=$2 AND request_key=$3',[subject,operation,key]);
  if(previous.rowCount&&previous.rows[0].fingerprint!==fingerprint)throw new ConflictException('Request key reused with different input');
  return {fingerprint,id:previous.rows[0]?.resource_id};
 }
 private async record(c:PoolClient,subject:string,operation:string,key:string,fingerprint:string,id:string,businessId:string){
  await c.query('INSERT INTO customer_request_keys(customer_subject,operation,request_key,fingerprint,resource_id) VALUES($1,$2,$3,$4,$5)',[subject,operation,key,fingerprint,id]);
  await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',[
   operation==='order'?'business.order.placed':'business.reservation.confirmed',JSON.stringify({businessId,resourceId:id,source:'customer'})]);
 }
 private async eligibleBranch(c:PoolClient,branchId:string){
  const result=await c.query(`SELECT b.business_id FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id
   WHERE b.id=$1 AND b.active AND m.status='approved' FOR SHARE OF m,b`,[branchId]);
  if(!result.rowCount)throw new NotFoundException('Branch unavailable');
  return result.rows[0].business_id as string;
 }
 async reserve(identity:VerifiedIdentity,input:CustomerReservationInput){
  return this.withAccountTransaction(identity,async c=>{
   const retry=await this.retry(c,identity.subject,'reservation',input.requestKey,{availabilityId:input.availabilityId.toLowerCase(),guests:input.guests,guestName:input.guestName.trim()});
   if(retry.id)return this.reservation(c,identity.subject,retry.id);
   const slot=await c.query('SELECT branch_id,catalogue_id FROM business_availability WHERE id=$1',[input.availabilityId]);
   if(!slot.rowCount)throw new NotFoundException('Slot unavailable');
   const businessId=await this.eligibleBranch(c,slot.rows[0].branch_id);
   const item=await c.query(`SELECT price_minor::text,kind FROM business_catalogue
    WHERE id=$1 AND business_id=$2 AND branch_id=$3 AND active AND published FOR SHARE`,[slot.rows[0].catalogue_id,businessId,slot.rows[0].branch_id]);
   if(!item.rowCount)throw new ConflictException('Offering unavailable');
   // M5 owns verified paid confirmation and tickets; M6 owns package composition capacity.
   if(item.rows[0].kind!=='service'||item.rows[0].price_minor!=='0')throw new ConflictException('Only free service reservations are enabled before M5 paid checkout');
   const updated=await c.query(`UPDATE business_availability SET reserved=reserved+$2
    WHERE id=$1 AND active AND starts_at>now() AND reserved+$2<=capacity RETURNING id`,[input.availabilityId,input.guests]);
   if(!updated.rowCount)throw new ConflictException('Slot unavailable or capacity exhausted');
   const created=await c.query(`INSERT INTO business_reservations(business_id,branch_id,availability_id,customer_subject,guests,guest_name)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[businessId,slot.rows[0].branch_id,input.availabilityId,identity.subject,input.guests,input.guestName.trim()]);
   const id=created.rows[0].id as string;
   await this.record(c,identity.subject,'reservation',input.requestKey,retry.fingerprint,id,businessId);
   return this.reservation(c,identity.subject,id);
  });
 }
 private async reservation(c:Pool|PoolClient,subject:string,id:string){
  const result=await c.query(`SELECT ${reservation} FROM business_reservations WHERE id=$1 AND customer_subject=$2`,[id,subject]);
  if(!result.rowCount)throw new NotFoundException('Reservation not found');return result.rows[0];
 }
 async reservations(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT ${reservation} FROM business_reservations WHERE customer_subject=$1
   ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async reservationDetail(subject:string,id:string){return this.reservation(this.pool,subject,id);}
 async cancelReservation(identity:VerifiedIdentity,id:string){
  return this.withAccountTransaction(identity,async c=>{
   const current=await c.query(`SELECT status,availability_id,guests,business_id FROM business_reservations
    WHERE id=$1 AND customer_subject=$2 FOR UPDATE`,[id,identity.subject]);
   if(!current.rowCount)throw new NotFoundException('Reservation not found');
   const row=current.rows[0];
   if(row.status==='cancelled')return this.reservation(c,identity.subject,id);
   if(row.status!=='confirmed')throw new ConflictException('Reservation cannot be cancelled');
   const paid=await c.query(`SELECT 1 FROM paid_holds h JOIN payment_intents p ON p.id=h.intent_id
    WHERE h.reservation_id=$1 AND h.customer_subject=$2 AND p.status='succeeded' AND h.status='confirmed'`,[id,identity.subject]);
   if(paid.rowCount)throw new ConflictException('Paid cancellation requires the verified finance refund workflow');
   const released=await c.query(`UPDATE business_availability SET reserved=reserved-$2
    WHERE id=$1 AND starts_at>now() AND reserved>=$2 RETURNING id`,[row.availability_id,row.guests]);
   if(!released.rowCount)throw new ConflictException('Cancellation closes when the slot starts');
   const components=await c.query<{availability_id:string;quantity:number}>(`
    SELECT pc.availability_id,pc.quantity FROM package_component_holds pc
    JOIN paid_holds h ON h.id=pc.hold_id
    WHERE h.reservation_id=$1 AND pc.released_at IS NULL ORDER BY pc.availability_id FOR UPDATE OF pc`,[id]);
   for(const component of components.rows){
    const capacity=await c.query('UPDATE business_availability SET reserved=reserved-$2 WHERE id=$1 AND reserved>=$2 AND starts_at>now() RETURNING id',[component.availability_id,component.quantity]);
    if(!capacity.rowCount)throw new ConflictException('Package cancellation capacity release failed');
   }
   await c.query(`UPDATE package_component_holds pc SET released_at=now()
    FROM paid_holds h WHERE pc.hold_id=h.id AND h.reservation_id=$1 AND pc.released_at IS NULL`,[id]);
   await c.query("UPDATE business_reservations SET status='cancelled',updated_at=now() WHERE id=$1",[id]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',['business.reservation.cancelled',JSON.stringify({businessId:row.business_id,resourceId:id,source:'customer'})]);
   return this.reservation(c,identity.subject,id);
  });
 }
 async placeOrder(identity:VerifiedIdentity,input:CustomerOrderInput){
  input={...input,branchId:input.branchId.toLowerCase(),items:input.items.map(line=>({catalogueId:line.catalogueId.toLowerCase(),quantity:line.quantity,expectedPriceMinor:line.expectedPriceMinor}))};
  if(new Set(input.items.map(i=>i.catalogueId)).size!==input.items.length)throw new BadRequestException('Duplicate catalogue items');
  return this.withAccountTransaction(identity,async c=>{
   const canonical={branchId:input.branchId,items:[...input.items].sort((a,b)=>a.catalogueId.localeCompare(b.catalogueId))};
   const retry=await this.retry(c,identity.subject,'order',input.requestKey,canonical);
   if(retry.id)return this.order(c,identity.subject,retry.id);
   const businessId=await this.eligibleBranch(c,input.branchId);
   const products=await c.query<{id:string;price_minor:string;currency:string}>(`SELECT id,price_minor::text,currency
    FROM business_catalogue WHERE branch_id=$1 AND business_id=$2 AND id=ANY($3::uuid[])
    AND kind='product' AND active AND published ORDER BY id FOR SHARE`,[input.branchId,businessId,input.items.map(i=>i.catalogueId)]);
   if(products.rows.length!==input.items.length)throw new ConflictException('Product unavailable');
   if(new Set(products.rows.map(p=>p.currency)).size!==1)throw new ConflictException('Mixed currencies');
   const byId=new Map(products.rows.map(p=>[p.id,p]));
   let total=0n;
   for(const line of input.items){
    const product=byId.get(line.catalogueId)!;
    if(product.price_minor!==line.expectedPriceMinor)throw new ConflictException('Price changed; refresh before ordering');
    total+=BigInt(product.price_minor)*BigInt(line.quantity);
   }
   if(total>9223372036854775807n)throw new BadRequestException('Order total overflow');
   const created=await c.query(`INSERT INTO business_orders(business_id,branch_id,customer_subject,total_minor,currency)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,[businessId,input.branchId,identity.subject,total.toString(),products.rows[0].currency]);
   const id=created.rows[0].id as string;
   for(const line of input.items)await c.query(`INSERT INTO business_order_items(business_id,branch_id,order_id,catalogue_id,quantity,unit_price_minor)
    VALUES($1,$2,$3,$4,$5,$6)`,[businessId,input.branchId,id,line.catalogueId,line.quantity,byId.get(line.catalogueId)!.price_minor]);
   await this.record(c,identity.subject,'order',input.requestKey,retry.fingerprint,id,businessId);
   return this.order(c,identity.subject,id);
  });
 }
 private async order(c:Pool|PoolClient,subject:string,id:string){
  const result=await c.query(`SELECT ${order} FROM business_orders WHERE id=$1 AND customer_subject=$2`,[id,subject]);
  if(!result.rowCount)throw new NotFoundException('Order not found');
  const items=await c.query('SELECT catalogue_id AS "catalogueId",quantity,unit_price_minor::text AS "unitPriceMinor" FROM business_order_items WHERE order_id=$1 ORDER BY catalogue_id',[id]);
  return {...result.rows[0],items:items.rows};
 }
 async orders(subject:string,input:PageQuery){
  const result=await this.pool.query(`SELECT ${order} FROM business_orders WHERE customer_subject=$1
   ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,input.limit+1,input.offset]);return page(result.rows,input);
 }
 async orderDetail(subject:string,id:string){return this.order(this.pool,subject,id);}
 async cancelOrder(identity:VerifiedIdentity,id:string){
  return this.withAccountTransaction(identity,async c=>{
   const current=await c.query('SELECT status,business_id FROM business_orders WHERE id=$1 AND customer_subject=$2 FOR UPDATE',[id,identity.subject]);
   if(!current.rowCount)throw new NotFoundException('Order not found');
   if(current.rows[0].status==='cancelled')return this.order(c,identity.subject,id);
   if(current.rows[0].status!=='placed')throw new ConflictException('Cancellation closes when merchant accepts the order');
   await c.query("UPDATE business_orders SET status='cancelled',updated_at=now() WHERE id=$1",[id]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',['business.order.cancelled',JSON.stringify({businessId:current.rows[0].business_id,resourceId:id,source:'customer'})]);
   return this.order(c,identity.subject,id);
  });
 }
}
