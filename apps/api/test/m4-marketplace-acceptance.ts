import 'reflect-metadata';
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {BadRequestException, ConflictException, ForbiddenException, NotFoundException, type ExecutionContext} from '@nestjs/common';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {AccessService} from '../src/auth/access.service';
import {BusinessService} from '../src/business/business.service';
import {ManagementService} from '../src/business/management.service';
import {CustomerService} from '../src/customer/customer.service';
import {CustomerAccountService} from '../src/customer/account.service';
import {MarketplaceService} from '../src/customer/marketplace.service';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
import type {VerifiedIdentity} from '../src/auth/identity.types';
import {PlanQuery} from '../src/customer/marketplace.dto';

const admin=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:2,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:8,connectionTimeoutMillis:3000});
const customer=new CustomerService(runtime),accounts=new CustomerAccountService(runtime,customer),market=new MarketplaceService(runtime,customer);
const suffix=randomUUID(),owner='m4-market-owner-'+suffix,a='m4-market-A-'+suffix,b='m4-market-B-'+suffix;
const identity=(subject:string):VerifiedIdentity=>({subject,issuer:'https://fixture.invalid',audience:['faji-api'],roles:[],issuedAt:Math.floor(Date.now()/1000)-1,expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:subject+'-session'});
const merchant=new BusinessService(runtime,new AccessService(runtime)),manage=new ManagementService(runtime,new AccessService(runtime));
let business:string,branch:string,product:string,service:string,pack:string;
const originalHosts=process.env.PUBLIC_MEDIA_HOSTS;
before(async()=>{
 assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m4_test_[a-z0-9_]+$/);
 await assertDisposable(admin);await assertDisposable(runtime);
 for(const subject of [owner,a,b]){
  await admin.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,false)',[subject]);
  await admin.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[subject]);
 }
 business=(await admin.query("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M4 Marketplace','approved','synthetic-reviewer',now()) RETURNING id",[owner])).rows[0].id;
 await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,business]);
 branch=(await merchant.createBranch(owner,business,{name:'M4 Marketplace Lagos',address:'Lagos Nigeria'})).id;
 product=(await merchant.createItem(owner,business,branch,{name:'M4 Addon Product',kind:'product',priceMinor:2500,published:true})).id;
 service=(await merchant.createItem(owner,business,branch,{name:'M4 Service',kind:'service',priceMinor:0,published:true})).id;
 pack=(await merchant.createItem(owner,business,branch,{name:'M4 Group Package',kind:'package',priceMinor:10000,published:true})).id;
 await manage.replacePackage(owner,business,branch,pack,[{catalogueId:service,quantity:1}]);
 process.env.PUBLIC_MEDIA_HOSTS='assets.example.invalid';
});
after(async()=>{if(originalHosts===undefined)delete process.env.PUBLIC_MEDIA_HOSTS;else process.env.PUBLIC_MEDIA_HOSTS=originalHosts;await Promise.all([admin.end(),runtime.end()]);});

