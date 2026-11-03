import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AccessService} from '../auth/access.service';

/** No external routing provider is silently approximated for financial quotes. */
@Injectable()
export class RideRequestsService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool,@Inject(AccessService) private readonly access:AccessService){}
 async create(subject:string,input:{pickup:{latitude:number;longitude:number};destination:{latitude:number;longitude:number};category:string;quoteId:string;idempotencyKey:string}){
  if(!subject)throw new ForbiddenException();
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const active=await client.query("SELECT 1 FROM account_access access JOIN user_profiles profile ON profile.identity_subject=access.identity_subject WHERE access.identity_subject=$1 AND NOT access.suspended AND NOT profile.suspended",[subject]);
   if(!active.rowCount)throw new ForbiddenException('Customer account no longer active');
   const q=await client.query<{amount_minor:string;currency:string;expires_at:Date;customer_subject:string;category:string;pickup_lat:number;pickup_lng:number;destination_lat:number;destination_lng:number}>(`SELECT amount_minor::text,currency,expires_at,customer_subject,category,
      ST_Y(pickup::geometry) AS pickup_lat, ST_X(pickup::geometry) AS pickup_lng,
      ST_Y(destination::geometry) AS destination_lat,ST_X(destination::geometry) AS destination_lng
      FROM ride_fare_quotes WHERE id=$1 FOR UPDATE`,[input.quoteId]);
   const quote=q.rows[0];
   if(!quote||quote.customer_subject!==subject)throw new NotFoundException('Quote unavailable');
   if(quote.category!==input.category)throw new ConflictException('Quote category mismatched');
   const same=(a:number,b:number)=>Math.abs(a-b)<0.000001;
   if(!same(quote.pickup_lat,input.pickup.latitude)||!same(quote.pickup_lng,input.pickup.longitude)||
      !same(quote.destination_lat,input.destination.latitude)||!same(quote.destination_lng,input.destination.longitude))
      throw new ConflictException('Quoted locations differ');
   const existing=await client.query<{id:string;quote_id:string}>(`SELECT id,quote_id FROM ride_requests WHERE customer_subject=$1 AND idempotency_key=$2`,[subject,input.idempotencyKey]);
   if(existing.rowCount){
     if(existing.rows[0].quote_id!==input.quoteId)throw new ConflictException('Idempotency key reused');
     await client.query('COMMIT');return {id:existing.rows[0].id,replayed:true};
   }
   if(quote.expires_at.getTime()<=Date.now())throw new ConflictException('Quote expired');
   const result=await client.query<{id:string}>(`INSERT INTO ride_requests(customer_subject,pickup,destination,category,quote_amount_minor,currency,quote_expires_at,quote_id,idempotency_key)
     VALUES($1,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6,$7,$8,$9,$10,$11)
     RETURNING id`,[subject,input.pickup.longitude,input.pickup.latitude,input.destination.longitude,input.destination.latitude,input.category,quote.amount_minor,quote.currency,quote.expires_at,input.quoteId,input.idempotencyKey]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.requested',$1)",[JSON.stringify({rideId:result.rows[0].id})]);
   await client.query('COMMIT');
   return {id:result.rows[0].id,replayed:false};
  }catch(e){await client.query('ROLLBACK');if((e as {code?:string}).code==='23505')throw new ConflictException('Concurrent idempotent request; retry');throw e;}finally{client.release();}
 }
 async history(subject:string,limit=20,offset=0){
  const result=await this.pool.query(`SELECT id,status,category,quote_amount_minor::text AS amount_minor,currency,
   assigned_driver_id,created_at,updated_at
   FROM ride_requests WHERE customer_subject=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
   [subject,limit,offset]);
  return {items:result.rows,nextOffset:result.rows.length===limit?offset+limit:null};
 }
 async get(subject:string,id:string){
  const r=await this.pool.query(`SELECT id,status,category,quote_amount_minor::text AS amount_minor,currency,created_at,assigned_driver_id
  FROM ride_requests WHERE id=$1 AND customer_subject=$2`,[id,subject]);
  if(!r.rows[0])throw new NotFoundException();
  return r.rows[0];
 }
 async offerByDispatcher(subject:string,areaId:string):Promise<void>{
  if(!await this.access.member(subject,'dispatch_area',areaId,['dispatcher']))throw new ForbiddenException('Dispatcher area membership required');
 }
}
