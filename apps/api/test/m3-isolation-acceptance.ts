import 'reflect-metadata';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {AccessService} from '../src/auth/access.service';
import {BusinessService} from '../src/business/business.service';
import {ManagementService} from '../src/business/management.service';
import {applyMigrations} from '../../../packages/database/scripts/migrate';
import {resolve} from 'node:path';

/** Isolated M3 integration evidence. Never point this at shared or production PostgreSQL. */
async function main(){
 const expected=process.env.FAJI_DISPOSABLE_DATABASE;
 if(!expected||!/^fajify_m3_test_[a-z0-9_]+$/.test(expected))throw Error('M3 disposable marker required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:8,connectionTimeoutMillis:3000});
 try{
  const target=await pool.query<{name:string;marker:string;version:string}>(`SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker,current_setting('server_version_num') AS version FROM pg_database WHERE datname=current_database()`);
  assert.equal(target.rows[0]?.name,expected);assert.equal(target.rows[0]?.marker,'fajify:m3:disposable');
  assert.equal(Math.floor(Number(target.rows[0]?.version)/10000),16);
  await applyMigrations(pool,resolve(__dirname,'../../../packages/database/migrations'));
  const owner='m3-isolation-'+process.pid;
  const staff='m3-staff-'+process.pid;
  for(const person of [owner,staff]){
   await pool.query('INSERT INTO user_profiles(identity_subject,suspended) VALUES($1,false)',[person]);
   await pool.query('INSERT INTO account_access(identity_subject,suspended) VALUES($1,false)',[person]);
  }
  const ids:string[]=[];
  for(let n=0;n<2;n++){
   const r=await pool.query<{id:string}>("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,$2,'approved','m3-review',now()) RETURNING id",[owner,'Isolation Merchant '+n]);
   ids.push(r.rows[0].id);
   await pool.query("INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active) VALUES($1,'business',$2,'owner',true)",[owner,ids[n]]);
  }
  const operations=new BusinessService(pool,new AccessService(pool));
  const management=new ManagementService(pool,new AccessService(pool));
  const a=(await operations.createBranch(owner,ids[0],{name:'Branch A'})).id as string;
  const b=(await operations.createBranch(owner,ids[1],{name:'Branch B'})).id as string;
  const product=(await operations.createItem(owner,ids[0],a,{name:'Scoped Test',kind:'product',priceMinor:900,published:true})).id as string;
  await assert.rejects(()=>operations.createItem(owner,ids[1],a,{name:'Wrong Tenant',kind:'product',priceMinor:200}),/Branch/);
  await assert.rejects(()=>operations.placeOrder(owner,ids[1],b,{customerSubject:'customer',items:[{catalogueId:product,quantity:1}]}),/Catalogue/);
  await management.grant(owner,ids[0],staff,'staff',a);
  await assert.rejects(()=>operations.createBranch(staff,ids[0],{name:'Unauthorised'}));
  await assert.rejects(()=>operations.items(staff,ids[0],b));
  assert.equal((await operations.items(staff,ids[0],a)).length,1);
  await management.revoke(owner,ids[0],staff,'staff',a);
  await assert.rejects(()=>operations.items(staff,ids[0],a));
  console.log('PASS: merchant/branch isolation, staff least-privilege and immediate revocation');
 }finally{await pool.end();}
}
main().catch(e=>{console.error('FAIL: M3 isolation acceptance:',e instanceof Error?e.message:'unknown');process.exitCode=1;});
