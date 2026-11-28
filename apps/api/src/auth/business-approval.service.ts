import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {applicationSnapshot} from '../web-completion/onboarding';
import {DATABASE_POOL} from '../tokens';
export type BusinessStatus='pending'|'approved'|'rejected';
@Injectable()
export class BusinessApprovalService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async apply(subject:string,name:string,draftRevision?:number){
  if(!subject||subject.length>255||name.trim().length<2||name.trim().length>120)throw new BadRequestException('Invalid business application');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const state=await client.query('SELECT 1 FROM account_access WHERE identity_subject=$1',[subject]);
   if(state.rowCount!==1)throw new BadRequestException('Account enrollment required');
   let submission:{snapshot:ReturnType<typeof applicationSnapshot>;hash:string}|undefined;
   if(draftRevision!==undefined){
    const draft=await client.query('SELECT revision,data FROM web_onboarding_drafts WHERE subject=$1 FOR UPDATE',[subject]);
    if(!draft.rows[0]||draft.rows[0].revision!==draftRevision)throw new ConflictException('Draft changed. Reload before submitting.');
    const snapshot=applicationSnapshot(draft.rows[0].data);
    if(snapshot.businessName!==name.trim())throw new BadRequestException('Business name must match the saved application');
    const hash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const previous=await client.query("SELECT b.id,b.status FROM web_business_submissions s JOIN business_onboarding b ON b.id=s.application_id WHERE s.subject=$1 AND s.content_hash=$2 AND b.status IN ('pending','approved') ORDER BY b.created_at DESC LIMIT 1",[subject,hash]);
    if(previous.rows[0]){await client.query('COMMIT');return previous.rows[0];}
    submission={snapshot,hash};
   }
   const row=await client.query<{id:string,status:BusinessStatus}>(
    "INSERT INTO business_onboarding(applicant_subject,display_name) VALUES($1,$2) RETURNING id,status",[subject,name.trim()]);
   await client.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
    VALUES($1,'business',$2::uuid,'owner',true)
    ON CONFLICT(identity_subject,resource_type,resource_id,role) DO UPDATE SET active=true`,[subject,row.rows[0].id]);
   if(submission)await client.query('INSERT INTO web_business_submissions(application_id,subject,draft_revision,content_hash,snapshot) VALUES($1,$2,$3,$4,$5)',[row.rows[0].id,subject,draftRevision,submission.hash,JSON.stringify(submission.snapshot)]);
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
 async getOwnWorkspace(subject:string,id:string){
  const result=await this.pool.query(
   "SELECT id,display_name,status,review_reason FROM business_onboarding WHERE id=$1::uuid AND applicant_subject=$2",
   [id,subject]);
  if(!result.rowCount)throw new NotFoundException('Business workspace unavailable');
  return result.rows[0];
 }
 async review(actor:string,id:string,decision:'approved'|'rejected',reason?:string){
  if(!actor||!id||!['approved','rejected'].includes(decision)||decision==='rejected'&&(!reason||reason.trim().length<8||reason.trim().length>500))throw new BadRequestException('A rejection reason of 8 to 500 characters is required');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const found=await client.query<{applicant_subject:string;status:BusinessStatus}>(
    'SELECT applicant_subject,status FROM business_onboarding WHERE id=$1::uuid FOR UPDATE',[id]);
   if(found.rowCount!==1)throw new NotFoundException('Business application not found');
   if(found.rows[0].applicant_subject===actor)throw new BadRequestException('Self approval prohibited');
   if(found.rows[0].status!=='pending')throw new ConflictException('Business application already reviewed');
   if(decision==='approved'){
    const kyc=await client.query("SELECT 1 FROM account_kyc_verifications WHERE identity_subject=$1 AND status='verified'",[found.rows[0].applicant_subject]);
    if(!kyc.rowCount)throw new ConflictException('Account identity verification must be approved first');
    const evidence=await client.query(`SELECT count(*) FILTER(WHERE document_type='business_registration')::int AS registration,
     count(*) FILTER(WHERE document_type='business_photo')::int AS photos FROM web_verification_documents WHERE application_id=$1`,[id]);
    if(!evidence.rows[0]||evidence.rows[0].registration<1||evidence.rows[0].photos<1)throw new ConflictException('A business registration document and at least one business photo are required');
   }
   await client.query('UPDATE business_onboarding SET status=$2,reviewer_subject=$3,reviewed_at=now(),review_reason=$4 WHERE id=$1::uuid',[id,decision,actor,decision==='rejected'?reason!.trim():null]);
   if(decision==='approved'){
    await client.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
     VALUES($1,'business',$2::uuid,'owner',true)
     ON CONFLICT(identity_subject,resource_type,resource_id,role) DO UPDATE SET active=true`,[found.rows[0].applicant_subject,id]);
   }
   await client.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,decision==='approved'?'business_approved':'business_rejected',id]);
   await client.query('COMMIT');
   return {id,status:decision,reviewReason:decision==='rejected'?reason!.trim():null};
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
