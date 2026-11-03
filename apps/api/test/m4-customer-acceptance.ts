import 'reflect-metadata';
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {ConflictException, ForbiddenException, NotFoundException} from '@nestjs/common';
import {CustomerService} from '../src/customer/customer.service';
import {BusinessService} from '../src/business/business.service';
import {AccessService} from '../src/auth/access.service';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import type {VerifiedIdentity} from '../src/auth/identity.types';

const admin=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:3,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:8,connectionTimeoutMillis:3000});
const service=new CustomerService(runtime);
const suffix=randomUUID();const owner='m4-owner-'+suffix,a='m4-A-'+suffix,b='m4-B-'+suffix;
const identity=(subject:string):VerifiedIdentity=>({subject,issuer:'https://fixture.invalid',audience:['faji-api'],roles:['customer'],issuedAt:Math.floor(Date.now()/1000)-1,expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:subject+'-session'});
let business:string,branch:string,free:string,paid:string,product:string,foreign:string;
let merchant:BusinessService;
before(async()=>{
 assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m[345]_test_[a-z0-9_]+$/);
 assert.ok(process.env.FAJI_RUNTIME_DATABASE_URL);assert.ok(process.env.FAJI_DATABASE_URL);
 await assertDisposable(admin);await assertDisposable(runtime);
 const migrationTarget=new URL(process.env.FAJI_DATABASE_URL!),runtimeTarget=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);
 assert.equal(migrationTarget.host,runtimeTarget.host);assert.equal(migrationTarget.pathname,runtimeTarget.pathname);
 assert.notEqual(migrationTarget.username,runtimeTarget.username);
 await assert.rejects(runtime.query('CREATE TABLE m4_privilege_escape(id int)'),{code:'42501'});
 await applyMigrations(admin); // Checksums and a second migration pass must be safe.
 for(const subject of [owner,a,b]){
  await admin.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,false)',[subject]);
  await admin.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[subject]);
 }
 business=(await admin.query("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M4 Acceptance','approved','synthetic-reviewer',now()) RETURNING id",[owner])).rows[0].id;
 await admin.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,business]);
 merchant=new BusinessService(runtime,new AccessService(runtime));
 branch=(await merchant.createBranch(owner,business,{name:'M4 Lagos',address:'Lagos Nigeria'})).id;
 free=(await merchant.createItem(owner,business,branch,{name:'M4 Free Service',kind:'service',priceMinor:0,published:true})).id;
 paid=(await merchant.createItem(owner,business,branch,{name:'M4 Paid Service',kind:'service',priceMinor:5000,published:true})).id;
 product=(await merchant.createItem(owner,business,branch,{name:'M4 Product',kind:'product',priceMinor:2500,published:true})).id;
 const other=(await merchant.createBranch(owner,business,{name:'Other Branch'})).id;
 foreign=(await merchant.createItem(owner,business,other,{name:'Foreign Product',kind:'product',priceMinor:2500,published:true})).id;
});
after(async()=>{await Promise.all([admin.end(),runtime.end()]);});
async function slot(item=free,capacity=1){
 return (await merchant.createSlot(owner,business,branch,{catalogueId:item,startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity})).id as string;
}
const input=(availabilityId:string,key:string)=>({availabilityId,guests:1,guestName:'Synthetic guest',requestKey:key});

