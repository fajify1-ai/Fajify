import {Inject,Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
export type ResourceType='business'|'branch'|'dispatch_area';
export type ResourceRole='owner'|'manager'|'staff'|'driver'|'dispatcher';
export interface AccessState {suspended:boolean;revokedAfter:Date|null;}
const validTypes=new Set<ResourceType>(['business','branch','dispatch_area']);
const validRoles=new Set<ResourceRole>(['owner','manager','staff','driver','dispatcher']);
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
  if(!validTypes.has(type)||!roles.length||roles.some(r=>!validRoles.has(r as ResourceRole)))return false;
  const result=await this.pool.query('SELECT 1 FROM resource_memberships WHERE identity_subject=$1 AND resource_type=$2 AND resource_id=$3::uuid AND role=ANY($4::varchar[]) AND active=true LIMIT 1',[subject,type,id,roles]);
  return result.rowCount===1;
 }
 /** Trusted identity event handler. Default is suspended until an authorized onboarding decision. */
 async provisionSubject(subject:string):Promise<void>{
  if(!subject||subject.length>255)throw Error('Invalid identity subject');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,true) ON CONFLICT(identity_subject) DO NOTHING',[subject]);
   await client.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,true) ON CONFLICT(identity_subject) DO NOTHING',[subject]);
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,$2)',[subject,'account_provisioned']);
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 /** Privileged internal command. Caller authorization must happen before invocation. */
 async setSuspended(actor:string,subject:string,suspended:boolean):Promise<void>{
  if(!actor||!subject||actor===subject)throw Error('Invalid administrative action');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const updated=await client.query('UPDATE account_access SET suspended=$2,revoked_after=CASE WHEN $2 THEN now() ELSE revoked_after END,updated_at=now() WHERE identity_subject=$1',[subject,suspended]);
   if(updated.rowCount!==1)throw Error('Account not provisioned');
   await client.query('UPDATE user_profiles SET suspended=$2,updated_at=now() WHERE identity_subject=$1',[subject,suspended]);
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,suspended?'account_suspended':'account_reinstated',subject]);
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async setMembership(actor:string,subject:string,type:ResourceType,id:string,role:ResourceRole,active:boolean):Promise<void>{
  if(!actor||!subject||!validTypes.has(type)||!validRoles.has(role)||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid membership command');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const updated=await client.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
    VALUES($1,$2,$3::uuid,$4,$5) ON CONFLICT(identity_subject,resource_type,resource_id,role)
    DO UPDATE SET active=EXCLUDED.active RETURNING id`,[subject,type,id,role,active]);
   if(updated.rowCount!==1)throw Error('Membership update failed');
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,active?'membership_enabled':'membership_disabled',type+':'+id+':'+role]);
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
