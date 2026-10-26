import {Pool} from 'pg';

/** Explicit opt-in and server-side marker are both required before integration writes. */
export async function assertDisposable(pool:Pool):Promise<void>{
 const expected=process.env.FAJI_DISPOSABLE_DATABASE;
 if(!expected || !/^fajify_m[12]_test_[a-z0-9_]+$/.test(expected))throw new Error('A uniquely named FAJI_DISPOSABLE_DATABASE is required');
 const milestone=expected.startsWith('fajify_m2_test_')?'m2':'m1';
 const marker=`fajify:${milestone}:disposable`;
 const result=await pool.query<{name:string;marker:string;version:string}>(
  "SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker, current_setting('server_version_num') AS version FROM pg_database WHERE datname=current_database()"
 );
 const row=result.rows[0];
 if(row?.name!==expected || row.marker!==marker || Math.floor(Number(row.version)/10000)!==16) {
  throw new Error(`Target must be marked ${marker}, match the explicit test database name and use PostgreSQL 16`);
 }
}
if(require.main===module){
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,connectionTimeoutMillis:3000});
 assertDisposable(pool).then(()=>console.log('PASS: explicitly marked disposable PostgreSQL 16 target'))
  .catch(()=>{console.error('BLOCKED: disposable database preflight failed (connection details withheld)');process.exitCode=1;})
  .finally(()=>pool.end());
}
