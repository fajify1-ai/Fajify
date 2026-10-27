import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
export type BusinessStatus='pending'|'approved'|'rejected';
@Injectable()
export class BusinessApprovalService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async apply(subject:string,name:string){
  if(!subject||subject.length>255||name.trim().length<2||name.trim().length>120)throw new BadRequestException('Invalid business application');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const state=await client.query('SELECT 1 FROM account_access WHERE identity_subject=$1',[subject]);
   if(state.rowCount!==1)throw new BadRequestException('Account enrollment required');
   const row=await client.query<{id:string,status:BusinessStatus}>(
    "INSERT INTO business_onboarding(applicant_subject,display_name) VALUES($1,$2) RETURNING id,status",[subject,name.trim()]);
   await client.query("INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,'business_applied',$2)",[subject,row.rows[0].id]);
   await client.query('COMMIT');
   return row.rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async getOwn(subject:string,id:string){
  const r=await this.pool.query('SELECT id,display_name,status,created_at,reviewed_at FROM business_onboarding WHERE id=$1::uuid AND applicant_subject=$2',[id,subject]);
  if(!r.rowCount)throw new NotFoundException('Business application not found');
  return r.rows[0];
 }
 async review(actor:string,id:string,decision:'approved'|'rejected'){
  if(!actor||!id||!['approved','rejected'].includes(decision))throw new BadRequestException('Invalid review');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const found=await client.query<{applicant_subject:string;status:BusinessStatus}>(
    'SELECT applicant_subject,status FROM business_onboarding WHERE id=$1::uuid FOR UPDATE',[id]);
   if(found.rowCount!==1)throw new NotFoundException('Business application not found');
   if(found.rows[0].applicant_subject===actor)throw new BadRequestException('Self approval prohibited');
   if(found.rows[0].status!=='pending')throw new ConflictException('Business application already reviewed');
   await client.query('UPDATE business_onboarding SET status=$2,reviewer_subject=$3,reviewed_at=now() WHERE id=$1::uuid',[id,decision,actor]);
   if(decision==='approved'){
    await client.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
     VALUES($1,'business',$2::uuid,'owner',true)
     ON CONFLICT(identity_subject,resource_type,resource_id,role) DO UPDATE SET active=true`,[found.rows[0].applicant_subject,id]);
   }
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,decision==='approved'?'business_approved':'business_rejected',id]);
   await client.query('COMMIT');
   return {id,status:decision};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async approvedMember(subject:string,id:string,roles:readonly string[]):Promise<boolean>{
  if(!roles.length)return false;
  const r=await this.pool.query(`SELECT 1 FROM business_onboarding b
   JOIN resource_memberships m ON m.resource_type='business' AND m.resource_id=b.id AND m.identity_subject=$1
   JOIN account_access a ON a.identity_subject=m.identity_subject
   JOIN user_profiles p ON p.identity_subject=m.identity_subject
   WHERE b.id=$2::uuid AND b.status='approved' AND m.active=true
    AND m.role=ANY($3::varchar[]) AND a.suspended=false AND p.suspended=false LIMIT 1`,[subject,id,roles]);
  return r.rowCount===1;
 }
}
