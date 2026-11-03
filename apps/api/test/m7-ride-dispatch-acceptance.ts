import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {after,before,test} from 'node:test';
import {Pool} from 'pg';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {grantM7Runtime} from '../../../packages/database/scripts/grant-m7-runtime';
import {AccessService} from '../src/auth/access.service';
import {RideService} from '../src/rides/ride.service';
import {RideAreasService} from '../src/rides/ride-areas.service';
import {RideRequestsService} from '../src/rides/ride-requests.service';
import {RideLifecycleOperations} from '../src/rides/ride-lifecycle-operations.service';
import {RideSafetyService} from '../src/rides/ride-safety.service';
import {RideTrackingService} from '../src/rides/ride-tracking.service';
import {RideTariffService} from '../src/rides/ride-tariff.service';
import {RideFareService} from '../src/rides/ride-fare.service';
import {expireRideOffers,recoverIneligibleAssignments} from '../src/rides/ride-expiry.worker';

const ack='m7-disposable-postgis-only';
if(process.env.FAJI_M7_DISPOSABLE_DATABASE_ACK!==ack)
 throw new Error('Refusing to run M7 acceptance without explicit disposable database acknowledgement');
const url=process.env.FAJI_DATABASE_URL;
if(!url)throw new Error('FAJI_DATABASE_URL is required for disposable tests');
const runtimeUrl=process.env.FAJI_RUNTIME_DATABASE_URL;
if(!runtimeUrl)throw new Error('FAJI_RUNTIME_DATABASE_URL required for restricted M7 tests');
const adminLocation=new URL(url),runtimeLocation=new URL(runtimeUrl);
if(adminLocation.hostname!==runtimeLocation.hostname||adminLocation.port!==runtimeLocation.port||
   adminLocation.pathname!==runtimeLocation.pathname||adminLocation.username===runtimeLocation.username)
 throw new Error('M7 runtime and migration roles must be isolated on the same marked database');
const pool=new Pool({connectionString:url,max:10,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:runtimeUrl,max:16,connectionTimeoutMillis:3000});
const access=new AccessService(runtime),rides=new RideService(runtime),
 areas=new RideAreasService(runtime,access),requests=new RideRequestsService(runtime,access),
 lifecycle=new RideLifecycleOperations(runtime),safety=new RideSafetyService(runtime,areas),
 tracking=new RideTrackingService(runtime,access);
let zone:string,customer:string,dispatcher:string,drivers:{subject:string;id:string}[]=[];
const category='standard';
function coords(lat=6.5244,lng=3.3792){return {latitude:lat,longitude:lng};}
async function subject(prefix:string){
 const id=prefix+'-'+randomUUID();
 await pool.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,false)',[id]);
 await pool.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[id]);
 return id;
}
async function driver(){
 const who=await subject('driver');
 const row=await pool.query<{id:string}>(`INSERT INTO ride_drivers(identity_subject,status,available) VALUES($1,'approved',true) RETURNING id`,[who]);
 const id=row.rows[0].id;
 await pool.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'dispatch_area',$2,'driver',true)",[who,zone]);
 await pool.query("INSERT INTO ride_vehicles(driver_id,category,registration,approved) VALUES($1,$2,$3,true)",[id,category,randomUUID()]);
 await pool.query("INSERT INTO ride_driver_documents(driver_id,document_kind,private_object_key,review_status,expires_at) VALUES($1,'licence',$2,'approved',now()+interval '1 year')",[id,'private/ride-drivers/'+id+'/licence/'+randomUUID()]);
 const accepted=await rides.location(who,6.5244,3.3792,new Date(),1,true);
 assert.equal(accepted.accepted,true);
 return {subject:who,id};
}
async function request(key=randomUUID()){
 const quote=await pool.query<{id:string}>(`INSERT INTO ride_fare_quotes(customer_subject,pickup,destination,category,amount_minor,commission_bps,pricing_version,expires_at)
 VALUES($1,ST_SetSRID(ST_MakePoint(3.3792,6.5244),4326)::geography,
 ST_SetSRID(ST_MakePoint(3.4,6.53),4326)::geography,$2,20000,500,'fixture-v1',now()+interval '5 minutes')
 RETURNING id`,[customer,category]);
 return requests.create(customer,{pickup:coords(),destination:coords(6.53,3.4),category,quoteId:quote.rows[0].id,idempotencyKey:key});
}
before(async()=>{
 await assertDisposable(pool);
 await applyMigrations(pool,resolve(__dirname,'../../../packages/database/migrations'));
 await grantM7Runtime(pool,runtimeUrl);
 customer=await subject('customer');dispatcher=await subject('dispatcher');
 zone=(await pool.query<{id:string}>(`INSERT INTO ride_dispatch_areas(name,boundary,active)
  VALUES($1,ST_Multi(ST_GeomFromText('POLYGON((3.2 6.4,3.6 6.4,3.6 6.7,3.2 6.7,3.2 6.4))',4326)),true)
  RETURNING id`,['m7-test-'+randomUUID()])).rows[0].id;
 await pool.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'dispatch_area',$2,'dispatcher',true)",[dispatcher,zone]);
 drivers=[await driver(),await driver(),await driver()];
});
after(async()=>{await runtime.end();await pool.end();});

