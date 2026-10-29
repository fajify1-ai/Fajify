import 'reflect-metadata';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {BusinessService} from '../src/business/business.service';
import {AccessService} from '../src/auth/access.service';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {resolve} from 'node:path';

/** Integration acceptance only: requires an explicitly marked disposable M3 PostgreSQL 16 DB. */
async function main(){
 const name=process.env.FAJI_DISPOSABLE_DATABASE;
 if(!name||!/^fajify_m3_test_[a-z0-9_]+$/.test(name))throw new Error('M3 disposable database required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:8,connectionTimeoutMillis:3000});
 try{
  const check=await pool.query<{name:string;marker:string;version:string}>(`SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker,current_setting('server_version_num') AS version FROM pg_database WHERE datname=current_database()`);
  assert.equal(check.rows[0]?.name,name);assert.equal(check.rows[0]?.marker,'fajify:m3:disposable');
  assert.equal(Math.floor(Number(check.rows[0]?.version)/10000),16);
  await applyMigrations(pool,resolve(__dirname,'../../../packages/database/migrations'));
  const subject='m3-acceptance-'+process.pid;
  await pool.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,false)',[subject]);
  await pool.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[subject]);
  const merchant=await pool.query<{id:string}>("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M3 Acceptance','approved','m3-review',now()) RETURNING id",[subject]);
  const business=merchant.rows[0].id;
  await pool.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[subject,business]);
  const service=new BusinessService(pool,new AccessService(pool));
  const branch=(await service.createBranch(subject,business,{name:'Test Branch'})).id as string;
  const item=(await service.createItem(subject,business,branch,{name:'Capacity Test',kind:'service',priceMinor:1000,published:true})).id as string;
  const start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+90000000).toISOString();
  const slot=(await service.createSlot(subject,business,branch,{catalogueId:item,startsAt:start,endsAt:end,capacity:1})).id as string;
  const attempts=await Promise.allSettled([service.reserve(subject,business,branch,{availabilityId:slot,customerSubject:'customer-A',guests:1}),service.reserve(subject,business,branch,{availabilityId:slot,customerSubject:'customer-B',guests:1})]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1,'exactly one contender must win');
  assert.equal(attempts.filter(x=>x.status==='rejected').length,1,'capacity must fail closed');
  const count=await pool.query<{reserved:number}>('SELECT reserved FROM business_availability WHERE id=$1',[slot]);assert.equal(count.rows[0].reserved,1);
  const winner=attempts.find(x=>x.status==='fulfilled');if(!winner||winner.status!=='fulfilled')throw new Error('No accepted reservation');
  await service.reservationStatus(subject,business,branch,(winner.value as {id:string}).id,'cancelled');
  const released=await pool.query<{reserved:number}>('SELECT reserved FROM business_availability WHERE id=$1',[slot]);assert.equal(released.rows[0].reserved,0);
  const retryKey='m3-reserve-retry-001';
  const retrySlot=(await service.createSlot(subject,business,branch,{catalogueId:item,startsAt:start,endsAt:end,capacity:1})).id as string;
  const first=await service.reserve(subject,business,branch,{availabilityId:retrySlot,customerSubject:'retry-customer',guests:1,requestKey:retryKey});
  const second=await service.reserve(subject,business,branch,{availabilityId:retrySlot,customerSubject:'retry-customer',guests:1,requestKey:retryKey});
  assert.equal(first.id,second.id,'identical retry must return one reservation');
  await assert.rejects(()=>service.reserve(subject,business,branch,{availabilityId:retrySlot,customerSubject:'retry-customer',guests:2,requestKey:retryKey}));
  const orderInput={customerSubject:'order-customer',items:[{catalogueId:item,quantity:2}],requestKey:'m3-order-retry-001'};
  const order1=await service.placeOrder(subject,business,branch,orderInput);
  const order2=await service.placeOrder(subject,business,branch,orderInput);
  assert.equal(order1.id,order2.id,'identical retry must not create another order');
  await assert.rejects(()=>service.placeOrder(subject,business,branch,{...orderInput,items:[{catalogueId:item,quantity:3}]}));
  await pool.query('UPDATE business_catalogue SET published=false WHERE id=$1',[item]);
  await assert.rejects(()=>service.reserve(subject,business,branch,{availabilityId:slot,customerSubject:'customer-C',guests:1}));
  console.log('PASS: M3 capacity contention, cancellation release, retry idempotency, unpublished-item blocking');
 }finally{await pool.end();}
}
main().catch(e=>{console.error('FAIL: M3 database acceptance:',e instanceof Error?e.message:'unknown');process.exitCode=1;});
