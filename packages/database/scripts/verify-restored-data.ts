import {Pool} from 'pg';
import assert from 'node:assert/strict';
import {assertDisposable} from './disposable-target';
async function main(){
 const source=new Pool({connectionString:process.env.FAJI_DATABASE_URL}),restored=new Pool({connectionString:process.env.FAJI_RESTORE_URL});
 try{
  await assertDisposable(source);const expected=process.env.FAJI_DISPOSABLE_DATABASE;
  try{process.env.FAJI_DISPOSABLE_DATABASE=new URL(process.env.FAJI_RESTORE_URL!).pathname.slice(1);await assertDisposable(restored);}finally{process.env.FAJI_DISPOSABLE_DATABASE=expected;}
  const tables=await source.query<{table_name:string}>("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
  for(const {table_name:name} of tables.rows){
   const quoted='"'+name.replaceAll('"','""')+'"';
   const sql=`SELECT count(*)::text AS count,md5(coalesce(string_agg(row_to_json(t)::text,chr(10) ORDER BY row_to_json(t)::text),'')) AS checksum FROM public.${quoted} t`;
   const [a,b]=await Promise.all([source.query(sql),restored.query(sql)]);assert.deepEqual(b.rows,a.rows,`Restored table differs: ${name}`);
  }
  console.log(`PASS: ${tables.rowCount} complete table row counts and content checksums match, including migration ledger, claims, roles, memberships, sessions and domain records`);
 }finally{await Promise.all([source.end(),restored.end()]);}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Restore verification failed');process.exitCode=1;});
