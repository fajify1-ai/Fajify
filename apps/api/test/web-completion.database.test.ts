import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {randomUUID,createHmac} from 'node:crypto';
import {Pool} from 'pg';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import type {NestExpressApplication} from '@nestjs/platform-express';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {grantM7Runtime} from '../../../packages/database/scripts/grant-m7-runtime';
import {DatabaseModule} from '../src/database.module';
import {IdentityModule} from '../src/auth/identity.module';
import {BetterAuthService} from '../src/auth/better-auth.service';
import {AdminOperationsModule} from '../src/admin/admin.module';
import {BusinessModule} from '../src/business/business.module';
import {WebCompletionModule} from '../src/web-completion/module';
import {DATABASE_POOL} from '../src/tokens';
import {setupApi} from '../src/main';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {FinanceLedger} from '../src/payments/finance-ledger.service';
import {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import {FinancialOperations} from '../src/payments/financial-operations.service';
import {PaymentsService} from '../src/payments/payments.service';
import {CustomerService} from '../src/customer/customer.service';
const owner=new Pool({connectionString:process.env.FAJI_DATABASE_URL}),runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL});
let app:NestExpressApplication,a:{id:string;token:string;email:string},b:{id:string;token:string;email:string},business:string,application:string;
const auth=(user:{token:string})=>({Authorization:`Bearer ${user.token}`});
const api=()=>request(app.getHttpServer());
before(async()=>{
 await assertDisposable(owner);await applyMigrations(owner);await grantM7Runtime(owner,process.env.FAJI_RUNTIME_DATABASE_URL!);
 process.env.NODE_ENV='test';process.env.BETTER_AUTH_SECRET='disposable-web-continuation-secret-over-thirty-two-characters';process.env.BETTER_AUTH_URL='http://localhost:3041';process.env.FAJI_WEB_ORIGINS='http://localhost:3000';process.env.FAJI_VERIFICATION_ENCRYPTION_KEY='12'.repeat(32);
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule,WebCompletionModule,AdminOperationsModule,BusinessModule]}).overrideProvider(DATABASE_POOL).useValue(runtime).compile();app=module.createNestApplication<NestExpressApplication>({bodyParser:false});app.use('/api/auth',(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse,next:(error?:unknown)=>void)=>{module.get(BetterAuthService).handle(req,res).catch(next);});app.useBodyParser('json',{limit:'384kb'});setupApi(app);await app.init();
 async function signup(){const result=await api().post('/api/auth/sign-up/email').send({name:'Disposable Web Test',email:`web-${randomUUID()}@example.test`,password:'Disposable-web-test-password-2026!'});assert.equal(result.status,200);return {id:result.body.user.id as string,token:result.body.token as string,email:result.body.user.email as string};}
 a=await signup();b=await signup();const applied=await api().post('/api/v1/business/onboarding').set(auth(a)).send({displayName:'Disposable completion merchant'});assert.equal(applied.status,201);application=applied.body.id;business=application;await owner.query("UPDATE business_onboarding SET status='approved',reviewer_subject='disposable-test-reviewer',reviewed_at=now() WHERE id=$1",[business]);await owner.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role) VALUES($1,'business',$2,'owner')",[a.id,business]);
});
after(async()=>{await app?.close();await owner.end();});
test('onboarding drafts persist privately, reject stale revisions and credentials, recover only own applications',async()=>{
 const draft={revision:0,step:4,businessName:'Draft name',fields:JSON.stringify({category:'restaurant',fullName:'Test merchant'})};const saved=await api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send(draft);assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.data.revision,1);
 assert.equal((await api().get('/api/v1/business/onboarding/draft/current').set(auth(a))).body.data.data.step,4);assert.equal((await api().get('/api/v1/business/onboarding/draft/current').set(auth(b))).body.data.revision,0);
 const concurrent=await Promise.all([5,6].map(step=>api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send({...draft,revision:1,step})));assert.deepEqual(concurrent.map(row=>row.status).sort(),[200,409]);
 assert.equal((await api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send({...draft,revision:2,fields:JSON.stringify({password:'must-not-persist'})})).status,400);
 const own=await api().get('/api/v1/business/onboarding/applications/mine').set(auth(a));assert.equal(own.body.data.items[0].id,business);assert.equal((await api().get('/api/v1/business/onboarding/applications/mine').set(auth(b))).body.data.items.length,0);
});
test('verification uploads are encrypted, bounded and owner-only; upload never changes approval',async()=>{
 const base64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=';
 const route=`/api/v1/business/onboarding/${application}/verification-documents`;const uploaded=await api().post(route).set(auth(a)).send({name:'test.png',mime:'image/png',base64});assert.equal(uploaded.status,200,JSON.stringify(uploaded.body));const id=uploaded.body.data.document.id;
 const stored=(await owner.query('SELECT ciphertext FROM web_verification_documents WHERE id=$1',[id])).rows[0];assert.notDeepEqual(stored.ciphertext,Buffer.from(base64,'base64'));
 assert.equal((await api().get(`${route}/${id}`).set(auth(a))).body.data.base64,base64);assert.equal((await api().get(`${route}/${id}`).set(auth(b))).status,404);assert.equal((await api().post(route).set(auth(b)).send({name:'test.png',mime:'image/png',base64})).status,404);
 assert.equal((await api().post(route).set(auth(a)).send({name:'wrong.png',mime:'image/png',base64:Buffer.from('not-a-png-document').toString('base64')})).status,400);
 assert.equal((await owner.query('SELECT status FROM business_onboarding WHERE id=$1',[application])).rows[0].status,'approved');
});
test('merchant reports, support, offers and notifications enforce current approved business scope',async()=>{
 for(const path of ['reports','health','support','promotions','notifications']){assert.equal((await api().get(`/api/v1/businesses/${business}/${path}`).set(auth(a))).status,200,path);assert.equal((await api().get(`/api/v1/businesses/${business}/${path}`).set(auth(b))).status,403,path);}
 const support=await api().post(`/api/v1/businesses/${business}/support`).set(auth(a)).send({title:'Disposable support',message:'Local disposable integration test.'});assert.equal(support.status,200);assert.equal((await api().get(`/api/v1/businesses/${business}/support/${support.body.data.id}/messages`).set(auth(b))).status,403);
 const promo={title:'A real stored announcement',description:'Venue terms apply; no automatic discount.',expiresAt:new Date(Date.now()+86400000).toISOString()};assert.equal((await api().post(`/api/v1/businesses/${business}/promotions`).set(auth(b)).send(promo)).status,403);assert.equal((await api().post(`/api/v1/businesses/${business}/promotions`).set(auth(a)).send(promo)).status,200);
 await owner.query("UPDATE business_onboarding SET status='rejected' WHERE id=$1",[business]);assert.equal((await api().get(`/api/v1/businesses/${business}/reports`).set(auth(a))).status,403);await owner.query("UPDATE business_onboarding SET status='approved' WHERE id=$1",[business]);
});
test('cart revisions and hosted invitations stay private, one-use and capacity bounded',async()=>{
 const save=await api().put('/api/v1/customer/cart').set(auth(a)).send({revision:0,items:[]});assert.equal(save.status,200);assert.equal((await api().put('/api/v1/customer/cart').set(auth(a)).send({revision:0,items:[]})).status,409);assert.equal((await api().get('/api/v1/customer/cart').set(auth(b))).body.data.revision,0);
 const event=await api().post('/api/v1/customer/events').set(auth(a)).send({name:'Private gathering',description:'Disposable test event',location:'Local test',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:1});assert.equal(event.status,200,JSON.stringify(event.body));const id=event.body.data.id;assert.equal((await api().get(`/api/v1/customer/events/${id}`).set(auth(a))).status,200);assert.equal((await api().get(`/api/v1/customer/events/${id}`).set(auth(b))).status,404);
 assert.equal((await api().post(`/api/v1/customer/events/${id}/invitations`).set(auth(b)).send({})).status,404);
 const invitation=await api().post(`/api/v1/customer/events/${id}/invitations`).set(auth(a)).send({});const token=invitation.body.data.token;assert.equal((await api().post('/api/v1/customer/invitations/acceptance').set(auth(b)).send({token})).status,200);assert.equal((await api().post('/api/v1/customer/invitations/acceptance').set(auth(a)).send({token})).status,409);
 assert.equal((await api().get('/api/v1/customer/events').set(auth(b))).body.data.items[0].id,id);assert.equal((await api().get(`/api/v1/customer/events/${id}`).set(auth(b))).body.data.is_owner,false);
});
test('real receipts require owned verified capture and immutable receipt/journal evidence',async()=>{
 const key=randomUUID(),reference='faji_'+randomUUID();const intent=(await owner.query("INSERT INTO payment_intents(customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency) VALUES($1,$2,$3,$4,'test',12500,'NGN') RETURNING id",[a.id,business,key,reference])).rows[0].id;
 const path=`/api/v1/customer/payments/${intent}/receipt`;assert.equal((await api().get(path).set(auth(a))).status,404);
 process.env.PAYSTACK_SECRET_KEY='sk_test_disposablefixture';const gateway=new PaystackGateway();gateway.verify=async()=>({id:BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString(),reference,amountMinor:12500,currency:'NGN',environment:'test'});const ledger=new FinanceLedger(runtime),commerce=new CommerceLifecycle(ledger,new CustomerService(runtime),gateway),operations=new FinancialOperations(ledger,commerce,gateway),payments=new PaymentsService(runtime,gateway,commerce,operations);const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference}}));await payments.webhook(raw,createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex'));
 const receipt=await api().get(path).set(auth(a));assert.equal(receipt.status,200,JSON.stringify(receipt.body));assert.match(receipt.body.data.content,/FAJIFY PAYMENT RECEIPT/);assert.equal(receipt.body.data.amount_minor,'12500');assert.equal(receipt.headers['cache-control'],'no-store');assert.equal((await api().get(path).set(auth(b))).status,404);assert.equal((await api().get(path)).status,401);if(process.env.FAJI_WEB_TEST_FIXTURE_FILE)writeFileSync(process.env.FAJI_WEB_TEST_FIXTURE_FILE,JSON.stringify({owner:{email:a.email,password:'Disposable-web-test-password-2026!',subject:a.id},other:{email:b.email,password:'Disposable-web-test-password-2026!',subject:b.id},business,receipt:intent}));
});

