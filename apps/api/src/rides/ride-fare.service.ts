import {Inject,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';

function tariff(){
 const base=Number(process.env.FAJI_RIDE_FARE_BASE_MINOR);
 const perKm=Number(process.env.FAJI_RIDE_FARE_PER_KM_MINOR);
 const version=process.env.FAJI_RIDE_FARE_VERSION;
 const commissionBps=Number(process.env.FAJI_RIDE_COMMISSION_BPS);
 if(!Number.isSafeInteger(base)||base<0||!Number.isSafeInteger(perKm)||perKm<0||!version||version.length>40||!Number.isInteger(commissionBps)||commissionBps<0||commissionBps>10000)
  throw new ServiceUnavailableException('Ride fare tariff not configured');
 return {base,perKm,version,commissionBps};
}
@Injectable()
export class RideFareService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async quote(subject:string,body:{pickup:{latitude:number;longitude:number};destination:{latitude:number;longitude:number};category:string}){
  const rate=tariff();
  const distance=await this.pool.query<{metres:number}>(`SELECT ST_Distance(
   ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
   ST_SetSRID(ST_MakePoint($3,$4),4326)::geography) AS metres`,
   [body.pickup.longitude,body.pickup.latitude,body.destination.longitude,body.destination.latitude]);
  const metres=Number(distance.rows[0]?.metres);
  if(!Number.isFinite(metres)||metres<1)throw new ServiceUnavailableException('Invalid route distance');
  // Geodesic distance is NOT a routing distance. Tariff is a provisional upper-level quote
  // model configured by operations; no external map estimate is implied.
  const minor=rate.base+Math.ceil(metres/1000)*rate.perKm;
  if(!Number.isSafeInteger(minor)||minor<1)throw new ServiceUnavailableException('Fare exceeds safe range');
  const r=await this.pool.query<{id:string;expires_at:Date}>(`INSERT INTO ride_fare_quotes(
   customer_subject,pickup,destination,category,amount_minor,pricing_version,commission_bps,expires_at)
   VALUES($1,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
   ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6,$7,$8,$9,now()+interval '5 minutes')
   RETURNING id,expires_at`,
   [subject,body.pickup.longitude,body.pickup.latitude,body.destination.longitude,body.destination.latitude,body.category,minor,rate.version,rate.commissionBps]);
  return {id:r.rows[0].id,amountMinor:String(minor),currency:'NGN',expiresAt:r.rows[0].expires_at,pricingVersion:rate.version,distanceBasis:'straight_line_estimate'};
 }
}
