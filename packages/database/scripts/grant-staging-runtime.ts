import {Pool} from 'pg';
import {grantM7RuntimeGrants} from './grant-m7-runtime';
async function main(){
 if(process.env.FAJI_STAGING_PREPARATION_ACK!=='private-staging-only')throw Error('Explicit private staging acknowledgment required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL});
 try{
  const result=await pool.query("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  if(!/^fajify_staging_[a-z0-9_]+$/.test(result.rows[0].name)||result.rows[0].marker!=='fajify:staging:private')throw Error('Private staging database marker required; production is forbidden');
  const runtime=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);const owner=new URL(process.env.FAJI_DATABASE_URL!);
  if(owner.host!==runtime.host||owner.pathname!==runtime.pathname||owner.username===runtime.username)throw Error('Distinct runtime role on the same staging database required');
  await grantM7RuntimeGrants(pool,runtime.toString());
 }finally{await pool.end();}
}
main().catch(()=>{console.error('Staging grants failed closed; connection details withheld');process.exitCode=1;});
