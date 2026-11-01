import {BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException} from '@nestjs/common';
import {Pool, type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerService, page, searchPattern} from './customer.service';
import type {MediaReplacement, PackagePublicInput, PlanQuery, PlanQuoteInput, PublicProfileInput, VenueQuery} from './marketplace.dto';
import type {PageQuery} from './customer.dto';

type Reader=Pool|PoolClient;
type OfferingRow={id:string;businessId:string;branchId:string;businessName:string;branchName:string;address:string|null;name:string;description:string|null;category:string;priceMinor:string;currency:string};
type MediaRow={id:string;url:string;alt:string;position:number};
type ComponentRow={catalogueId:string;name:string;category:string;quantity:number};
type AddonRow={catalogueId:string;name:string;category:string;maxQuantity:number;priceMinor:string;currency:string};
type PackageConfig={pricingModel:'per_group'|'per_guest';minGuests:number;maxGuests:number};
type PublicPackage=PackageConfig&{components:ComponentRow[];addOns:AddonRow[]};
type EventRow={startsAt:Date;endsAt:Date;maxGuests:number};
type OfferingDetailRow=OfferingRow&{media:MediaRow[];event:EventRow|null;package:PublicPackage|null;customerReservationEnabled:boolean;customerOrderEnabled:boolean};
const visibleReviews="NOT r.withdrawn AND r.moderation_status='visible'";
const venueColumns=`b.id,b.business_id AS "businessId",m.display_name AS "businessName",b.name,b.address,b.timezone,
 COALESCE(p.summary,'') AS summary,COALESCE(p.city,'') AS city,p.public_phone AS "publicPhone",p.latitude,p.longitude,
 COALESCE((SELECT round(avg(r.rating),2)::text FROM customer_reviews r WHERE r.branch_id=b.id AND ${visibleReviews}),'0') AS rating,
 (SELECT count(*)::int FROM customer_reviews r WHERE r.branch_id=b.id AND ${visibleReviews}) AS "reviewCount"`;
const venueFrom=`FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id
 LEFT JOIN business_public_profiles p ON p.branch_id=b.id
 WHERE b.active AND m.status='approved'
 AND EXISTS(SELECT 1 FROM business_catalogue i WHERE i.branch_id=b.id AND i.business_id=b.business_id AND i.active AND i.published)`;
const packageReady=`EXISTS(SELECT 1 FROM business_package_components pc WHERE pc.package_id=i.id)
 AND NOT EXISTS(SELECT 1 FROM business_package_components pc LEFT JOIN business_catalogue ci
 ON ci.id=pc.component_id AND ci.branch_id=pc.branch_id AND ci.business_id=pc.business_id
 WHERE pc.package_id=i.id AND (ci.id IS NULL OR NOT ci.active OR NOT ci.published OR ci.kind='package' OR ci.currency<>i.currency))`;

