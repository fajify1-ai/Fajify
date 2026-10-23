import {Inject,Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
export type ResourceType='business'|'branch'|'dispatch_area';
export interface AccessState {suspended:boolean;revokedAfter:Date|null;}
@Injectable()
export class AccessService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async state(subject:string):Promise<AccessState>{
  const result=await this.pool.query<{suspended:boolean;revoked_after:Date|null}>(
   'SELECT suspended,revoked_after FROM account_access WHERE identity_subject=$1',[subject]);
  if(result.rows.length)return {suspended:result.rows[0].suspended,revokedAfter:result.rows[0].revoked_after};
  const profile=await this.pool.query<{suspended:boolean}>('SELECT suspended FROM user_profiles WHERE identity_subject=$1',[subject]);
  if(!profile.rows.length)return {suspended:true,revokedAfter:null};
  return {suspended:profile.rows[0].suspended,revokedAfter:null};
 }
 async member(subject:string,type:ResourceType,id:string,roles:readonly string[]):Promise<boolean>{
  const result=await this.pool.query('SELECT 1 FROM resource_memberships WHERE identity_subject=$1 AND resource_type=$2 AND resource_id=$3::uuid AND role=ANY($4::varchar[]) AND active=true LIMIT 1',[subject,type,id,roles]);
  return result.rowCount===1;
 }
}