test('public discovery excludes unpublished, disabled and unapproved data',async()=>{
 const results=await service.discover({limit:50,offset:0,q:'M4',location:'Lagos'});
 assert.ok(results.items.some(v=>v.id===product));
 assert.ok(results.items.every(v=>!('applicant_subject' in v)&&!('contact_email' in v)));
 await admin.query('UPDATE business_catalogue SET published=false WHERE id=$1',[product]);
 await assert.rejects(()=>service.detail(product),NotFoundException);
 await admin.query('UPDATE business_catalogue SET published=true WHERE id=$1',[product]);
 await admin.query('UPDATE business_branches SET active=false WHERE id=$1',[branch]);
 await assert.rejects(()=>service.detail(product),NotFoundException);
 await admin.query('UPDATE business_branches SET active=true WHERE id=$1',[branch]);
 await admin.query("UPDATE business_onboarding SET status='rejected' WHERE id=$1",[business]);
 await assert.rejects(()=>service.detail(product),NotFoundException);
 await admin.query("UPDATE business_onboarding SET status='approved' WHERE id=$1",[business]);
});
test('concurrent customer reservations share merchant capacity; repeated cancellation releases it once',async()=>{
 const availabilityId=await slot();
 const contenders=await Promise.allSettled([service.reserve(identity(a),input(availabilityId,'capacity-A')),service.reserve(identity(b),input(availabilityId,'capacity-B'))]);
 assert.equal(contenders.filter(r=>r.status==='fulfilled').length,1);
 const winner=contenders.find(r=>r.status==='fulfilled');assert.ok(winner&&winner.status==='fulfilled');
 const customer=contenders[0].status==='fulfilled'?a:b;
 assert.ok((await merchant.reservations(owner,business,branch)).some(v=>v.id===winner.value.id));
 await assert.rejects(()=>service.reservationDetail(customer===a?b:a,winner.value.id),NotFoundException);
 await Promise.all([service.cancelReservation(identity(customer),winner.value.id),service.cancelReservation(identity(customer),winner.value.id)]);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[availabilityId])).rows[0].reserved,0);
 await service.reserve(identity(customer),input(availabilityId,'after-cancel'));
});
test('simultaneous identical retries create one reservation and one outbox event',async()=>{
 const availabilityId=await slot(free,3),request=input(availabilityId,'same-key-retry');
 const [first,second]=await Promise.all([service.reserve(identity(a),request),service.reserve(identity(a),request)]);
 assert.equal(first.id,second.id);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[availabilityId])).rows[0].reserved,1);
 assert.equal((await admin.query("SELECT count(*)::int AS count FROM outbox_events WHERE event_type='business.reservation.confirmed' AND payload::jsonb->>'resourceId'=$1",[first.id])).rows[0].count,1);
 await assert.rejects(()=>service.reserve(identity(a),{...request,guests:2}),ConflictException);
 const otherSlot=await slot();
 await assert.rejects(()=>service.reserve(identity(a),{...request,availabilityId:otherSlot}),ConflictException);
});
test('paid service confirmation, past slot and revoked session fail without consuming capacity',async()=>{
 const paidSlot=await slot(paid);
 await assert.rejects(()=>service.reserve(identity(a),input(paidSlot,'paid-blocked')),ConflictException);
 assert.equal((await admin.query('SELECT reserved FROM business_availability WHERE id=$1',[paidSlot])).rows[0].reserved,0);
 const past=await slot();await admin.query("UPDATE business_availability SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[past]);
 await assert.rejects(()=>service.reserve(identity(a),input(past,'past-blocked')),ConflictException);
 const target=await slot();await new AccessService(runtime).revokeSession(b,identity(b).sessionId!);
 await assert.rejects(()=>service.reserve(identity(b),input(target,'revoked-blocked')),ForbiddenException);
});
test('orders snapshot exact server totals, reject foreign products and stale pricing, and enter merchant inbox',async()=>{
 const request={branchId:branch,requestKey:'order-success',items:[{catalogueId:product,quantity:2,expectedPriceMinor:'2500'}]};
 const [first,second]=await Promise.all([service.placeOrder(identity(a),request),service.placeOrder(identity(a),request)]);
 assert.equal(first.id,second.id);assert.equal(first.totalMinor,'5000');assert.equal(first.items[0].unitPriceMinor,'2500');
 assert.ok((await merchant.orders(owner,business,branch)).some(v=>v.id===first.id));
 await assert.rejects(()=>service.orderDetail(b,first.id),NotFoundException);
 await assert.rejects(()=>service.placeOrder(identity(a),{...request,items:[{...request.items[0],quantity:3}]}),ConflictException);
 await assert.rejects(()=>service.placeOrder(identity(a),{...request,requestKey:'foreign-order',items:[{catalogueId:foreign,quantity:1,expectedPriceMinor:'2500'}]}),ConflictException);
 await admin.query('UPDATE business_catalogue SET price_minor=3000 WHERE id=$1',[product]);
 await assert.rejects(()=>service.placeOrder(identity(a),{...request,requestKey:'stale-order'}),ConflictException);
 assert.equal((await service.orderDetail(a,first.id)).totalMinor,'5000');
 await merchant.orderStatus(owner,business,branch,first.id,'accepted');
 await assert.rejects(()=>service.cancelOrder(identity(a),first.id),ConflictException);
 await admin.query('UPDATE business_catalogue SET price_minor=2500 WHERE id=$1',[product]);
 const cancellable=await service.placeOrder(identity(a),{...request,requestKey:'cancel-order'});
 await Promise.all([service.cancelOrder(identity(a),cancellable.id),service.cancelOrder(identity(a),cancellable.id)]);
 assert.equal((await service.orderDetail(a,cancellable.id)).status,'cancelled');
});
