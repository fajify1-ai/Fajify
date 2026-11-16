import {Pool} from 'pg';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {z} from 'zod';
// Owner-only offline tool. Evidence is independent of email delivery or an email match.
const entry=z.object({subject:z.string().min(1).max(255),email:z.email().transform(v=>v.toLowerCase()),name:z.string().min(2).max(120),roles:z.array(z.enum(['customer','merchant','driver','dispatcher','platform-admin'])),evidence:z.object({method:z.literal('independent-ownership-check'),verifiedSubject:z.string(),ticket:z.string().min(3),reviewers:z.array(z.string().min(3)).length(2),verifiedAt:z.iso.datetime()})});
export async function prepareClaims(pool:Pool,input:unknown,reissue=false){
 const rows=z.array(entry).min(1).parse(input);
 const result=await pool.query("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
 const {name,marker}=result.rows[0];
 if(!/^fajify_m[1-8]_test_/.test(name)||!/^fajify:m[1-8]:disposable$/.test(marker??''))throw Error('Only explicitly marked disposable rehearsal databases are supported. Production migration is not authorized.');
 const c=await pool.connect();const claims:{subject:string;token:string;expiresAt:string}[]=[];
 try{await c.query('BEGIN');
  for(const row of rows){
   const evidence={...row.evidence,reviewedRoles:row.roles,manifestEntryHash:createHash('sha256').update(JSON.stringify(row)).digest('hex')};
   if(row.evidence.verifiedSubject!==row.subject||new Set(row.evidence.reviewers).size!==2||Date.now()-Date.parse(row.evidence.verifiedAt)>86400000||Date.parse(row.evidence.verifiedAt)>Date.now())throw Error('Recent independent subject ownership evidence and distinct reviewers required');
   const prior=await c.query('SELECT p.id FROM user_profiles p JOIN account_access a ON a.identity_subject=p.identity_subject WHERE p.identity_subject=$1 FOR UPDATE OF p,a',[row.subject]);
   if(prior.rowCount!==1)throw Error('Existing profile and account must be reconciled before claiming');
   const collision=await c.query('SELECT 1 FROM auth_user WHERE id=$1 OR lower(email)=lower($2)',[row.subject,row.email]);
   if(collision.rowCount&&!reissue)throw Error('Identity already prepared or email collision: manual reconciliation required');
   if(reissue){const pending=await c.query('SELECT 1 FROM auth_legacy_claims WHERE identity_subject=$1 AND lower(email)=lower($2) AND claimed_at IS NULL FOR UPDATE',[row.subject,row.email]);if(pending.rowCount!==1)throw Error('Only an unclaimed, already reconciled identity may be reissued');}

   const token=randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+86400000).toISOString();
   if(reissue){
    await c.query('UPDATE auth_legacy_claims SET token_hash=$2,expires_at=$3,evidence=$4 WHERE identity_subject=$1',[row.subject,createHash('sha256').update(token).digest('hex'),expiresAt,evidence]);
    await c.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'legacy_claim_reissued')",[row.subject]);
    claims.push({subject:row.subject,token,expiresAt});continue;
   }
   await c.query('INSERT INTO auth_legacy_claims(identity_subject,email,token_hash,expires_at,evidence) VALUES($1,$2,$3,$4,$5)',[row.subject,row.email,createHash('sha256').update(token).digest('hex'),expiresAt,evidence]);
   await c.query('INSERT INTO auth_user(id,name,email) VALUES($1,$2,$3)',[row.subject,row.name,row.email]);
   for(const role of row.roles)await c.query('INSERT INTO application_roles(identity_subject,role) VALUES($1,$2) ON CONFLICT DO NOTHING',[row.subject,role]);
   await c.query("INSERT INTO identity_security_events(actor_subject,event_type) VALUES($1,'legacy_claim_prepared')",[row.subject]);
   claims.push({subject:row.subject,token,expiresAt});
  }
  await c.query('COMMIT');return claims;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
if(require.main===module){
 const [manifest,output]=process.argv.slice(2);
 if(output&&existsSync(output))throw Error('Refusing to overwrite a claim delivery file');
 if(!manifest||!output)throw Error('Usage: prepare-identity-claims.ts reviewed-manifest.json PRIVATE-claims.json');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL});
 prepareClaims(pool,JSON.parse(readFileSync(manifest,'utf8')),process.argv.includes('--reissue')).then(claims=>{writeFileSync(output,JSON.stringify(claims,null,2),{mode:0o600,flag:'wx'});console.log('Prepared claims; deliver through the independently verified secure channel. Tokens withheld.');}).catch(()=>{console.error('Claim preparation failed; review conflicts/evidence without exposing credentials');process.exitCode=1;}).finally(()=>pool.end());
}
