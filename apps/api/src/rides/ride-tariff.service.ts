import {ConflictException,Inject,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
@Injectable()
export class RideTariffService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async create(actor:string,values:{category:string;baseMinor:string;perKmMinor:string;commissionBps:number}){
  const base=BigInt(values.baseMinor),perKm=BigInt(values.perKmMinor);
  if(base<0n||perKm<0n||base+perKm<1n||base>9007199254740991n||perKm>9007199254740991n)
   throw new ConflictException('Invalid fare policy');
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['ride-tariff:'+values.category]);
   const last=await c.query<{next:number}>(`SELECT (COALESCE(MAX(version),0)+1)::int AS next FROM ride_tariff_policies WHERE category=$1`,[values.category]);
   await c.query('UPDATE ride_tariff_policies SET active=false WHERE category=$1 AND active',[values.category]);
   const r=await c.query<{id:string;version:number}>(`INSERT INTO ride_tariff_policies(category,version,base_minor,per_km_minor,commission_bps,approved_by)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id,version`,
      [values.category,last.rows[0].next,base.toString(),perKm.toString(),values.commissionBps,actor]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.tariff.approved','ride_tariff_policy',$2)",[actor,r.rows[0].id]);
   await c.query('COMMIT');
   return {id:r.rows[0].id,version:r.rows[0].version,category:values.category,active:true};
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }
 async current(category:string){
  const r=await this.pool.query<{id:string;version:number;base_minor:string;per_km_minor:string;commission_bps:number}>(`SELECT id,version,base_minor::text,per_km_minor::text,commission_bps
   FROM ride_tariff_policies WHERE category=$1 AND active=true LIMIT 1`,[category]);
  if(!r.rows[0])throw new ServiceUnavailableException('Vehicle category fare unavailable');
  return r.rows[0];
 }
}
