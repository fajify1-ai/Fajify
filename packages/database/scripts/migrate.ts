import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';

export async function applyMigrations(pool:Pool,root=resolve(__dirname,'../migrations')):Promise<void>{
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(479102, 1)');
  await client.query('CREATE TABLE IF NOT EXISTS _faji_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
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
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function main(){
 if(!process.env.FAJI_DATABASE_URL)throw new Error('FAJI_DATABASE_URL required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:1,connectionTimeoutMillis:3000});
 try{await applyMigrations(pool);}finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error('Migration failed; connection details withheld. Check migration SQL and database availability.');process.exitCode=1;});
