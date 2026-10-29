import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool,PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AccessService} from '../auth/access.service';
type OrderState='placed'|'accepted'|'preparing'|'ready'|'fulfilled'|'cancelled';
type ReservationState='confirmed'|'checked_in'|'completed'|'cancelled';
const orderNext:Record<OrderState,readonly OrderState[]>={placed:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['fulfilled','cancelled'],fulfilled:[],cancelled:[]};
const reservationNext:Record<ReservationState,readonly ReservationState[]>={confirmed:['checked_in','cancelled'],checked_in:['completed'],completed:[],cancelled:[]};
@Injectable()
export class BusinessService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AccessService)private readonly access:AccessService){}
 private async tx<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
  const client=await this.pool.connect();try{await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}
  catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 private async authorized(client:PoolClient,subject:string,businessId:string,roles:readonly string[],branchId?:string){
  // Lock the approval row so a revocation or review cannot race the business mutation.
  const state=await this.access.state(subject);
  if(state.suspended)throw new ForbiddenException();
  const approval=await client.query("SELECT id FROM business_onboarding WHERE id=$1::uuid AND status='approved' FOR SHARE",[businessId]);
  if(approval.rowCount!==1)throw new ForbiddenException('Business not approved');
  const membership=await client.query(`SELECT role FROM resource_memberships WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2::uuid AND role=ANY($3::varchar[]) AND active=true ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END LIMIT 1`,[subject,businessId,roles]);
  if(branchId){const found=await client.query('SELECT 1 FROM business_branches WHERE id=$1 AND business_id=$2 AND active',[branchId,businessId]);if(found.rowCount!==1)throw new NotFoundException('Branch unavailable');}
  const branch=branchId?await client.query("SELECT 1 FROM resource_memberships WHERE identity_subject=$1 AND resource_type='branch' AND resource_id=$2::uuid AND role=ANY($3::varchar[]) AND active=true LIMIT 1",[subject,branchId]):null;
  // An owner/manager has business-wide authority. Staff require both a business membership and branch grant.
  if(membership.rowCount!==1 || (branchId&&!['owner','manager'].includes(membership.rows[0].role as string)&&branch?.rowCount!==1))throw new ForbiddenException();
 }
 async createBranch(subject:string,businessId:string,input:{name:string;contactEmail?:string;address?:string;timezone?:string}){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager']);
   const r=await c.query("INSERT INTO business_branches(business_id,name,contact_email,address,timezone) VALUES($1,$2,$3,$4,$5) RETURNING *",[businessId,input.name.trim(),input.contactEmail??null,input.address??null,input.timezone??'Africa/Lagos']);return r.rows[0];});
 }
 async branches(subject:string,businessId:string){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff']);const permissions=await c.query("SELECT role FROM resource_memberships WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2 AND active AND role IN ('owner','manager') LIMIT 1",[subject,businessId]);
   return (await c.query(permissions.rowCount?'SELECT * FROM business_branches WHERE business_id=$1 ORDER BY created_at,id':"SELECT b.* FROM business_branches b JOIN resource_memberships m ON m.resource_type='branch' AND m.resource_id=b.id AND m.identity_subject=$2 AND m.active AND m.role='staff' WHERE b.business_id=$1 ORDER BY b.created_at,b.id",permissions.rowCount?[businessId]:[businessId,subject])).rows;});
 }
 async createItem(subject:string,businessId:string,branchId:string,input:{name:string;description?:string;kind:string;priceMinor:number;currency?:string;published?:boolean}){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager'],branchId);
   const r=await c.query("INSERT INTO business_catalogue(business_id,branch_id,name,description,kind,price_minor,currency,published) SELECT $1,$2,$3,$4,$5,$6,$7,$8 WHERE EXISTS(SELECT 1 FROM business_branches WHERE id=$2 AND business_id=$1 AND active) RETURNING *",[businessId,branchId,input.name.trim(),input.description??null,input.kind,input.priceMinor,input.currency??'NGN',input.published??false]);
   if(!r.rowCount)throw new NotFoundException('Branch unavailable');return r.rows[0];});
 }
 async items(subject:string,businessId:string,branchId:string){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   return (await c.query('SELECT * FROM business_catalogue WHERE business_id=$1 AND branch_id=$2 AND active ORDER BY created_at,id',[businessId,branchId])).rows;});
 }
 async createSlot(subject:string,businessId:string,branchId:string,input:{catalogueId:string;startsAt:string;endsAt:string;capacity:number}){
  if(!Number.isFinite(Date.parse(input.startsAt))||!Number.isFinite(Date.parse(input.endsAt))||Date.parse(input.endsAt)<=Date.parse(input.startsAt))throw new BadRequestException('Invalid slot time');
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager'],branchId);
   const r=await c.query("INSERT INTO business_availability(business_id,branch_id,catalogue_id,starts_at,ends_at,capacity) SELECT $1,$2,$3,$4::timestamptz,$5::timestamptz,$6 WHERE EXISTS(SELECT 1 FROM business_catalogue WHERE id=$3 AND business_id=$1 AND branch_id=$2 AND active AND published) RETURNING *",[businessId,branchId,input.catalogueId,input.startsAt,input.endsAt,input.capacity]);
   if(!r.rowCount)throw new NotFoundException('Published catalogue item unavailable');return r.rows[0];});
 }
 async slots(subject:string,businessId:string,branchId:string){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   return (await c.query('SELECT * FROM business_availability WHERE business_id=$1 AND branch_id=$2 ORDER BY starts_at',[businessId,branchId])).rows;});
 }
 async reserve(subject:string,businessId:string,branchId:string,input:{availabilityId:string;customerSubject:string;guests:number}){
  if(!Number.isSafeInteger(input.guests)||input.guests<1||input.guests>10000)throw new BadRequestException('Invalid guest count');
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   const updated=await c.query("UPDATE business_availability SET reserved=reserved+$4 WHERE id=$1 AND business_id=$2 AND branch_id=$3 AND active AND starts_at>now() AND reserved+$4<=capacity RETURNING id",[input.availabilityId,businessId,branchId,input.guests]);
   if(!updated.rowCount)throw new ConflictException('Slot unavailable or capacity exhausted');
   const r=await c.query("INSERT INTO business_reservations(business_id,branch_id,availability_id,customer_subject,guests) VALUES($1,$2,$3,$4,$5) RETURNING *",[businessId,branchId,input.availabilityId,input.customerSubject,input.guests]);return r.rows[0];});
 }
 async reservations(subject:string,businessId:string,branchId:string){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   return (await c.query('SELECT * FROM business_reservations WHERE business_id=$1 AND branch_id=$2 ORDER BY created_at DESC',[businessId,branchId])).rows;});
 }
 async reservationStatus(subject:string,businessId:string,branchId:string,id:string,to:ReservationState){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   const previous=await c.query<{status:ReservationState;guests:number;availability_id:string}>('SELECT status,guests,availability_id FROM business_reservations WHERE id=$1 AND business_id=$2 AND branch_id=$3 FOR UPDATE',[id,businessId,branchId]);
   if(!previous.rowCount)throw new NotFoundException('Reservation not found');
   const from=previous.rows[0];if(!reservationNext[from.status].includes(to))throw new ConflictException('Illegal reservation transition');
   if(to==='cancelled')await c.query('UPDATE business_availability SET reserved=reserved-$2 WHERE id=$1',[from.availability_id,from.guests]);
   const r=await c.query('UPDATE business_reservations SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,to]);return r.rows[0];});
 }
 async placeOrder(subject:string,businessId:string,branchId:string,input:{customerSubject:string;items:{catalogueId:string;quantity:number}[]}){
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>100||new Set(input.items.map(i=>i.catalogueId)).size!==input.items.length)throw new BadRequestException('Invalid order items');
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   if(input.items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>10000))throw new BadRequestException('Invalid quantity');
   const ids=input.items.map(i=>i.catalogueId);
   const products=await c.query<{id:string;price_minor:string;currency:string}>("SELECT id,price_minor::text,currency FROM business_catalogue WHERE business_id=$1 AND branch_id=$2 AND id=ANY($3::uuid[]) AND active AND published FOR SHARE",[businessId,branchId,ids]);
   if(products.rowCount!==ids.length)throw new ConflictException('Catalogue item unavailable');
   if(new Set(products.rows.map(p=>p.currency)).size!==1)throw new ConflictException('Mixed currencies');
   const byId=new Map(products.rows.map(p=>[p.id,p]));
   const total=input.items.reduce((sum,i)=>sum+BigInt(byId.get(i.catalogueId)!.price_minor)*BigInt(i.quantity),0n);
   if(total>9223372036854775807n)throw new BadRequestException('Order total overflow');
   const order=await c.query("INSERT INTO business_orders(business_id,branch_id,customer_subject,total_minor,currency) VALUES($1,$2,$3,$4,$5) RETURNING *",[businessId,branchId,input.customerSubject,total.toString(),products.rows[0].currency]);
   for(const item of input.items)await c.query("INSERT INTO business_order_items(business_id,branch_id,order_id,catalogue_id,quantity,unit_price_minor) VALUES($1,$2,$3,$4,$5,$6)",[businessId,branchId,order.rows[0].id,item.catalogueId,item.quantity,byId.get(item.catalogueId)!.price_minor]);
   return order.rows[0];});
 }
 async orders(subject:string,businessId:string,branchId:string){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   return (await c.query('SELECT * FROM business_orders WHERE business_id=$1 AND branch_id=$2 ORDER BY created_at DESC',[businessId,branchId])).rows;});
 }
 async orderStatus(subject:string,businessId:string,branchId:string,id:string,to:OrderState){
  return this.tx(async c=>{await this.authorized(c,subject,businessId,['owner','manager','staff'],branchId);
   const current=await c.query<{status:OrderState}>('SELECT status FROM business_orders WHERE id=$1 AND business_id=$2 AND branch_id=$3 FOR UPDATE',[id,businessId,branchId]);
   if(!current.rowCount)throw new NotFoundException('Order not found');
   if(!orderNext[current.rows[0].status].includes(to))throw new ConflictException('Illegal order transition');
   return (await c.query('UPDATE business_orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,to])).rows[0];});
 }
}