test('M7 acceptance: owner-only customer reads, idempotent request and quote binding',async()=>{
 const key=randomUUID(),first=await request(key);
 const echoed=await requests.get(customer,first.id);assert.equal(echoed.id,first.id);
 const other=await subject('other-customer');
 await assert.rejects(()=>requests.get(other,first.id),{status:404});
 const quoted=await pool.query('SELECT quote_id FROM ride_requests WHERE id=$1',[first.id]);
 const replay=await requests.create(customer,{pickup:coords(),destination:coords(6.53,3.4),category,
   quoteId:quoted.rows[0].quote_id,idempotencyKey:key});
 assert.equal(replay.id,first.id);assert.equal(replay.replayed,true);
 await assert.rejects(()=>requests.create(other,{pickup:coords(),destination:coords(6.53,3.4),category,
   quoteId:quoted.rows[0].quote_id,idempotencyKey:randomUUID()}),{status:404});
});
test('M7 acceptance: two simultaneous offer accepts have exactly one winner',async()=>{
 const ride=await request();
 const offers=await Promise.all(drivers.slice(0,2).map(d=>rides.offer(ride.id,d.id,dispatcher,new Date(Date.now()+90000),zone)));
 await assert.rejects(()=>rides.acceptOffer(offers[0].id,customer),{status:403});
 const result=await Promise.allSettled(offers.map((o,i)=>rides.acceptOffer(o.id,drivers[i].subject)));
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(result.filter(x=>x.status==='rejected').length,1);
 const stored=await pool.query<{status:string;count:string}>(`SELECT r.status,(SELECT count(*)::text FROM ride_dispatch_offers WHERE ride_id=$1 AND status='accepted') AS count FROM ride_requests r WHERE r.id=$1`,[ride.id]);
 assert.equal(stored.rows[0].status,'assigned');assert.equal(stored.rows[0].count,'1');
 const accepted=result.findIndex(x=>x.status==='fulfilled');
 const d=drivers[accepted];
 const view=await tracking.timeline({subject:customer,issuer:'fixture',audience:['fixture'],roles:['customer'],issuedAt:Date.now()/1000-10,expiresAt:Date.now()/1000+300},ride.id);
 assert.equal(view.status,'assigned');assert.ok(view.events.some(e=>e.to_state==='assigned'));
 await rides.transition(ride.id,d.subject,'driver_arriving');
 await rides.transition(ride.id,d.subject,'driver_arrived');
 await rides.transition(ride.id,d.subject,'in_progress');
 await assert.rejects(()=>rides.transition(ride.id,d.subject,'cancelled'),{status:409});
 await rides.transition(ride.id,d.subject,'completed');
 const fare=(await pool.query<{gross_minor:string;commission_minor:string;driver_minor:string}>(`SELECT gross_minor::text,commission_minor::text,driver_minor::text FROM ride_fares WHERE ride_id=$1`,[ride.id])).rows[0];
 assert.equal(fare.gross_minor,'20000');assert.equal(fare.commission_minor,'1000');assert.equal(fare.driver_minor,'19000');
});
test('M7 acceptance: stale/duplicate GPS rejected, explicit consent withdrawal clears position',async()=>{
 const d=drivers[2];
 await assert.rejects(()=>rides.location(d.subject,6.5,3.3,new Date(Date.now()-60000),2,true),{status:409});
 await assert.rejects(()=>rides.location(d.subject,6.5,3.3,new Date(),1,true),{status:409});
 await rides.revokeLocation(d.subject);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM ride_driver_locations WHERE driver_id=$1',[d.id])).rows[0].n,0);
 assert.equal((await pool.query('SELECT available FROM ride_drivers WHERE id=$1',[d.id])).rows[0].available,false);
});
test('M7 acceptance: expiry requeues one unassigned request, new generation fences old offers',async()=>{
 const candidate=await driver(),ride=await request();
 const offer=await rides.offer(ride.id,candidate.id,dispatcher,new Date(Date.now()+90000),zone);
 const beforeGen=(await pool.query<{dispatch_generation:string}>('SELECT dispatch_generation FROM ride_requests WHERE id=$1',[ride.id])).rows[0].dispatch_generation;
 await pool.query("UPDATE ride_dispatch_offers SET expires_at=now()-interval '5 minutes' WHERE id=$1",[offer.id]);
 const outcome=await expireRideOffers(runtime);
 assert.ok(outcome.requeued>=1);
 const row=(await pool.query<{status:string;dispatch_generation:string}>('SELECT status,dispatch_generation FROM ride_requests WHERE id=$1',[ride.id])).rows[0];
 assert.equal(row.status,'requested');assert.ok(BigInt(row.dispatch_generation)>BigInt(beforeGen));
 await assert.rejects(()=>rides.acceptOffer(offer.id,candidate.subject),{status:409});
});
test('M7 acceptance: customer cancellation is scoped, idempotent and cannot reopen',async()=>{
 const ride=await request();
 await assert.rejects(()=>lifecycle.customerCancel(dispatcher,ride.id),{status:404});
 assert.equal((await lifecycle.customerCancel(customer,ride.id)).status,'cancelled');
 assert.equal((await lifecycle.customerCancel(customer,ride.id)).replayed,true);
});
test('M7 acceptance: safety incidents are scoped, durable and replay-safe',async()=>{
 const ride=await request(),key=randomUUID();
 await assert.rejects(()=>safety.report(dispatcher,ride.id,'sos','emergency',key),{status:404});
 const first=await safety.report(customer,ride.id,'sos','emergency',key);
 assert.equal(first.replayed,false);
 const replay=await safety.report(customer,ride.id,'sos','emergency',key);
 assert.equal(replay.id,first.id);assert.equal(replay.replayed,true);
 assert.equal((await safety.details(customer,first.id)).severity,'emergency');
 await assert.rejects(()=>safety.resolve(customer,first.id,zone,'investigating'),{status:403});
 assert.equal((await safety.resolve(dispatcher,first.id,zone,'investigating')).status,'investigating');
 assert.equal((await safety.resolve(dispatcher,first.id,zone,'resolved')).status,'resolved');
});

