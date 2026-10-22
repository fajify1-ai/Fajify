import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
async function main(){
 const url=process.env.FAJI_DATABASE_URL;
 if(!url)throw new Error('FAJI_DATABASE_URL required - never use Keycloak database');
 const pool=new Pool({connectionString:url,max:1});
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(479102, 1)');
  await client.query('CREATE TABLE IF NOT EXISTS _faji_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const root=resolve(__dirname,'../migrations');
  for(const name of readdirSync(root).filter(n=>/^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort()){
   const sql=readFileSync(resolve(root,name),'utf8');
   const checksum=createHash('sha256').update(sql).digest('hex');
   const previous=await client.query<{checksum:string}>('SELECT checksum FROM _faji_migrations WHERE name=$1',[name]);
   if(previous.rows.length){if(previous.rows[0].checksum!==checksum)throw new Error('Migration checksum mismatch: '+name);continue;}
   await client.query(sql);
   await client.query('INSERT INTO _faji_migrations(name,checksum) VALUES ($1,$2)',[name,checksum]);
   console.log('Applied migration',name);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
