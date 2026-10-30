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
  if(result.rows.length){
   const profile=await this.pool.query<{suspended:boolean}>('SELECT suspended FROM user_profiles WHERE identity_subject=$1',[subject]);
   return {suspended:result.rows[0].suspended||profile.rows.length!==1||profile.rows[0].suspended,revokedAfter:result.rows[0].revoked_after};
  }
  // No implicitly active account via the legacy profile fallback.
  return {suspended:true,revokedAfter:null};
 }
 /** Database-backed revocation works across every API instance, independent of token cache. */
 async sessionRevoked(subject:string,sessionId:string):Promise<boolean>{
  if(!subject||!sessionId)return true;
  const result=await this.pool.query('SELECT 1 FROM revoked_identity_sessions WHERE identity_subject=$1 AND session_id=$2 LIMIT 1',[subject,sessionId]);
  return result.rowCount===1;
 }
 /** Revoke the current signed session. The client must also call Keycloak end-session
  * to revoke refresh tokens; this API blocks any still-valid access bearer. */
 async revokeSession(subject:string,sessionId:string):Promise<void>{
  if(!subject||!sessionId||sessionId.length>255)throw Error('Invalid session');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('INSERT INTO revoked_identity_sessions(identity_subject,session_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[subject,sessionId]);
   await client.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'session_revoked')",[subject]);
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async member(subject:string,type:ResourceType,id:string,roles:readonly string[]):Promise<boolean>{
  if(!validTypes.has(type)||!roles.length||roles.some(r=>!validRoles.has(r as ResourceRole)))return false;
  const result=await this.pool.query(`SELECT 1 FROM resource_memberships m JOIN account_access a ON a.identity_subject=m.identity_subject JOIN user_profiles p ON p.identity_subject=m.identity_subject WHERE m.identity_subject=$1 AND m.resource_type=$2 AND m.resource_id=$3::uuid AND m.role=ANY($4::varchar[]) AND m.active=true AND a.suspended=false AND p.suspended=false AND (m.resource_type<>'business' OR EXISTS (SELECT 1 FROM business_onboarding b WHERE b.id=m.resource_id AND b.status='approved')) LIMIT 1`,[subject,type,id,roles]);
  return result.rowCount===1;
 }
 /** Trusted identity event handler. Default is suspended until an authorized onboarding decision. */
 async provisionSubject(subject:string):Promise<void>{
  if(!subject||subject.length>255)throw Error('Invalid identity subject');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,true) ON CONFLICT(identity_subject) DO NOTHING',[subject]);
   const inserted=await client.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,true) ON CONFLICT(identity_subject) DO NOTHING RETURNING identity_subject',[subject]);
   if(inserted.rowCount===1)
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
 /** Database-serialized privileged mutation budget: shared across API instances.
  * Records each accepted attempt in the same transaction as its quota decision.
  */
 async allowPrivilegedRequest(actor:string):Promise<boolean>{
  if(!actor||actor.length>255)return false;
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[actor]);
   const count=await client.query<{total:string}>(
    "SELECT COUNT(*)::text AS total FROM identity_security_events WHERE actor_subject=$1 AND event_type='admin_request' AND occurred_at>now()-interval '60 seconds'",[actor]);
   const allowed=Number(count.rows[0]?.total??'0')<20;
   if(allowed)await client.query(
    "INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'admin_request')",[actor]);
   await client.query('COMMIT');
   return allowed;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async setMembership(actor:string,subject:string,type:ResourceType,id:string,role:ResourceRole,active:boolean):Promise<void>{
  if(!actor||!subject||!validTypes.has(type)||!validRoles.has(role)||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid membership command');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   if(type==='business'&&active){
    const verified=await client.query("SELECT 1 FROM business_onboarding WHERE id=$1::uuid AND status='approved' FOR SHARE",[id]);
    if(verified.rowCount!==1)throw new Error('Business must be approved before membership activation');
   }
   const updated=await client.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
    VALUES($1,$2,$3::uuid,$4,$5) ON CONFLICT(identity_subject,resource_type,resource_id,role)
    DO UPDATE SET active=EXCLUDED.active RETURNING id`,[subject,type,id,role,active]);
   if(updated.rowCount!==1)throw Error('Membership update failed');
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,active?'membership_enabled':'membership_disabled',type+':'+id+':'+role]);
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