test('M7 acceptance: trip and financial evidence rows are append-only',async()=>{
 const trip=await pool.query<{id:string;ride_id:string}>('SELECT id,ride_id FROM ride_trip_events ORDER BY occurred_at DESC LIMIT 1');
 assert.ok(trip.rows[0]);
 await assert.rejects(()=>pool.query('UPDATE ride_trip_events SET to_state=to_state WHERE id=$1',[trip.rows[0].id]),{code:'42501'});
 const complete=await pool.query<{ride_id:string}>('SELECT ride_id FROM ride_fares ORDER BY created_at DESC LIMIT 1');
 assert.ok(complete.rows[0]);
 const event=await pool.query<{id:string}>(`INSERT INTO ride_financial_events(ride_id,actor_subject,event_type,amount_minor,idempotency_key)
 VALUES($1,'test:m7','synthetic_test',1,$2) RETURNING id`,[complete.rows[0].ride_id,randomUUID()]);
 await assert.rejects(()=>pool.query('DELETE FROM ride_financial_events WHERE id=$1',[event.rows[0].id]),{code:'42501'});
});

test('M7 acceptance: per-category fare policy versions are serialized and quotes preserve prices',async()=>{
 const tariffs=new RideTariffService(runtime),fare=new RideFareService(runtime);
 const category='category-'+randomUUID().slice(0,8);
 const first=await tariffs.create('test:admin',{category,baseMinor:'500',perKmMinor:'100',commissionBps:500});
 assert.equal(first.version,1);
 const quoted=await fare.quote(customer,{pickup:coords(),destination:coords(6.53,3.4),category});
 assert.equal(quoted.pricingVersion,'v1');
 assert.ok(BigInt(quoted.amountMinor)>500n);
 const next=await Promise.all([
  tariffs.create('test:admin',{category,baseMinor:'700',perKmMinor:'200',commissionBps:1000}),
  tariffs.create('test:admin',{category,baseMinor:'800',perKmMinor:'300',commissionBps:1500})
 ]);
 assert.deepEqual(next.map(x=>x.version).sort((a,b)=>a-b),[2,3]);
 const stored=await pool.query<{amount_minor:string;commission_bps:number;policy_id:string}>(`SELECT amount_minor::text,commission_bps,policy_id
  FROM ride_fare_quotes WHERE id=$1`,[quoted.id]);
 assert.equal(stored.rows[0].commission_bps,500);
 assert.equal(stored.rows[0].amount_minor,quoted.amountMinor);
 assert.equal(stored.rows[0].policy_id,first.id);
 await assert.rejects(()=>pool.query('UPDATE ride_tariff_policies SET base_minor=1 WHERE id=$1',[first.id]),{code:'42501'});
 await assert.rejects(()=>pool.query('DELETE FROM ride_tariff_policies WHERE id=$1',[first.id]),{code:'42501'});
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM ride_tariff_policies WHERE category=$1 AND active',[category])).rows[0].n,1);
});
test('M7 acceptance: driver matching rejects out-of-scope dispatch and disabled accounts',async()=>{
 const ride=await request(),d=await driver();
 assert.equal((await areas.candidates(dispatcher,zone,ride.id,5)).candidates.some(x=>x.driverId===d.id),true);
 await assert.rejects(()=>areas.candidates(customer,zone,ride.id,5),{status:403});
 await pool.query('UPDATE account_access SET suspended=true WHERE identity_subject=$1',[d.subject]);
 await assert.rejects(()=>rides.offer(ride.id,d.id,dispatcher,new Date(Date.now()+80000),zone),{status:403});
 const view=await areas.candidates(dispatcher,zone,ride.id,10);
 assert.ok(!view.candidates.some(x=>x.driverId===d.id));
 await pool.query('UPDATE account_access SET suspended=false WHERE identity_subject=$1',[d.subject]);
});