@Injectable()
export class MarketplaceService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool,@Inject(CustomerService) private readonly customer:CustomerService){}
 private geo(input:VenueQuery){
  const lat=input.latitude!==undefined,lon=input.longitude!==undefined;
  if(lat!==lon||input.radiusKm!==undefined&&!lat)throw new BadRequestException('Latitude and longitude are required together for radius search');
  return lat&&lon;
 }
 async venues(input:VenueQuery){
  const values:unknown[]=[],filters:string[]=[];
  const bind=(value:unknown)=>{values.push(value);return '$'+values.length;};
  let distance='NULL::double precision';
  if(this.geo(input)){
   const lat=bind(input.latitude),lon=bind(input.longitude),radius=bind((input.radiusKm??10)*1000);
   const point=`ST_SetSRID(ST_MakePoint(${lon}::double precision,${lat}::double precision),4326)::geography`;
   filters.push(`ST_DWithin(p.location,${point},${radius}::double precision)`);
   distance=`ST_Distance(p.location,${point})/1000.0`;
  }
  if(input.q){const v=bind(searchPattern(input.q));filters.push(`(b.name ILIKE ${v} OR m.display_name ILIKE ${v} OR EXISTS(SELECT 1 FROM business_catalogue i WHERE i.branch_id=b.id AND i.active AND i.published AND i.name ILIKE ${v}))`);}
  if(input.location){const v=bind(searchPattern(input.location));filters.push(`(b.address ILIKE ${v} OR p.city ILIKE ${v})`);}
  if(input.category){const v=bind(input.category);filters.push(`EXISTS(SELECT 1 FROM business_catalogue i WHERE i.branch_id=b.id AND i.active AND i.published AND i.kind=${v})`);}
  if(input.branchId)filters.push(`b.id=${bind(input.branchId)}`);
  const limit=bind(input.limit+1),offset=bind(input.offset);
  const result=await this.pool.query(`SELECT ${venueColumns},${distance} AS "distanceKm" ${venueFrom}
   ${filters.map(v=>' AND '+v).join('')} ORDER BY "distanceKm" ASC NULLS LAST,b.created_at DESC,b.id DESC LIMIT ${limit} OFFSET ${offset}`,values);
  return page(result.rows,input);
 }
 async venue(id:string){
  const result=await this.pool.query(`SELECT ${venueColumns},NULL::double precision AS "distanceKm" ${venueFrom} AND b.id=$1`,[id]);
  if(!result.rowCount)throw new NotFoundException('Venue unavailable');
  const [media,hours]=await Promise.all([
   this.pool.query('SELECT id,url,alt,position FROM business_public_media WHERE branch_id=$1 AND catalogue_id IS NULL ORDER BY position',[id]),
   this.pool.query('SELECT weekday,opens_minute AS "opensMinute",closes_minute AS "closesMinute" FROM business_branch_hours WHERE branch_id=$1 ORDER BY weekday,opens_minute',[id]),
  ]);
  return {...result.rows[0],media:media.rows,hours:hours.rows};
 }
 async offering(id:string,c:Reader=this.pool):Promise<OfferingDetailRow>{
  const result=await c.query<OfferingRow>(`SELECT i.id,i.business_id AS "businessId",i.branch_id AS "branchId",m.display_name AS "businessName",
   b.name AS "branchName",b.address,i.name,i.description,i.kind AS category,i.price_minor::text AS "priceMinor",i.currency
   FROM business_catalogue i JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id
   JOIN business_onboarding m ON m.id=i.business_id WHERE i.id=$1 AND i.active AND i.published AND b.active AND m.status='approved'`,[id]);
  if(!result.rowCount)throw new NotFoundException('Offering unavailable');
  const item=result.rows[0];
  const media=await c.query<MediaRow>('SELECT id,url,alt,position FROM business_public_media WHERE catalogue_id=$1 ORDER BY position',[id]);
  const event=item.category==='event'?await c.query<EventRow>('SELECT starts_at AS "startsAt",ends_at AS "endsAt",max_guests AS "maxGuests" FROM business_event_config WHERE catalogue_id=$1',[id]):null;
  const config=item.category==='package'?await c.query<PackageConfig>(`SELECT p.pricing_model AS "pricingModel",p.min_guests AS "minGuests",p.max_guests AS "maxGuests"
   FROM business_public_packages p JOIN business_catalogue i ON i.id=p.catalogue_id WHERE i.id=$1 AND ${packageReady}`,[id]):null;
  let pack:PublicPackage|null=null;
  if(config?.rowCount){
   const components=await c.query<ComponentRow>(`SELECT i.id AS "catalogueId",i.name,i.kind AS category,pc.quantity
    FROM business_package_components pc JOIN business_catalogue i ON i.id=pc.component_id WHERE pc.package_id=$1 ORDER BY i.id`,[id]);
   const addOns=await c.query<AddonRow>(`SELECT i.id AS "catalogueId",i.name,i.kind AS category,a.max_quantity AS "maxQuantity",i.price_minor::text AS "priceMinor",i.currency
    FROM business_package_addons a JOIN business_catalogue i ON i.id=a.addon_id JOIN business_catalogue pack ON pack.id=a.package_id
    WHERE a.package_id=$1 AND i.active AND i.published AND i.kind IN ('product','service') AND i.currency=pack.currency ORDER BY i.id`,[id]);
   pack={...config.rows[0],components:components.rows,addOns:addOns.rows};
  }
  return {...item,media:media.rows,event:event?.rows[0]??null,package:pack,
   customerReservationEnabled:item.category==='service'&&item.priceMinor==='0',customerOrderEnabled:item.category==='product'};
 }
 async plans(input:PlanQuery){
  const values:unknown[]=[],filters:string[]=[];const bind=(v:unknown)=>{values.push(v);return '$'+values.length;};
  if(input.minBudgetMinor&&input.maxBudgetMinor&&BigInt(input.minBudgetMinor)>BigInt(input.maxBudgetMinor))throw new BadRequestException('Invalid budget range');
  const guests=bind(input.guests),currency=bind(input.currency);
  const total=`i.price_minor::numeric*CASE WHEN p.pricing_model='per_guest' THEN ${guests}::integer ELSE 1 END`;
  filters.push(`${guests}::integer BETWEEN p.min_guests AND p.max_guests`,`i.currency=${currency}`,packageReady);
  if(input.minBudgetMinor!==undefined)filters.push(`${total}>=${bind(input.minBudgetMinor)}::numeric`);
  if(input.maxBudgetMinor!==undefined)filters.push(`${total}<=${bind(input.maxBudgetMinor)}::numeric`);
  if(input.q){const v=bind(searchPattern(input.q));filters.push(`(i.name ILIKE ${v} OR b.name ILIKE ${v} OR m.display_name ILIKE ${v})`);}
  if(input.location){const v=bind(searchPattern(input.location));filters.push(`(b.address ILIKE ${v} OR bp.city ILIKE ${v})`);}
  if(input.branchId)filters.push(`b.id=${bind(input.branchId)}`);
  if(input.category&&input.category!=='package')throw new BadRequestException('Browse Plans contains packages');
  if(input.startsAt){
   if(Date.parse(input.startsAt)<=Date.now())throw new BadRequestException('Start time must be in the future');
   const start=bind(input.startsAt);filters.push(`EXISTS(SELECT 1 FROM business_availability a WHERE a.catalogue_id=i.id AND a.active AND a.starts_at=${start}::timestamptz AND a.starts_at>now() AND a.capacity-a.reserved>=${guests}::integer)`);
  }
  if(this.geo(input)){
   const lat=bind(input.latitude),lon=bind(input.longitude),radius=bind((input.radiusKm??10)*1000);
   filters.push(`ST_DWithin(bp.location,ST_SetSRID(ST_MakePoint(${lon}::double precision,${lat}::double precision),4326)::geography,${radius}::double precision)`);
  }
  const limit=bind(input.limit+1),offset=bind(input.offset);
  const result=await this.pool.query(`SELECT i.id,i.business_id AS "businessId",i.branch_id AS "branchId",m.display_name AS "businessName",
   b.name AS "branchName",b.address,i.name,i.description,i.kind AS category,i.price_minor::text AS "priceMinor",i.currency,
   p.pricing_model AS "pricingModel",p.min_guests AS "minGuests",p.max_guests AS "maxGuests",(${total})::text AS "groupTotalMinor"
   FROM business_catalogue i JOIN business_public_packages p ON p.catalogue_id=i.id
   JOIN business_branches b ON b.id=i.branch_id AND b.business_id=i.business_id JOIN business_onboarding m ON m.id=i.business_id
   LEFT JOIN business_public_profiles bp ON bp.branch_id=b.id
   WHERE i.kind='package' AND i.active AND i.published AND b.active AND m.status='approved'
   ${filters.map(v=>' AND '+v).join('')} ORDER BY i.created_at DESC,i.id DESC LIMIT ${limit} OFFSET ${offset}`,values);
  return page(result.rows,input);
 }
 async quote(id:string,input:PlanQuoteInput){
  if(new Set(input.addOns.map(v=>v.catalogueId.toLowerCase())).size!==input.addOns.length)throw new BadRequestException('Duplicate add-ons');
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   await c.query("SET LOCAL statement_timeout='5s'");
   const item=await this.offering(id,c),pack=item.package;
   if(!pack)throw new NotFoundException('Configured package unavailable');
   if(input.guests<pack.minGuests||input.guests>pack.maxGuests)throw new ConflictException('Guest count unavailable');
   if(input.startsAt){
    const slot=await c.query(`SELECT 1 FROM business_availability WHERE catalogue_id=$1 AND active AND starts_at=$2::timestamptz AND starts_at>now() AND capacity-reserved>=$3`,[id,input.startsAt,input.guests]);
    if(!slot.rowCount)throw new ConflictException('Package slot unavailable');
   }
   const base=BigInt(item.priceMinor)*BigInt(pack.pricingModel==='per_guest'?input.guests:1);
   let total=base;
   const addons=input.addOns.map(line=>{
    const product=pack.addOns.find(v=>v.catalogueId===line.catalogueId.toLowerCase());
    if(!product||line.quantity>product.maxQuantity)throw new ConflictException('Add-on unavailable');
    const lineTotal=BigInt(product.priceMinor)*BigInt(line.quantity);total+=lineTotal;
    return {catalogueId:product.catalogueId,quantity:line.quantity,unitPriceMinor:product.priceMinor,totalMinor:lineTotal.toString()};
   });
   if(total>9223372036854775807n)throw new BadRequestException('Quote total overflow');
   await c.query('COMMIT');return {catalogueId:id,guests:input.guests,baseMinor:base.toString(),totalMinor:total.toString(),currency:item.currency,addOns:addons,capacityHeld:false,checkoutEnabled:false};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 private async merchant(c:PoolClient,subject:string,businessId:string,branchId:string){
  const result=await c.query(`SELECT 1 FROM business_branches b JOIN business_onboarding m ON m.id=b.business_id
   JOIN resource_memberships r ON r.resource_type='business' AND r.resource_id=m.id
   WHERE b.id=$1 AND m.id=$2 AND b.active AND m.status='approved' AND r.identity_subject=$3 AND r.active AND r.role IN ('owner','manager') FOR SHARE OF b,m,r`,[branchId,businessId,subject]);
  if(!result.rowCount)throw new ForbiddenException('Approved merchant owner or manager required');
 }
 async publicProfile(identity:VerifiedIdentity,businessId:string,branchId:string,input:PublicProfileInput){
  if((input.latitude==null)!==(input.longitude==null))throw new BadRequestException('Coordinates must be supplied or cleared together');
  return this.customer.withAccountTransaction(identity,async c=>{
   await this.merchant(c,identity.subject,businessId,branchId);
   await c.query(`INSERT INTO business_public_profiles(business_id,branch_id,summary,city,public_phone,latitude,longitude)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(branch_id) DO UPDATE SET summary=EXCLUDED.summary,city=EXCLUDED.city,
    public_phone=EXCLUDED.public_phone,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude`,[businessId,branchId,input.summary.trim(),input.city.trim(),input.publicPhone??null,input.latitude??null,input.longitude??null]);
   await this.audit(c,identity.subject,'merchant_public_profile_updated',branchId);return {changed:true};
  });
 }
 async replaceMedia(identity:VerifiedIdentity,businessId:string,branchId:string,input:MediaReplacement){
  const hosts=(process.env.PUBLIC_MEDIA_HOSTS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  if(input.items.length&&!hosts.length)throw new ServiceUnavailableException('Public media hosting is not configured');
  for(const media of input.items){
   const url=new URL(media.url);
   if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port&&url.port!=='443'||!hosts.includes(url.hostname.toLowerCase()))
    throw new BadRequestException('Use a public HTTPS asset on an approved media host without signed query parameters');
  }
  return this.customer.withAccountTransaction(identity,async c=>{
   await this.merchant(c,identity.subject,businessId,branchId);
   if(input.catalogueId){
    const item=await c.query('SELECT 1 FROM business_catalogue WHERE id=$1 AND business_id=$2 AND branch_id=$3 AND active FOR SHARE',[input.catalogueId,businessId,branchId]);
    if(!item.rowCount)throw new NotFoundException('Catalogue item unavailable');
   }
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['media',branchId,input.catalogueId?.toLowerCase()??null])]);
   const previous=await c.query<MediaRow>('SELECT id,url,alt,position FROM business_public_media WHERE branch_id=$1 AND catalogue_id IS NOT DISTINCT FROM $2::uuid ORDER BY position',[branchId,input.catalogueId??null]);
   if(previous.rows.length===input.items.length&&previous.rows.every((row,index)=>row.url===input.items[index].url&&row.alt===input.items[index].alt.trim()))return {items:previous.rows};
   await c.query('DELETE FROM business_public_media WHERE branch_id=$1 AND catalogue_id IS NOT DISTINCT FROM $2::uuid',[branchId,input.catalogueId??null]);
   for(const [position,item] of input.items.entries())await c.query('INSERT INTO business_public_media(business_id,branch_id,catalogue_id,url,alt,position) VALUES($1,$2,$3,$4,$5,$6)',[businessId,branchId,input.catalogueId??null,item.url,item.alt.trim(),position]);
   await this.audit(c,identity.subject,'merchant_public_media_replaced',input.catalogueId??branchId);
   return {items:(await c.query('SELECT id,url,alt,position FROM business_public_media WHERE branch_id=$1 AND catalogue_id IS NOT DISTINCT FROM $2::uuid ORDER BY position',[branchId,input.catalogueId??null])).rows};
  });
 }
 async configurePackage(identity:VerifiedIdentity,businessId:string,branchId:string,id:string,input:PackagePublicInput){
  if(input.maxGuests<input.minGuests||new Set(input.addOns.map(v=>v.catalogueId.toLowerCase())).size!==input.addOns.length)throw new BadRequestException('Invalid package guest limits or duplicate add-ons');
  return this.customer.withAccountTransaction(identity,async c=>{
   await this.merchant(c,identity.subject,businessId,branchId);
   const pack=await c.query("SELECT currency FROM business_catalogue WHERE id=$1 AND business_id=$2 AND branch_id=$3 AND kind='package' AND active FOR UPDATE",[id,businessId,branchId]);
   if(!pack.rowCount)throw new NotFoundException('Package unavailable');
   if(input.addOns.length){
    const products=await c.query("SELECT id FROM business_catalogue WHERE id=ANY($1::uuid[]) AND business_id=$2 AND branch_id=$3 AND kind IN ('product','service') AND active AND published AND currency=$4 ORDER BY id FOR SHARE",[input.addOns.map(v=>v.catalogueId),businessId,branchId,pack.rows[0].currency]);
    if(products.rowCount!==input.addOns.length)throw new ConflictException('Invalid add-on branch, currency or publication');
   }
   await c.query(`INSERT INTO business_public_packages(catalogue_id,business_id,branch_id,pricing_model,min_guests,max_guests) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(catalogue_id) DO UPDATE SET pricing_model=EXCLUDED.pricing_model,min_guests=EXCLUDED.min_guests,max_guests=EXCLUDED.max_guests`,[id,businessId,branchId,input.pricingModel,input.minGuests,input.maxGuests]);
   await c.query('DELETE FROM business_package_addons WHERE package_id=$1',[id]);
   for(const addon of input.addOns)await c.query('INSERT INTO business_package_addons(package_id,addon_id,business_id,branch_id,max_quantity) VALUES($1,$2,$3,$4,$5)',[id,addon.catalogueId,businessId,branchId,addon.maxQuantity]);
   await this.audit(c,identity.subject,'merchant_public_package_updated',id);return {changed:true};
  });
 }
 private async audit(c:PoolClient,actor:string,type:string,id:string){await c.query('INSERT INTO identity_security_events(actor_subject,event_type,details) VALUES($1,$2,$3)',[actor,type,id]);}
 async reviews(branchId:string,input:PageQuery){
  await this.venue(branchId);
  const result=await this.pool.query(`SELECT r.id,r.rating,r.body,r.created_at AS "createdAt",'Verified customer'::text AS author
   FROM customer_reviews r WHERE r.branch_id=$1 AND ${visibleReviews} ORDER BY r.created_at DESC,r.id DESC LIMIT $2 OFFSET $3`,[branchId,input.limit+1,input.offset]);
  return page(result.rows,input);
 }
}
