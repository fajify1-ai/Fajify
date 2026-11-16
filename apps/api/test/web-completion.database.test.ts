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
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule,WebCompletionModule]}).overrideProvider(DATABASE_POOL).useValue(runtime).compile();app=module.createNestApplication<NestExpressApplication>({bodyParser:false});app.use('/api/auth',(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse,next:(error?:unknown)=>void)=>{module.get(BetterAuthService).handle(req,res).catch(next);});app.useBodyParser('json',{limit:'384kb'});setupApi(app);await app.init();
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
 const event=await api().post('/api/v1/customer/events').set(auth(a)).send({name:'Private gathering',description:'Disposable test event',location:'Local test',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:1});assert.equal(event.status,200,JSON.stringify(event.body));const id=event.body.data.id;
 assert.equal((await api().post(`/api/v1/customer/events/${id}/invitations`).set(auth(b)).send({})).status,404);
 const invitation=await api().post(`/api/v1/customer/events/${id}/invitations`).set(auth(a)).send({});const token=invitation.body.data.token;assert.equal((await api().post('/api/v1/customer/invitations/acceptance').set(auth(b)).send({token})).status,200);assert.equal((await api().post('/api/v1/customer/invitations/acceptance').set(auth(a)).send({token})).status,409);
 assert.equal((await api().get('/api/v1/customer/events').set(auth(b))).body.data.items[0].id,id);
});
test('real receipts require owned verified capture and immutable receipt/journal evidence',async()=>{
 const key=randomUUID(),reference='faji_'+randomUUID();const intent=(await owner.query("INSERT INTO payment_intents(customer_subject,business_id,request_key,provider_reference,environment,amount_minor,currency) VALUES($1,$2,$3,$4,'test',12500,'NGN') RETURNING id",[a.id,business,key,reference])).rows[0].id;
 const path=`/api/v1/customer/payments/${intent}/receipt`;assert.equal((await api().get(path).set(auth(a))).status,404);
 process.env.PAYSTACK_SECRET_KEY='sk_test_disposablefixture';const gateway=new PaystackGateway();gateway.verify=async()=>({id:BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString(),reference,amountMinor:12500,currency:'NGN',environment:'test'});const ledger=new FinanceLedger(runtime),commerce=new CommerceLifecycle(ledger,new CustomerService(runtime),gateway),operations=new FinancialOperations(ledger,commerce,gateway),payments=new PaymentsService(runtime,gateway,commerce,operations);const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference}}));await payments.webhook(raw,createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex'));
 const receipt=await api().get(path).set(auth(a));assert.equal(receipt.status,200,JSON.stringify(receipt.body));assert.match(receipt.body.data.content,/FAJIFY PAYMENT RECEIPT/);assert.equal(receipt.body.data.amount_minor,'12500');assert.equal(receipt.headers['cache-control'],'no-store');assert.equal((await api().get(path).set(auth(b))).status,404);assert.equal((await api().get(path)).status,401);if(process.env.FAJI_WEB_TEST_FIXTURE_FILE)writeFileSync(process.env.FAJI_WEB_TEST_FIXTURE_FILE,JSON.stringify({owner:{email:a.email,password:'Disposable-web-test-password-2026!',subject:a.id},other:{email:b.email,password:'Disposable-web-test-password-2026!',subject:b.id},business,receipt:intent}));
});

test('new journey lists paginate, cap requests and do not expose foreign customer data',async()=>{await owner.query("INSERT INTO web_customer_events(subject,name,description,location,starts_at,ends_at,capacity) SELECT $1,'Paged event '||n,'Disposable pagination test','Local',now()+interval '2 days',now()+interval '3 days',10 FROM generate_series(1,21) AS n",[a.id]);const first=await api().get('/api/v1/customer/events?limit=20&offset=0').set(auth(a));assert.equal(first.status,200);assert.equal(first.body.data.items.length,20);assert.equal(first.body.data.nextOffset,20);const second=await api().get('/api/v1/customer/events?limit=20&offset=20').set(auth(a));assert.ok(second.body.data.items.length>=2);assert.equal((await api().get('/api/v1/customer/events?limit=51').set(auth(a))).status,400);assert.equal((await api().get('/api/v1/customer/events?offset=-1').set(auth(a))).status,400);const other=await api().get('/api/v1/customer/events').set(auth(b));assert.ok(other.body.data.items.every((item:{name:string})=>!item.name.startsWith('Paged event')));});

test('merchant support reuses the operations queue without a customer-route access backdoor after revocation',async()=>{const result=await api().post(`/api/v1/businesses/${business}/support`).set(auth(a)).send({title:'Scoped queue test',message:'Private business case.'});assert.equal(result.status,200);const row=(await owner.query('SELECT customer_case_id FROM web_merchant_support WHERE id=$1',[result.body.data.id])).rows[0];assert.ok(row.customer_case_id);await owner.query("UPDATE resource_memberships SET active=false WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2",[a.id,business]);assert.equal((await api().get(`/api/v1/customer/support/${row.customer_case_id}`).set(auth(a))).status,404);assert.equal((await api().get(`/api/v1/businesses/${business}/support/${result.body.data.id}/messages`).set(auth(a))).status,403);await owner.query("UPDATE resource_memberships SET active=true WHERE identity_subject=$1 AND resource_type='business' AND resource_id=$2",[a.id,business]);assert.equal((await api().get(`/api/v1/customer/support/${row.customer_case_id}`).set(auth(a))).status,200);});