test('M7 acceptance: restricted runtime cannot alter schema, delete trip evidence or access Keycloak sentinel',async()=>{
 await assert.rejects(()=>runtime.query('CREATE TABLE m7_escape(id integer)'),{code:'42501'});
 const r=await runtime.query<{allowed:boolean}>(`SELECT has_database_privilege(current_user,'keycloak_m1_sentinel','CONNECT') AS allowed`);
 assert.equal(r.rows[0].allowed,false);
 const state=await runtime.query<{grant:boolean}>(`SELECT has_table_privilege(current_user,'ride_requests','UPDATE') AS grant`);
 assert.equal(state.rows[0].grant,true);
 const noDelete=await runtime.query<{allowed:boolean}>(`SELECT has_table_privilege(current_user,'ride_trip_events','DELETE') AS allowed`);
 assert.equal(noDelete.rows[0].allowed,false);
});

test('M7 acceptance: suspended driver is released and pre-arrival ride requeued',async()=>{
 const d=await driver(),ride=await request();
 const offer=await rides.offer(ride.id,d.id,dispatcher,new Date(Date.now()+90000),zone);
 await rides.acceptOffer(offer.id,d.subject);
 await pool.query("UPDATE ride_drivers SET status='suspended' WHERE id=$1",[d.id]);
 const result=await recoverIneligibleAssignments(runtime);
 assert.ok(result.requeued>=1);
 const state=await pool.query<{status:string;assigned_driver_id:string|null}>('SELECT status,assigned_driver_id FROM ride_requests WHERE id=$1',[ride.id]);
 assert.equal(state.rows[0].status,'requested');
 assert.equal(state.rows[0].assigned_driver_id,null);
 await assert.rejects(()=>rides.acceptOffer(offer.id,d.subject),{status:409});
});
test('M7 acceptance: in-trip driver suspension escalates only once, without unsafe automated reassignment',async()=>{
 const d=await driver(),ride=await request();
 const offer=await rides.offer(ride.id,d.id,dispatcher,new Date(Date.now()+90000),zone);
 await rides.acceptOffer(offer.id,d.subject);
 await rides.transition(ride.id,d.subject,'driver_arriving');
 await rides.transition(ride.id,d.subject,'driver_arrived');
 await rides.transition(ride.id,d.subject,'in_progress');
 await pool.query("UPDATE account_access SET suspended=true WHERE identity_subject=$1",[d.subject]);
 const first=await recoverIneligibleAssignments(runtime),second=await recoverIneligibleAssignments(runtime);
 assert.ok(first.escalated>=1);
 assert.equal(second.escalated,0);
 const state=await pool.query<{status:string}>('SELECT status FROM ride_requests WHERE id=$1',[ride.id]);
 assert.equal(state.rows[0].status,'in_progress');
 const i=await pool.query<{severity:string}>(`SELECT severity FROM ride_incidents WHERE ride_id=$1 AND kind='driver_ineligible'`,[ride.id]);
 assert.equal(i.rowCount,1);assert.equal(i.rows[0].severity,'urgent');
 await assert.rejects(()=>rides.transition(ride.id,d.subject,'completed'),{status:403});
});