test('new journey lists paginate, cap requests and do not expose foreign customer data',async()=>{await owner.query("INSERT INTO web_customer_events(subject,name,description,location,starts_at,ends_at,capacity) SELECT $1,'Paged event '||n,'Disposable pagination test','Local',now()+interval '2 days',now()+interval '3 days',10 FROM generate_series(1,21) AS n",[a.id]);const first=await api().get('/api/v1/customer/events?limit=20&offset=0').set(auth(a));assert.equal(first.status,200);assert.equal(first.body.data.items.length,20);assert.equal(first.body.data.nextOffset,20);const second=await api().get('/api/v1/customer/events?limit=20&offset=20').set(auth(a));assert.ok(second.body.data.items.length>=2);assert.equal((await api().get('/api/v1/customer/events?limit=51').set(auth(a))).status,400);assert.equal((await api().get('/api/v1/customer/events?offset=-1').set(auth(a))).status,400);const other=await api().get('/api/v1/customer/events').set(auth(b));assert.ok(other.body.data.items.every((item:{name:string})=>!item.name.startsWith('Paged event')));});

test('merchant support reuses the operations queue without a customer-route access backdoor after revocation',async()=>{const result=await api().post(`/api/v1/businesses/${business}/support`).set(auth(a)).send({title:'Scoped queue test',message:'Private business case.'});assert.equal(result.status,200);const row=(await owner.query('SELECT customer_case_id FROM web_merchant_support WHERE id=$1',[result.body.data.id])).rows[0];assert.ok(row.customer_case_id);await owner.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2",[a.id,business]);assert.equal((await api().get(`/api/v1/customer/support/${row.customer_case_id}`).set(auth(a))).status,404);assert.equal((await api().get(`/api/v1/businesses/${business}/support/${result.body.data.id}/messages`).set(auth(a))).status,403);await owner.query("UPDATE resource_memberships SET active=true WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2",[a.id,business]);assert.equal((await api().get(`/api/v1/customer/support/${row.customer_case_id}`).set(auth(a))).status,200);});

test('complete merchant submissions are immutable, retry-safe and visible only to a fresh scoped Admin reviewer',async()=>{
 const fields={category:'restaurant',services:['reservations','ordering'],scale:'small',fullName:'Submitted Merchant',email:'merchant@example.test',phone:'+2348012345678',regNum:'RC-12345',bizAddr:'12 Submitted Street',city:'Lagos',lga:'Lekki',landmark:'Near the park'};
 const current=(await api().get('/api/v1/business/onboarding/draft/current').set(auth(a))).body.data;
 const save=await api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send({revision:current.revision,step:8,businessName:'Full submitted business',fields:JSON.stringify(fields)});
 assert.equal(save.status,200,JSON.stringify(save.body));const draftRevision=save.body.data.revision;
 assert.equal((await api().post('/api/v1/business/onboarding').set(auth(a)).send({displayName:'Full submitted business',draftRevision:draftRevision-1})).status,409);
 const input={displayName:'Full submitted business',draftRevision};const results=await Promise.all([1,2].map(()=>api().post('/api/v1/business/onboarding').set(auth(a)).send(input)));
 assert.ok(results.every(result=>result.status===201),JSON.stringify(results.map(result=>result.body)));assert.equal(results[0].body.id,results[1].body.id);const id=results[0].body.id;
 assert.equal(results[0].body.status,'pending');assert.equal((await api().get(`/api/v1/business/onboarding/${id}/workspace`).set(auth(a))).status,403);
 assert.equal((await owner.query('SELECT count(*)::int AS n FROM resource_memberships WHERE resource_id=$1',[id])).rows[0].n,0);
 const path=`/api/v1/admin/governance/approvals/${id}`;assert.equal((await api().get(path)).status,401);assert.equal((await api().get(path).set(auth(a))).status,403);assert.equal((await api().get(path).set(auth(b))).status,403);
 const reviewer=await api().post('/api/auth/sign-up/email').send({name:'Disposable scoped reviewer',email:`review-${randomUUID()}@example.test`,password:'Disposable-web-test-password-2026!'});assert.equal(reviewer.status,200);
 const actor={id:reviewer.body.user.id,token:reviewer.body.token};await owner.query("INSERT INTO application_roles(identity_subject,role) VALUES($1,'platform-admin')",[actor.id]);await owner.query('UPDATE auth_session SET step_up_at=now() WHERE user_id=$1',[actor.id]);
 assert.equal((await api().get(path).set(auth(actor))).status,403);
 await owner.query("INSERT INTO admin_scope_grants(identity_subject,scope,granted_by) VALUES($1,'governance.read','disposable-operator')",[actor.id]);
 const detail=await api().get(path).set(auth(actor));assert.equal(detail.status,200,JSON.stringify(detail.body));assert.deepEqual(detail.body.application.contact,{fullName:fields.fullName,email:fields.email,phone:fields.phone});assert.equal(detail.body.application.business.registrationNumber,fields.regNum);assert.equal(detail.body.application.location.area,'Lekki');assert.equal(detail.body.application.verificationStatus,'not_reviewed');
 await api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send({revision:draftRevision,step:8,businessName:'Later private edits',fields:JSON.stringify({...fields,fullName:'Changed private draft'})});
 assert.equal((await api().get(path).set(auth(actor))).body.application.contact.fullName,fields.fullName);
 await assert.rejects(()=>runtime.query("UPDATE web_business_submissions SET snapshot='{}' WHERE application_id=$1",[id]),/permission denied/);
 const review=`/api/v1/business/onboarding/${id}/review`;assert.equal((await api().post(review).set(auth(actor)).send({decision:'approved'})).status,403);
 await owner.query("INSERT INTO admin_scope_grants(identity_subject,scope,granted_by) VALUES($1,'governance.write','disposable-operator')",[actor.id]);assert.equal((await api().post(review).set(auth(actor)).send({decision:'approved'})).status,201);
 assert.equal((await api().get(`/api/v1/business/onboarding/${id}/workspace`).set(auth(a))).status,200);assert.equal((await api().get(`/api/v1/business/onboarding/${id}/workspace`).set(auth(b))).status,403);
 assert.ok((await owner.query("SELECT 1 FROM admin_action_events WHERE actor_subject=$1 AND resource_id='AdminGovernanceController:application'",[actor.id])).rowCount);
 const latest=(await api().get('/api/v1/business/onboarding/draft/current').set(auth(a))).body.data;
 const invalid=await api().put('/api/v1/business/onboarding/draft/current').set(auth(a)).send({revision:latest.revision,step:8,businessName:'Invalid submitted business',fields:JSON.stringify({...fields,email:'invalid',services:[]})});assert.equal(invalid.status,200);
 assert.equal((await api().post('/api/v1/business/onboarding').set(auth(a)).send({displayName:'Invalid submitted business',draftRevision:invalid.body.data.revision})).status,400);
});

test('saved wishlist and cart return published media and branch names without exposing another customer cart',async()=>{
 const created=await api().post(`/api/v1/businesses/${business}/branches`).set(auth(a)).send({name:'Media contract branch',address:'12 Test Road',contactEmail:'branch@example.test',timezone:'Africa/Lagos'});assert.equal(created.status,201,JSON.stringify(created.body));const branch=created.body.id;
 const item=await api().post(`/api/v1/businesses/${business}/branches/${branch}/catalogue`).set(auth(a)).send({name:'Published media product',description:'Disposable product',kind:'product',priceMinor:1250,currency:'NGN',published:false});assert.equal(item.status,201,JSON.stringify(item.body));const id=item.body.id;
 await owner.query('INSERT INTO business_public_media(business_id,branch_id,catalogue_id,url,alt,position) VALUES($1,$2,$3,$4,$5,0)',[business,branch,id,'https://media.fixture.test/preserved.jpg','Original bundled test artwork']);
 assert.equal((await api().patch(`/api/v1/businesses/${business}/branches/${branch}/catalogue/${id}`).set(auth(a)).send({published:true})).status,200);
 assert.equal((await api().put(`/api/v1/customer/wishlist/${id}`).set(auth(a)).send({})).status,200);
 const saved=await api().get('/api/v1/customer/wishlist').set(auth(a));assert.equal(saved.status,200);assert.equal(saved.body.items.find((row:{id:string})=>row.id===id).media[0].url,'https://media.fixture.test/preserved.jpg');
 const current=(await api().get('/api/v1/customer/cart').set(auth(a))).body.data;
 const cart=await api().put('/api/v1/customer/cart').set(auth(a)).send({revision:current.revision,items:[{catalogueId:id,quantity:2}]});assert.equal(cart.status,200,JSON.stringify(cart.body));assert.equal(cart.body.data.quotes[0].branch_name,'Media contract branch');assert.equal(cart.body.data.quotes[0].media[0].alt,'Original bundled test artwork');assert.equal((await api().get('/api/v1/customer/cart').set(auth(b))).body.data.items.length,0);
});


test('public event availability exposes only configured active approved inventory, with no customer identities',async()=>{
 const branch=randomUUID(),event=randomUUID();
 await owner.query("INSERT INTO business_branches(id,business_id,name,address,contact_email,timezone) VALUES($1,$2,'Inventory test branch','Disposable location','venue@example.test','Africa/Lagos')",[branch,business]);
 await owner.query("INSERT INTO business_catalogue(id,business_id,branch_id,name,kind,price_minor,currency,published) VALUES($1,$2,$3,'Inventory event','event',1250,'NGN',true)",[event,business,branch]);
 await owner.query("INSERT INTO business_event_config(catalogue_id,business_id,branch_id,starts_at,ends_at,max_guests) VALUES($1,$2,$3,now()+interval '2 days',now()+interval '3 days',20)",[event,business,branch]);
 const path=`/api/v1/discovery/events/${event}/availability`;assert.equal((await api().get(path)).status,404);
 await owner.query('INSERT INTO ticket_inventory(catalogue_id,capacity) VALUES($1,10)',[event]);
 const available=await api().get(path);assert.equal(available.status,200);assert.deepEqual(Object.keys(available.body.data).sort(),['capacity','endsAt','held','issued','remaining','startsAt']);assert.equal(available.body.data.remaining,10);assert.equal(available.body.data.issued,0);
 await owner.query('UPDATE business_catalogue SET published=false WHERE id=$1',[event]);assert.equal((await api().get(path)).status,404);
 await owner.query('UPDATE business_catalogue SET published=true WHERE id=$1',[event]);await owner.query("UPDATE business_onboarding SET status='rejected' WHERE id=$1",[business]);assert.equal((await api().get(path)).status,404);await owner.query("UPDATE business_onboarding SET status='approved' WHERE id=$1",[business]);
});
