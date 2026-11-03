import {ConflictException,Inject,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
const MAX_MINOR=9007199254740991n;
@Injectable()
export class RideFareService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async quote(subject:string,body:{pickup:{latitude:number;longitude:number};destination:{latitude:number;longitude:number};category:string}){
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const tariff=await c.query<{id:string;version:number;base_minor:string;per_km_minor:string;commission_bps:number}>(`SELECT id,version,base_minor::text,per_km_minor::text,commission_bps
      FROM ride_tariff_policies WHERE category=$1 AND active=true LIMIT 1 FOR SHARE`,[body.category]);
   const policy=tariff.rows[0];
   if(!policy)throw new ServiceUnavailableException('Vehicle category fare not configured');
   const distance=await c.query<{metres:number}>(`SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
    ST_SetSRID(ST_MakePoint($3,$4),4326)::geography) AS metres`,
    [body.pickup.longitude,body.pickup.latitude,body.destination.longitude,body.destination.latitude]);
   const metres=Number(distance.rows[0]?.metres);
   if(!Number.isFinite(metres)||metres<1)throw new ConflictException('Invalid pickup/destination distance');
   // This is great-circle distance, NOT road distance or guaranteed map ETA.
   const amount=BigInt(policy.base_minor)+BigInt(Math.ceil(metres/1000))*BigInt(policy.per_km_minor);
   if(amount<1n||amount>MAX_MINOR)throw new ConflictException('Fare outside bounded payment range');
   const r=await c.query<{id:string;expires_at:Date}>(`INSERT INTO ride_fare_quotes(
     customer_subject,pickup,destination,category,amount_minor,pricing_version,commission_bps,policy_id,expires_at)
     VALUES($1,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
     ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6,$7,$8,$9,$10,now()+interval '5 minutes')
     RETURNING id,expires_at`,[
     subject,body.pickup.longitude,body.pickup.latitude,body.destination.longitude,body.destination.latitude,
     body.category,amount.toString(),'v'+policy.version,policy.commission_bps,policy.id]);
   await c.query('COMMIT');
   return {id:r.rows[0].id,amountMinor:amount.toString(),currency:'NGN',
    expiresAt:r.rows[0].expires_at,pricingVersion:'v'+policy.version,
    distanceBasis:'straight_line_estimate',category:body.category};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