test('venue configuration enforces merchant authority and supports indexed geographic discovery',async()=>{
 await assert.rejects(()=>market.publicProfile(identity(a),business,branch,{summary:'Unauthorized',city:'Lagos'}),ForbiddenException);
 await assert.rejects(()=>market.publicProfile(identity(owner),business,branch,{summary:'Welcome',city:'Lagos',latitude:6.5244}),BadRequestException);
 await market.publicProfile(identity(owner),business,branch,{summary:'Public venue',city:'Lagos',latitude:6.5244,longitude:3.3792});
 const nearby=await market.venues({limit:20,offset:0,latitude:6.52,longitude:3.38,radiusKm:1});
 assert.ok(nearby.items.some(v=>v.id===branch));
 const far=await market.venues({limit:20,offset:0,latitude:0,longitude:0,radiusKm:1});assert.ok(!far.items.some(v=>v.id===branch));
 await assert.rejects(()=>market.venues({limit:20,offset:0,latitude:6.5}),BadRequestException);
 await market.replaceMedia(identity(owner),business,branch,{items:[{url:'https://assets.example.invalid/venue.jpg',alt:'Venue entrance'}]});
 const venue=await market.venue(branch);assert.equal(venue.summary,'Public venue');assert.equal(venue.media[0].alt,'Venue entrance');
 await assert.rejects(()=>market.replaceMedia(identity(owner),business,branch,{items:[{url:'https://private.invalid/photo.jpg?signature=secret',alt:'Denied'}]}),BadRequestException);
});
test('Browse Plans obeys currency, guest/date/budget filters and quotes exact add-on prices without writes',async()=>{
 await market.configurePackage(identity(owner),business,branch,pack,{pricingModel:'per_guest',minGuests:2,maxGuests:4,addOns:[{catalogueId:product,maxQuantity:2}]});
 const startsAt=new Date(Date.now()+86400000).toISOString();
 await merchant.createSlot(owner,business,branch,{catalogueId:pack,startsAt,endsAt:new Date(Date.now()+90000000).toISOString(),capacity:4});
 const query=Object.assign(new PlanQuery(),{guests:2,minBudgetMinor:'20000',maxBudgetMinor:'20000',startsAt,branchId:branch});
 assert.ok((await market.plans(query)).items.some(v=>v.id===pack&&v.groupTotalMinor==='20000'));
 assert.ok(!(await market.plans({...query,maxBudgetMinor:'19999',minBudgetMinor:'0'})).items.some(v=>v.id===pack));
 const before=(await admin.query('SELECT count(*)::int AS count FROM business_reservations WHERE branch_id=$1',[branch])).rows[0].count;
 const quote=await market.quote(pack,{guests:2,startsAt,addOns:[{catalogueId:product,quantity:2}]});
 assert.equal(quote.baseMinor,'20000');assert.equal(quote.totalMinor,'25000');assert.equal(quote.capacityHeld,false);assert.equal(quote.checkoutEnabled,false);
 assert.equal((await admin.query('SELECT count(*)::int AS count FROM business_reservations WHERE branch_id=$1',[branch])).rows[0].count,before);
 await assert.rejects(()=>market.quote(pack,{guests:5,addOns:[]}),ConflictException);
 await assert.rejects(()=>market.quote(pack,{guests:2,addOns:[{catalogueId:product,quantity:3}]}),ConflictException);
 await admin.query('UPDATE business_catalogue SET published=false WHERE id=$1',[service]);
 assert.ok(!(await market.plans(query)).items.some(v=>v.id===pack));
 await admin.query('UPDATE business_catalogue SET published=true WHERE id=$1',[service]);
});
test('private profile and wishlist are scoped, retry-safe and respect publication revocation',async()=>{
 await accounts.updateProfile(identity(a),{displayName:'Synthetic customer'});assert.equal((await accounts.profile(a)).displayName,'Synthetic customer');
 const saved=await Promise.all([accounts.save(identity(a),product),accounts.save(identity(a),product)]);
 assert.equal(saved.filter(v=>v.changed).length,1);assert.equal((await accounts.wishlist(a,{limit:20,offset:0})).items.length,1);
 assert.equal((await accounts.wishlist(b,{limit:20,offset:0})).items.length,0);
 await admin.query('UPDATE business_catalogue SET published=false WHERE id=$1',[product]);
 assert.equal((await accounts.wishlist(a,{limit:20,offset:0})).items.length,0);
 assert.deepEqual(await accounts.unsave(identity(a),product),{changed:true});
 assert.deepEqual(await accounts.unsave(identity(a),product),{changed:false});
 await admin.query('UPDATE business_catalogue SET published=true WHERE id=$1',[product]);
});
test('reviews require completed owned experiences and cannot reset moderator suppression',async()=>{
 const order=await customer.placeOrder(identity(a),{branchId:branch,requestKey:'review-order',items:[{catalogueId:product,quantity:1,expectedPriceMinor:'2500'}]});
 await assert.rejects(()=>accounts.review(identity(a),'order',order.id,{rating:5,body:'Early'}),ConflictException);
 await assert.rejects(()=>accounts.review(identity(b),'order',order.id,{rating:5,body:'Foreign'}),NotFoundException);
 for(const status of ['accepted','preparing','ready','fulfilled'] as const)await merchant.orderStatus(owner,business,branch,order.id,status);
 const review=await accounts.review(identity(a),'order',order.id,{rating:4,body:'Synthetic completed visit'});
 assert.ok((await market.reviews(branch,{limit:20,offset:0})).items.some(v=>v.id===review.id&&v.author==='Verified customer'&&!('customer_subject' in v)));
 await admin.query("UPDATE customer_reviews SET moderation_status='hidden' WHERE id=$1",[review.id]);
 const edited=await accounts.review(identity(a),'order',order.id,{rating:5,body:'Edited review'});assert.equal(edited.moderationStatus,'hidden');
 assert.ok(!(await market.reviews(branch,{limit:20,offset:0})).items.some(v=>v.id===review.id));
 await assert.rejects(()=>accounts.withdrawReview(identity(b),review.id),NotFoundException);
 await accounts.withdrawReview(identity(a),review.id);assert.equal((await accounts.reviews(a,{limit:20,offset:0})).items[0].withdrawn,true);
});
test('merchant/customer transitions generate private, deduplicated in-app notifications',async()=>{
 const order=await customer.placeOrder(identity(a),{branchId:branch,requestKey:'notification-order',items:[{catalogueId:product,quantity:1,expectedPriceMinor:'2500'}]});
 await merchant.orderStatus(owner,business,branch,order.id,'accepted');
 const notes=(await accounts.notifications(a,{limit:50,offset:0})).items.filter(v=>v.resourceId===order.id);
 assert.deepEqual(new Set(notes.map(v=>v.status)),new Set(['placed','accepted']));
 assert.equal(new Set(notes.map(v=>v.id)).size,2);
 assert.ok((await accounts.unread(a)).unread>=2);assert.equal((await accounts.unread(b)).unread,0);
 await assert.rejects(()=>accounts.readNotification(identity(b),notes[0].id),NotFoundException);
 const first=await accounts.readNotification(identity(a),notes[0].id),second=await accounts.readNotification(identity(a),notes[0].id);
 assert.deepEqual(first.readAt,second.readAt);
});
test('support cases enforce ownership, replay keys, message limits and closed-state transitions',async()=>{
 const order=await customer.placeOrder(identity(a),{branchId:branch,requestKey:'support-order',items:[{catalogueId:product,quantity:1,expectedPriceMinor:'2500'}]});
 const input={requestKey:'support-request',category:'order' as const,resourceId:order.id,subject:'Synthetic help',message:'Check this order'};
 await assert.rejects(()=>accounts.createSupport(identity(b),input),NotFoundException);
 const [first,second]=await Promise.all([accounts.createSupport(identity(a),input),accounts.createSupport(identity(a),input)]);assert.equal(first.id,second.id);
 await assert.rejects(()=>accounts.createSupport(identity(a),{...input,message:'Different'}),ConflictException);
 await assert.rejects(()=>accounts.supportDetail(b,first.id),NotFoundException);
 const reply={requestKey:'support-reply',message:'Additional context'};
 const [r1,r2]=await Promise.all([accounts.reply(identity(a),first.id,reply),accounts.reply(identity(a),first.id,reply)]);assert.equal(r1.id,r2.id);
 assert.equal((await accounts.messages(a,first.id,{limit:20,offset:0})).items.length,2);
 await accounts.closeSupport(identity(a),first.id);assert.equal((await accounts.closeSupport(identity(a),first.id)).status,'closed');
 await assert.rejects(()=>accounts.reply(identity(a),first.id,{requestKey:'after-closure',message:'New reply'}),ConflictException);
});
test('customer data tables and helper functions do not grant access to PUBLIC',async()=>{
 for(const table of ['customer_wishlist','customer_reviews','customer_notifications','customer_support_cases','customer_support_messages','customer_request_buckets']){
  const result=await admin.query("SELECT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=$1::regclass AND a.grantee=0 AND a.privilege_type='SELECT') AS allowed",[table]);
  assert.equal(result.rows[0].allowed,false);
 }
 await assert.rejects(runtime.query("UPDATE _faji_migrations SET checksum='tamper'"),{code:'42501'});
});
test('two API instances share one atomic write budget',async()=>{
 const one=new CustomerWriteGuard(runtime),two=new CustomerWriteGuard(runtime);
 const context={
  switchToHttp:()=>({
   getRequest:()=>({method:'POST',route:{path:'/customer/orders'},identity:identity(a)}),
   getResponse:()=>({setHeader:()=>{}}),
  }),
 } as unknown as ExecutionContext;
 for(let round=0;round<2;round++){
  await admin.query('DELETE FROM customer_request_buckets WHERE customer_subject=$1',[a]);
  const start=(await admin.query('SELECT floor(extract(epoch FROM clock_timestamp())/60)::text AS minute')).rows[0].minute;
  const attempts=await Promise.allSettled(Array.from({length:65},(_v,index)=>(index%2?one:two).canActivate(context)));
  const end=(await admin.query('SELECT floor(extract(epoch FROM clock_timestamp())/60)::text AS minute')).rows[0].minute;
  if(start!==end&&round===0)continue; // A fixed-minute boundary legitimately replenishes the budget.
  assert.equal(start,end,'fixture must complete within one fixed-minute window');
  assert.equal(attempts.filter(v=>v.status==='fulfilled').length,60);
  for(const result of attempts)if(result.status==='rejected')assert.equal(result.reason.getStatus(),429);
  return;
 }
});
