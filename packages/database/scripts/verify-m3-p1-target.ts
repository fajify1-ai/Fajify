import {Pool} from 'pg';
async function main(){
 const name=process.env.FAJI_DISPOSABLE_DATABASE;
 if(!name||!/^fajify_m3_test_[a-z0-9_]+$/.test(name))throw new Error('M3 requires uniquely named disposable database');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,connectionTimeoutMillis:3000,max:1});
 try{
  const res=await pool.query<{name:string;marker:string;version:string}>(`SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker,current_setting('server_version_num') AS version FROM pg_database WHERE datname=current_database()`);
  if(res.rows[0]?.name!==name||res.rows[0]?.marker!=='fajify:m3:disposable'||Math.floor(Number(res.rows[0]?.version)/10000)!==16)throw new Error('Not a marked disposable PostgreSQL 16 database');
  console.log('PASS: M3 disposable PostgreSQL target');
 }finally{await pool.end();}
}
main().catch(()=>{console.error('BLOCKED: M3 database safety preflight failed');process.exitCode=1;});
