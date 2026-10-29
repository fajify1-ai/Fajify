import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AccessService} from '../auth/access.service';
@Injectable()
export class ManagementService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AccessService)private readonly access:AccessService){}
 private async transaction<T>(run:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();try{await c.query('BEGIN');const value=await run(c);await c.query('COMMIT');return value;}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 private async audit(c:PoolClient,actor:string,type:string,id:string){await c.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,type,id]);}
 private async owner(c:PoolClient,actor:string,business:string,allowManager=false){
  const state=await this.access.state(actor);if(state.suspended)throw new ForbiddenException();
  const roles=allowManager?['owner','manager']:['owner'];
  const found=await c.query(`SELECT 1 FROM business_onboarding b JOIN resource_memberships m ON m.resource_type='business' AND m.resource_id=b.id AND m.identity_subject=$2 AND m.active AND m.role=ANY($3::varchar[]) WHERE b.id=$1 AND b.status='approved' FOR SHARE OF b`,[business,actor,roles]);
  if(found.rowCount!==1)throw new ForbiddenException('Approved merchant authority required');
 }
 async grant(actor:string,business:string,subject:string,role:'manager'|'staff',branch?:string){
  if(subject===actor)throw new BadRequestException('Cannot self-grant');
  if(role==='manager'&&branch)throw new BadRequestException('Manager grant must be business-wide');
  if(role==='staff'&&!branch)throw new BadRequestException('Staff must be branch-scoped');
  return this.transaction(async c=>{
   await this.owner(c,actor,business);
   const active=await c.query('SELECT 1 FROM account_access a JOIN user_profiles p ON p.identity_subject=a.identity_subject WHERE a.identity_subject=$1 AND NOT a.suspended AND NOT p.suspended',[subject]);
   if(active.rowCount!==1)throw new ConflictException('Target identity not active');
   if(branch){const exists=await c.query('SELECT 1 FROM business_branches WHERE id=$1 AND business_id=$2 AND active',[branch,business]);if(exists.rowCount!==1)throw new NotFoundException('Branch unavailable');}
   const scopes:[string,string][] = role==='staff'?[['business',business],['branch',branch!]]:[['business',business]];
   for(const [type,id] of scopes)await c.query(`INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,$2,$3,$4,true) ON CONFLICT(identity_subject,resource_type,resource_id,role) DO UPDATE SET active=true`,[subject,type,id,role]);
   await c.query("INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,'merchant_membership_granted',$2)",[actor,business+':'+subject+':'+role]);
   return {subject,role,branchId:branch??null,active:true};
  });
 }
 async revoke(actor:string,business:string,subject:string,role:'manager'|'staff',branch?:string){
  if(subject===actor)throw new BadRequestException('Cannot self-revoke');
  if(role==='staff'&&!branch||role==='manager'&&branch)throw new BadRequestException('Invalid grant scope');
  return this.transaction(async c=>{
   await this.owner(c,actor,business);
   if(branch){
    const link=await c.query('SELECT 1 FROM business_branches WHERE id=$1 AND business_id=$2',[branch,business]);
    if(link.rowCount!==1)throw new NotFoundException('Branch unavailable');
    await c.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_type='branch' AND resource_id=$2 AND role='staff'",[subject,branch]);
    const remaining=await c.query("SELECT 1 FROM resource_memberships m JOIN business_branches b ON b.id=m.resource_id WHERE m.identity_subject=$1 AND m.resource_type='branch' AND m.role='staff' AND m.active AND b.business_id=$2 LIMIT 1",[subject,business]);
    if(remaining.rowCount===0)await c.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2 AND role='staff'",[subject,business]);
   }else await c.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2 AND role='manager'",[subject,business]);
   await c.query("INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,'merchant_membership_revoked',$2)",[actor,business+':'+subject+':'+role]);
   return {subject,role,branchId:branch??null,active:false};
  });
 }
 async staff(actor:string,business:string){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   return (await c.query(`SELECT m.identity_subject,m.resource_type,m.resource_id,m.role,m.active
    FROM resource_memberships m WHERE m.active AND (
    (m.resource_type='business' AND m.resource_id=$1 AND m.role IN ('owner','manager','staff'))
    OR (m.resource_type='branch' AND m.role='staff' AND EXISTS (SELECT 1 FROM business_branches b WHERE b.id=m.resource_id AND b.business_id=$1))
    ) ORDER BY m.identity_subject,m.resource_type,m.resource_id`,[business])).rows;
  });
 }
 async setBranch(actor:string,business:string,branch:string,input:{name?:string;active?:boolean;contactEmail?:string}){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   const result=await c.query('UPDATE business_branches SET name=COALESCE($3,name),active=COALESCE($4,active),contact_email=COALESCE($5,contact_email) WHERE id=$1 AND business_id=$2 RETURNING *',[branch,business,input.name??null,input.active??null,input.contactEmail??null]);
   if(!result.rowCount)throw new NotFoundException('Branch unavailable');await this.audit(c,actor,'merchant_branch_updated',branch);return result.rows[0];});
 }
 async setCatalogue(actor:string,business:string,branch:string,item:string,input:{name?:string;priceMinor?:number;published?:boolean;active?:boolean}){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   const result=await c.query(`UPDATE business_catalogue SET name=COALESCE($4,name),price_minor=COALESCE($5,price_minor),published=COALESCE($6,published),active=COALESCE($7,active) WHERE id=$1 AND business_id=$2 AND branch_id=$3 RETURNING *`,[item,business,branch,input.name??null,input.priceMinor??null,input.published??null,input.active??null]);
   if(!result.rowCount)throw new NotFoundException('Catalogue item unavailable');await this.audit(c,actor,'merchant_catalogue_updated',item);return result.rows[0];});
 }
 async setSlot(actor:string,business:string,branch:string,slot:string,input:{active:boolean}){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   const result=await c.query('UPDATE business_availability SET active=$4 WHERE id=$1 AND business_id=$2 AND branch_id=$3 RETURNING *',[slot,business,branch,input.active]);
   if(!result.rowCount)throw new NotFoundException('Slot unavailable');await this.audit(c,actor,'merchant_slot_updated',slot);return result.rows[0];});
 }
 async hours(actor:string,business:string,branch:string){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   const valid=await c.query('SELECT 1 FROM business_branches WHERE id=$1 AND business_id=$2',[branch,business]);
   if(valid.rowCount!==1)throw new NotFoundException('Branch unavailable');
   return (await c.query('SELECT weekday,opens_minute,closes_minute FROM business_branch_hours WHERE business_id=$1 AND branch_id=$2 ORDER BY weekday,opens_minute',[business,branch])).rows;
  });
 }
 async replaceHours(actor:string,business:string,branch:string,slots:{weekday:number;opensMinute:number;closesMinute:number}[]){
  if(slots.length>70||slots.some(v=>!Number.isInteger(v.weekday)||v.weekday<0||v.weekday>6||!Number.isInteger(v.opensMinute)||!Number.isInteger(v.closesMinute)||v.opensMinute<0||v.closesMinute>1440||v.opensMinute>=v.closesMinute))throw new BadRequestException('Invalid operating hours');
  const sorted=[...slots].sort((a,b)=>a.weekday-b.weekday||a.opensMinute-b.opensMinute);
  for(let i=1;i<sorted.length;i++)if(sorted[i].weekday===sorted[i-1].weekday&&sorted[i].opensMinute<sorted[i-1].closesMinute)throw new ConflictException('Overlapping branch hours');
  return this.transaction(async c=>{
   await this.owner(c,actor,business,true);
   const valid=await c.query('SELECT id FROM business_branches WHERE id=$1 AND business_id=$2 FOR UPDATE',[branch,business]);
   if(valid.rowCount!==1)throw new NotFoundException('Branch unavailable');
   await c.query('DELETE FROM business_branch_hours WHERE business_id=$1 AND branch_id=$2',[business,branch]);
   for(const slot of sorted)await c.query('INSERT INTO business_branch_hours(business_id,branch_id,weekday,opens_minute,closes_minute) VALUES($1,$2,$3,$4,$5)',[business,branch,slot.weekday,slot.opensMinute,slot.closesMinute]);
   await this.audit(c,actor,'merchant_hours_updated',branch);
   return {branchId:branch,slots:sorted};
  });
 }

 async overview(actor:string,business:string){
  return this.transaction(async c=>{await this.owner(c,actor,business,true);
   const r=await c.query(`SELECT (SELECT COUNT(*)::int FROM business_branches WHERE business_id=$1 AND active) AS branches,
    (SELECT COUNT(*)::int FROM business_catalogue WHERE business_id=$1 AND active) AS catalogue_items,
    (SELECT COUNT(*)::int FROM business_reservations WHERE business_id=$1 AND status<>'cancelled') AS reservations,
    (SELECT COUNT(*)::int FROM business_orders WHERE business_id=$1 AND status<>'cancelled') AS orders,
    (SELECT COALESCE(SUM(total_minor),0)::text FROM business_orders WHERE business_id=$1 AND status='fulfilled') AS fulfilled_order_total_minor`,[business]);
   return r.rows[0];
  });
 }
}
