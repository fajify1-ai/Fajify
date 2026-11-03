import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';

/** Synthetic query-plan evidence, rolled back; this is not a production load claim. */
async function main(){
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:1,connectionTimeoutMillis:3000});
 try{
  assert.match(process.env.FAJI_DISPOSABLE_DATABASE??'',/^fajify_m[345]_test_[a-z0-9_]+$/);await assertDisposable(pool);
  const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='5s'");
   const subject='m4-plan-'+randomUUID();
   await c.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[subject]);
   await c.query('INSERT INTO account_access(identity_subject) VALUES($1)',[subject]);
   const business=(await c.query("INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'Query plan fixture','approved','synthetic-reviewer',now()) RETURNING id",[subject])).rows[0].id;
   const branch=(await c.query("INSERT INTO business_branches(business_id,name,address) VALUES($1,'Query plan venue','Lagos') RETURNING id",[business])).rows[0].id;
   await c.query("INSERT INTO business_public_profiles(branch_id,business_id,city,latitude,longitude) VALUES($1,$2,'Lagos',6.5244,3.3792)",[branch,business]);
   await c.query("INSERT INTO business_catalogue(business_id,branch_id,name,kind,price_minor,published) SELECT $1,$2,'M4 query fixture '||n,'product',n,true FROM generate_series(1,3000) n",[business,branch]);
   await c.query('ANALYZE business_catalogue');
   const search=await c.query("EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM business_catalogue WHERE active AND published AND name ILIKE $1 ORDER BY created_at DESC,id DESC LIMIT 51",['%M4 query fixture 23%']);
   const geography=await c.query('EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON) SELECT branch_id FROM business_public_profiles WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint(3.38,6.52),4326)::geography,10000) LIMIT 51');
   const indexes=await c.query("SELECT indexname,indexdef FROM pg_indexes WHERE indexname IN ('business_catalogue_public_name_idx','business_public_profiles_geo_idx','customer_reservations_history_idx','customer_orders_history_idx') ORDER BY indexname");
   assert.equal(indexes.rows.length,4);assert.ok(indexes.rows.some(v=>v.indexdef.includes('gin')));assert.ok(indexes.rows.some(v=>v.indexdef.includes('gist')));
   console.log(JSON.stringify({syntheticCatalogueRows:3000,timeoutMs:5000,search:search.rows[0],geography:geography.rows[0],indexes:indexes.rows},null,2));
  }finally{await c.query('ROLLBACK');c.release();}
 }finally{await pool.end();}
}
main().catch(error=>{console.error('M4 query-plan check failed:',error instanceof Error?error.message:'unknown');process.exitCode=1;});
