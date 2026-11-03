import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerService} from '../customer/customer.service';
import {CommerceLifecycle} from '../payments/commerce-lifecycle.service';
import {rankExperiences,type PlanningCandidate} from './recommendation.rules';
import type {CustomerSavedPlanInput,CustomerSavedPlanEditInput,CustomerPlanFeedbackInput,CustomerPlanBookingInput,CustomerSavedPlanListQuery} from './planning.dto';

const cols='id,occasion,budget_minor::text AS "budgetMinor",currency,guests,starts_after AS "startsAfter",starts_before AS "startsBefore",location_text AS location,categories,latitude,longitude,radius_km AS "radiusKm",revision,status,created_at AS "createdAt"';
type Stored={id:string;occasion:string;budgetMinor:string;currency:string;guests:number;startsAfter:Date;startsBefore:Date;location:string|null;categories:string[];latitude:number|null;longitude:number|null;radiusKm:number|null;revision:number;status:string;createdAt:Date};
const serialized=(row:Stored)=>({...row,startsAfter:row.startsAfter.toISOString(),startsBefore:row.startsBefore.toISOString(),createdAt:row.createdAt.toISOString()});
const validate=(input:CustomerSavedPlanInput)=>{
 const a=Date.parse(input.startsAfter),b=Date.parse(input.startsBefore);
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||a<=Date.now()||b-a>31*86400000)
  throw new BadRequestException('Planning window must be future, ordered and at most 31 days');
 if(!/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(input.startsAfter)||!/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(input.startsBefore))
  throw new BadRequestException('Planning dates require explicit time zones');
 if((input.latitude===undefined)!==(input.longitude===undefined)||input.radiusKm!==undefined&&input.latitude===undefined)
  throw new BadRequestException('Both coordinates are required for a radius');
 if(BigInt(input.budgetMinor)>9223372036854775807n)throw new BadRequestException('Budget exceeds supported maximum');
};
@Injectable()
export class PlanningService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool,@Inject(CustomerService) private readonly customer:CustomerService,@Inject(CommerceLifecycle) private readonly commerce:CommerceLifecycle){}
 async create(identity:VerifiedIdentity,input:CustomerSavedPlanInput){
  validate(input);
  return this.customer.withAccountTransaction(identity,async c=>{
   const row=await c.query<Stored>(`INSERT INTO customer_plans(customer_subject,occasion,budget_minor,currency,guests,starts_after,starts_before,location_text,categories,latitude,longitude,radius_km)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${cols}`,[identity.subject,input.occasion.trim(),input.budgetMinor,input.currency,input.guests,input.startsAfter,input.startsBefore,input.location?.trim()||null,input.categories??[],input.latitude??null,input.longitude??null,input.radiusKm??null]);
   return serialized(row.rows[0]);
  });
 }
 async list(subject:string,query:CustomerSavedPlanListQuery){
  const rows=await this.pool.query<Stored>(`SELECT ${cols} FROM customer_plans WHERE customer_subject=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,query.limit+1,query.offset]);
  return {items:rows.rows.slice(0,query.limit).map(serialized),nextOffset:rows.rows.length>query.limit?query.offset+query.limit:null};
 }
 async get(subject:string,id:string){
  const row=await this.pool.query<Stored>(`SELECT ${cols} FROM customer_plans WHERE id=$1 AND customer_subject=$2`,[id,subject]);
  if(!row.rowCount)throw new NotFoundException('Plan not found');
  return serialized(row.rows[0]);
 }
 async archive(identity:VerifiedIdentity,id:string){
  return this.customer.withAccountTransaction(identity,async c=>{
   const row=await c.query<Stored>(`UPDATE customer_plans SET status='archived',updated_at=now()
    WHERE id=$1 AND customer_subject=$2 RETURNING ${cols}`,[id,identity.subject]);
   if(!row.rowCount)throw new NotFoundException('Plan not found');
   return serialized(row.rows[0]);
  });
 }
 async recommend(subject:string,id:string){
  const plan=await this.get(subject,id);
  if(plan.status!=='draft')throw new ConflictException('Archived plan unavailable');
  if(Date.parse(plan.startsAfter)<=Date.now())throw new ConflictException('Planning window has started');
  const rows=await this.pool.query<{
   id:string;availabilityId:string;businessId:string;branchId:string;name:string;category:string;address:string|null;currency:string;
   priceMinor:string;pricingModel:string;availableSeats:number;startsAt:Date;
  }>(`SELECT i.id,a.id AS "availabilityId",i.business_id AS "businessId",i.branch_id AS "branchId",
   i.name,i.kind AS category,COALESCE(b.address,'') AS address,i.currency,i.price_minor::text AS "priceMinor",
   CASE WHEN i.kind='package' THEN p.pricing_model ELSE 'per_guest' END AS "pricingModel",
   (a.capacity-a.reserved) AS "availableSeats",a.starts_at AS "startsAt"
   FROM business_catalogue i
   JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id AND b.active
   JOIN business_onboarding m ON m.id=i.business_id AND m.status='approved'
   JOIN business_availability a ON a.catalogue_id=i.id AND a.branch_id=i.branch_id AND a.business_id=i.business_id
   AND a.active AND a.starts_at>now() AND a.capacity-a.reserved >= $1
   LEFT JOIN business_public_packages p ON p.catalogue_id=i.id
   LEFT JOIN business_public_profiles geo ON geo.branch_id=i.branch_id
   WHERE i.active AND i.published AND i.kind IN ('service','package','event')
   AND a.starts_at >= $2::timestamptz AND a.starts_at < $3::timestamptz
   AND i.currency=$4 AND ($5::text IS NULL OR b.address ILIKE $5 ESCAPE '\\')
   AND (cardinality($6::text[])=0 OR i.kind=ANY($6::text[]))
   AND ($7::double precision IS NULL OR ST_DWithin(geo.location,ST_SetSRID(ST_MakePoint($8::double precision,$7::double precision),4326)::geography,COALESCE($9::integer,10)*1000.0))
   AND (i.kind<>'package' OR (
     p.catalogue_id IS NOT NULL AND $1 BETWEEN p.min_guests AND p.max_guests
     AND EXISTS(SELECT 1 FROM business_package_components pc WHERE pc.package_id=i.id)
     AND NOT EXISTS(SELECT 1 FROM business_package_components pc LEFT JOIN business_catalogue component
       ON component.id=pc.component_id AND component.business_id=pc.business_id AND component.branch_id=pc.branch_id
       WHERE pc.package_id=i.id AND (component.id IS NULL OR NOT component.active OR NOT component.published OR component.kind='package' OR component.currency<>i.currency))
     AND NOT EXISTS (
      SELECT 1 FROM business_package_components pc
      WHERE pc.package_id=i.id AND NOT EXISTS (
       SELECT 1 FROM business_availability ca
       WHERE ca.catalogue_id=pc.component_id AND ca.business_id=i.business_id AND ca.branch_id=i.branch_id
       AND ca.active AND ca.starts_at=a.starts_at AND ca.starts_at>now()
       AND ca.capacity-ca.reserved>=pc.quantity * CASE WHEN p.pricing_model='per_guest' THEN $1 ELSE 1 END
      )
     )
   ))
   ORDER BY a.starts_at,i.id,a.id LIMIT 501`,[plan.guests,plan.startsAfter,plan.startsBefore,plan.currency,plan.location?('%'+plan.location.replace(/[\\%_]/g,'\\$&')+'%'):null,plan.categories,plan.latitude,plan.longitude,plan.radiusKm]);
  // Fetching a bounded set prevents a customer request from scanning unlimited candidate rows.
  if(rows.rows.length>500)throw new ConflictException('Recommendation set too large; narrow planning constraints');
  const candidates:PlanningCandidate[]=rows.rows.map(r=>({
   id:r.availabilityId,name:r.name,category:r.category,address:r.address??'',currency:r.currency,
   pricePerGuestMinor:r.priceMinor,pricingModel:r.pricingModel==='per_group'?'per_group':'per_guest',
   availableSeats:r.availableSeats,startsAt:r.startsAt.toISOString(),active:true,published:true,merchantApproved:true
  }));
  const ranked=rankExperiences({budgetMinor:plan.budgetMinor,currency:plan.currency,guests:plan.guests,
   startsAfter:plan.startsAfter,startsBefore:plan.startsBefore,location:plan.location??undefined,categories:plan.categories},candidates);
  const bySlot=new Map(rows.rows.map(r=>[r.availabilityId,r]));
  return {items:ranked.slice(0,50).map(r=>{
   const original=bySlot.get(r.id)!;
   return {id:original.id,availabilityId:r.id,businessId:original.businessId,branchId:original.branchId,name:original.name,
    category:original.category,startsAt:original.startsAt.toISOString(),totalMinor:r.totalMinor,currency:original.currency,
    score:r.score,reasons:r.reasons,bookingStatus:'revalidation_required'};
  }),evaluatedAt:new Date().toISOString()};
 }
 async update(identity:VerifiedIdentity,id:string,input:CustomerSavedPlanEditInput){
  validate(input);
  return this.customer.withAccountTransaction(identity,async c=>{
   const existing=await c.query<{revision:number,status:string}>('SELECT revision,status FROM customer_plans WHERE id=$1 AND customer_subject=$2 FOR UPDATE',[id,identity.subject]);
   if(!existing.rowCount)throw new NotFoundException('Plan not found');
   if(existing.rows[0].status!=='draft')throw new ConflictException('Archived plan cannot be edited');
   if(existing.rows[0].revision!==input.revision)throw new ConflictException('Plan revision changed; reload before editing');
   const result=await c.query<Stored>(`UPDATE customer_plans SET occasion=$3,budget_minor=$4,currency=$5,guests=$6,
    starts_after=$7,starts_before=$8,location_text=$9,categories=$10,latitude=$11,longitude=$12,radius_km=$13,
    revision=revision+1,updated_at=now() WHERE id=$1 AND customer_subject=$2 RETURNING ${cols}`,
    [id,identity.subject,input.occasion.trim(),input.budgetMinor,input.currency,input.guests,input.startsAfter,input.startsBefore,
     input.location?.trim()||null,input.categories??[],input.latitude??null,input.longitude??null,input.radiusKm??null]);
   return serialized(result.rows[0]);
  });
 }
 async feedback(identity:VerifiedIdentity,id:string,input:CustomerPlanFeedbackInput){
  return this.customer.withAccountTransaction(identity,async c=>{
   const owner=await c.query('SELECT 1 FROM customer_plans WHERE id=$1 AND customer_subject=$2 FOR SHARE',[id,identity.subject]);
   if(!owner.rowCount)throw new NotFoundException('Plan not found');
   const rows=await c.query<{id:string;planId:string;rating:number;comment:string|null;createdAt:Date}>(`
    INSERT INTO customer_plan_feedback(plan_id,customer_subject,rating,comment) VALUES($1,$2,$3,$4)
    ON CONFLICT(plan_id,customer_subject) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment
    RETURNING id,plan_id AS "planId",rating,comment,created_at AS "createdAt"`,[id,identity.subject,input.rating,input.comment?.trim()??null]);
   return {...rows.rows[0],createdAt:rows.rows[0].createdAt.toISOString()};
  });
 }
 async feedbackDetail(subject:string,id:string){
  const result=await this.pool.query<{id:string;planId:string;rating:number;comment:string|null;createdAt:Date}>(`
   SELECT f.id,f.plan_id AS "planId",f.rating,f.comment,f.created_at AS "createdAt"
   FROM customer_plan_feedback f JOIN customer_plans p ON p.id=f.plan_id AND p.customer_subject=f.customer_subject
   WHERE f.plan_id=$1 AND f.customer_subject=$2`,[id,subject]);
  if(!result.rowCount)throw new NotFoundException('Feedback not found');
  return {...result.rows[0],createdAt:result.rows[0].createdAt.toISOString()};
 }

 async bookingHold(identity:VerifiedIdentity,id:string,input:CustomerPlanBookingInput){
  const plan=await this.get(identity.subject,id);
  if(plan.status!=='draft')throw new ConflictException('Archived plan cannot create a booking');
  if(plan.guests>50)throw new ConflictException('Maximum booking group size is 50; split this plan');
  const suggestions=await this.recommend(identity.subject,id);
  const selected=suggestions.items.find(item=>item.availabilityId===input.availabilityId.toLowerCase());
  if(!selected)throw new ConflictException('Offering is no longer recommended; refresh the plan');
  if(!['service','package'].includes(selected.category))throw new ConflictException('Event tickets use the ticket checkout workflow');
  if(selected.totalMinor!==input.expectedTotalMinor)throw new ConflictException('Recommendation price changed');
  return this.commerce.hold(identity,{
   kind:'reservation',sourceId:selected.availabilityId,quantity:plan.guests,
   guestName:input.guestName,requestKey:input.requestKey,expectedAmountMinor:input.expectedTotalMinor
  });
 }

}
