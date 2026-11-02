import {CanActivate, ExecutionContext, HttpException, Inject, Injectable, ServiceUnavailableException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';

/** Database-backed fixed-minute budgets; rejected writes consume quota too. */
@Injectable()
export class CustomerWriteGuard implements CanActivate {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest<{method:string;identity?:VerifiedIdentity;route?:{path?:string}}>();
  if(['GET','HEAD','OPTIONS'].includes(req.method))return true;
  if(!req.identity)throw new HttpException('Verified identity required',401);
  const buckets:[string,number][]=[['write',60]];
  const path=req.route?.path??'';
  if(path.includes('support'))buckets.push(['support',10]);
  if(path.includes('review'))buckets.push(['review',10]);
  if(path.includes('payment')||path.includes('paid-holds'))buckets.push(['payment',10]);
  for(const [name,limit] of buckets){
   let used:number;
   try{
    const result=await this.pool.query<{used:number}>(`INSERT INTO customer_request_buckets AS bucket(customer_subject,bucket,window_start,used)
     VALUES($1,$2,floor(extract(epoch FROM clock_timestamp())/60)::bigint,1)
     ON CONFLICT(customer_subject,bucket) DO UPDATE SET window_start=EXCLUDED.window_start,
      used=CASE WHEN bucket.window_start=EXCLUDED.window_start THEN LEAST(bucket.used+1,$3::integer+1) ELSE 1 END RETURNING used`,[req.identity.subject,name,limit]);
    used=result.rows[0].used;
   }catch{throw new ServiceUnavailableException('Request budget unavailable');}
   if(used>limit){context.switchToHttp().getResponse<{setHeader:(name:string,value:string)=>void}>().setHeader('Retry-After','60');throw new HttpException('Too many write requests; retry in the next minute',429);}
  }
  return true;
 }
}
