import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {eq} from 'drizzle-orm';
import {getTableConfig} from 'drizzle-orm/pg-core';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {userProfiles,auditEvents,outboxEvents} from '../src/schema';
import {applyMigrations} from '../scripts/migrate';
import {assertDisposable} from '../scripts/disposable-target';

const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:2,connectionTimeoutMillis:3000});
const runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:2,connectionTimeoutMillis:3000});
const db=drizzle(runtime);
const root=resolve(__dirname,'../migrations');
const code=(error:unknown):string|undefined=>{
 const e=error as {code?:string;cause?:unknown};return e.code ?? (e.cause?code(e.cause):undefined);
};
before(async()=>{
 assert.ok(process.env.FAJI_DATABASE_URL,'FAJI_DATABASE_URL required; database tests cannot be skipped');
 assert.ok(process.env.FAJI_RUNTIME_DATABASE_URL,'Separate runtime credentials required');
 assert.ok(process.env.FAJI_KEYCLOAK_TEST_URL,'Isolated identity sentinel URL required');
 await assertDisposable(pool);
 await assertDisposable(runtime);
 const migrationTarget=new URL(process.env.FAJI_DATABASE_URL!);
 const runtimeTarget=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);
 assert.equal(runtimeTarget.host,migrationTarget.host);
 assert.equal(runtimeTarget.pathname,migrationTarget.pathname);
 assert.notEqual(runtimeTarget.username,migrationTarget.username,'Runtime and migration roles must differ');
 const user=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!).username;
 assert.match(user,/^[a-z_][a-z0-9_]*$/);
 // Only this explicitly disposable database is granted synthetic runtime access.
 await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles,audit_events,outbox_events TO "${user}"`);
});
after(async()=>{await Promise.all([pool.end(),runtime.end()]);});

test('disposable preflight rejects a database name that does not match the opt-in',async()=>{
 const original=process.env.FAJI_DISPOSABLE_DATABASE!;
 try{
  process.env.FAJI_DISPOSABLE_DATABASE=original+'_mismatch';
  await assert.rejects(assertDisposable(pool),/Target must be marked/);
 }finally{process.env.FAJI_DISPOSABLE_DATABASE=original;}
});

test('PostgreSQL 16/PostGIS versions and full schema match Drizzle metadata',async()=>{
 const version=await pool.query('SELECT version() AS postgres, PostGIS_Full_Version() AS postgis');
 console.log('Database versions:',JSON.stringify(version.rows[0]));
 for(const table of [userProfiles,auditEvents,outboxEvents]){
  const config=getTableConfig(table);
  const columns=await pool.query<{name:string;type:string;required:boolean;default:string|null}>(
   `SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS default
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`,[config.name]);
  assert.equal(columns.rows.length,config.columns.length);
  for(const col of config.columns){
   const actual=columns.rows.find(row=>row.name===col.name)!;
   assert.ok(actual,`${config.name}.${col.name}`);
   assert.equal(actual.type.replace('character varying','varchar'),col.getSQLType());
   assert.equal(actual.required,col.notNull);
   assert.equal(actual.default!==null,col.hasDefault);
   if(col.name==='id')assert.match(actual.default!,/gen_random_uuid\(\)/);
   if(col.name.endsWith('_at') && col.hasDefault)assert.equal(actual.default,'now()');
  }
 }
 const constraints=await pool.query("SELECT conrelid::regclass::text AS name,contype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid IN ('user_profiles'::regclass,'audit_events'::regclass,'outbox_events'::regclass)");
 for(const name of ['user_profiles','audit_events','outbox_events'])assert.ok(constraints.rows.some(r=>r.name===name && r.contype==='p' && r.definition==='PRIMARY KEY (id)'));
 assert.ok(constraints.rows.some(r=>r.name==='user_profiles' && r.definition==='UNIQUE (identity_subject)'));
 assert.equal(constraints.rows.filter(r=>r.contype==='f').length,0,'M1 schema defines no foreign keys');
 const indexes=await pool.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public'");
 assert.match(indexes.rows.find(r=>r.indexname==='audit_events_occurred_at_idx')?.indexdef,/\(occurred_at\)/);
 assert.match(indexes.rows.find(r=>r.indexname==='outbox_unpublished_idx')?.indexdef,/\(published_at, created_at\) WHERE \(published_at IS NULL\)/);
});

test('migration ledger checksums and timestamps survive repeat execution with data intact',async()=>{
 const files=(await readdir(root)).filter(n=>/^\d{4}_[a-z0-9_]+\.sql$/.test(n)).sort();
 const before=await pool.query('SELECT name,checksum,applied_at FROM _faji_migrations ORDER BY name');
 assert.deepEqual(before.rows.map(r=>r.name),files);
 for(const row of before.rows)assert.equal(row.checksum,createHash('sha256').update(await readFile(join(root,row.name))).digest('hex'));
 const subject=`repeat_${randomUUID()}`;
 const [profile]=await db.insert(userProfiles).values({identitySubject:subject}).returning();
 try{
  await applyMigrations(pool);
  assert.deepEqual((await pool.query('SELECT name,checksum,applied_at FROM _faji_migrations ORDER BY name')).rows,before.rows);
  assert.equal((await db.select().from(userProfiles).where(eq(userProfiles.id,profile.id))).length,1);
 }finally{await db.delete(userProfiles).where(eq(userProfiles.id,profile.id));}
});

test('changed historical SQL is rejected without rewriting the ledger',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fajify-m1-history-'));
 const before=(await pool.query('SELECT * FROM _faji_migrations ORDER BY name')).rows;
 try{
  for(const name of (await readdir(root)).filter(n=>n.endsWith('.sql')))await writeFile(join(dir,name),(await readFile(join(root,name),'utf8'))+'\n-- tampered fixture\n');
  await assert.rejects(applyMigrations(pool,dir),/Migration checksum mismatch/);
  assert.deepEqual((await pool.query('SELECT * FROM _faji_migrations ORDER BY name')).rows,before);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('migration filenames execute in sorted order',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fajify-m1-order-'));
 try{
  await writeFile(join(dir,'9002_fixture.sql'),"INSERT INTO m1_order_fixture VALUES ('second')");
  await writeFile(join(dir,'9001_fixture.sql'),'CREATE TABLE m1_order_fixture (value text NOT NULL)');
  await applyMigrations(pool,dir);
  assert.deepEqual((await pool.query('SELECT * FROM m1_order_fixture')).rows,[{value:'second'}]);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM _faji_migrations WHERE name IN ('9001_fixture.sql','9002_fixture.sql')")).rows[0].count,2);
 }finally{
  await pool.query('DROP TABLE IF EXISTS m1_order_fixture');
  await pool.query("DELETE FROM _faji_migrations WHERE name IN ('9001_fixture.sql','9002_fixture.sql')");
  await rm(dir,{recursive:true,force:true});
 }
});

test('failed multi-file migration rolls back DDL and ledger atomically',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fajify-m1-rollback-'));
 const before=(await pool.query('SELECT * FROM _faji_migrations ORDER BY name')).rows;
 try{
  await writeFile(join(dir,'9003_fixture.sql'),'CREATE TABLE m1_rollback_fixture(id int)');
  await writeFile(join(dir,'9004_fixture.sql'),'SELECT * FROM m1_deliberately_missing_relation');
  await assert.rejects(applyMigrations(pool,dir),e=>code(e)==='42P01');
  assert.equal((await pool.query("SELECT to_regclass('public.m1_rollback_fixture') AS name")).rows[0].name,null);
  assert.deepEqual((await pool.query('SELECT * FROM _faji_migrations ORDER BY name')).rows,before);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Drizzle runtime CRUD, defaults, audit and outbox commit to PostgreSQL',async()=>{
 const subject=`crud_${randomUUID()}`;
 let id:string|undefined;
 try{
  await db.transaction(async tx=>{
   const [p]=await tx.insert(userProfiles).values({identitySubject:subject,displayName:'Synthetic profile'}).returning();id=p.id;
   assert.match(p.id,/^[0-9a-f-]{36}$/);assert.equal(p.suspended,false);
   assert.ok(p.createdAt instanceof Date);assert.ok(p.updatedAt instanceof Date);
   const [updated]=await tx.update(userProfiles).set({displayName:'Updated synthetic profile',updatedAt:new Date(p.updatedAt.getTime()+1000)}).where(eq(userProfiles.id,p.id)).returning();
   assert.equal(updated.displayName,'Updated synthetic profile');assert.ok(updated.updatedAt>p.updatedAt);
   await tx.insert(auditEvents).values({actorSubject:subject,action:'m1.fixture.created',resourceType:'user_profile',resourceId:p.id});
   await tx.insert(outboxEvents).values({eventType:subject,payload:JSON.stringify({profileId:p.id})});
  });
  assert.equal((await db.select().from(userProfiles).where(eq(userProfiles.identitySubject,subject))).length,1);
  const audit=await db.select().from(auditEvents).where(eq(auditEvents.actorSubject,subject));
  assert.equal(audit[0].resourceId,id);assert.ok(audit[0].occurredAt instanceof Date);
  const outbox=await db.select().from(outboxEvents).where(eq(outboxEvents.eventType,subject));
  assert.equal(outbox[0].publishedAt,null);assert.ok(outbox[0].createdAt instanceof Date);
 }finally{
  await db.delete(auditEvents).where(eq(auditEvents.actorSubject,subject));
  await db.delete(outboxEvents).where(eq(outboxEvents.eventType,subject));
  await db.delete(userProfiles).where(eq(userProfiles.identitySubject,subject));
 }
});

test('database enforces unique, not-null, length and UUID constraints',async()=>{
 const subject=`constraints_${randomUUID()}`;
 try{
  await db.insert(userProfiles).values({identitySubject:subject});
  await assert.rejects(db.insert(userProfiles).values({identitySubject:subject}),e=>code(e)==='23505');
  await assert.rejects(runtime.query('INSERT INTO user_profiles(identity_subject) VALUES ($1)',[null]),e=>code(e)==='23502');
  await assert.rejects(runtime.query('INSERT INTO user_profiles(identity_subject) VALUES ($1)',['x'.repeat(256)]),e=>code(e)==='22001');
  await assert.rejects(runtime.query('INSERT INTO audit_events(action,resource_type,resource_id) VALUES ($1,$2,$3)',['fixture','fixture','bad-uuid']),e=>code(e)==='22P02');
 }finally{await db.delete(userProfiles).where(eq(userProfiles.identitySubject,subject));}
});

test('Drizzle rolls back profile, audit and outbox writes together',async()=>{
 const subject=`rollback_${randomUUID()}`;
 await assert.rejects(db.transaction(async tx=>{
  await tx.insert(userProfiles).values({identitySubject:subject});
  await tx.insert(auditEvents).values({actorSubject:subject,action:'fixture',resourceType:'fixture'});
  await tx.insert(outboxEvents).values({eventType:subject,payload:'synthetic'});
  throw new Error('intentional transaction rollback');
 }),/intentional transaction rollback/);
 assert.equal((await db.select().from(userProfiles).where(eq(userProfiles.identitySubject,subject))).length,0);
 assert.equal((await db.select().from(auditEvents).where(eq(auditEvents.actorSubject,subject))).length,0);
 assert.equal((await db.select().from(outboxEvents).where(eq(outboxEvents.eventType,subject))).length,0);
});

test('PostGIS geometry, geography, distance and GiST index work with synthetic coordinates',async()=>{
 const client=await runtime.connect();
 try{
  await client.query('BEGIN');
  const spatial=await client.query("SELECT PostGIS_Version() AS version, ST_Distance(ST_Point(0,0),ST_Point(3,4)) AS planar, ST_Distance(ST_SetSRID(ST_Point(0,0),4326)::geography, ST_SetSRID(ST_Point(1,0),4326)::geography) AS metres");
  assert.match(spatial.rows[0].version,/^\d+\.\d+/);assert.equal(spatial.rows[0].planar,5);
  assert.ok(Math.abs(spatial.rows[0].metres-111319.490793)<1);
  await client.query('CREATE TEMP TABLE m1_spatial_fixture(position geometry(Point,4326)) ON COMMIT DROP');
  await client.query('INSERT INTO m1_spatial_fixture SELECT ST_SetSRID(ST_Point(n/1000.0,0),4326) FROM generate_series(1,1000) n');
  await client.query('CREATE INDEX m1_spatial_gist ON m1_spatial_fixture USING gist(position)');
  await client.query('ANALYZE m1_spatial_fixture');
  await client.query('SET LOCAL enable_seqscan=off');
  const plan=await client.query("EXPLAIN (FORMAT JSON, ANALYZE) SELECT * FROM m1_spatial_fixture WHERE position && ST_MakeEnvelope(0,0,0.01,0.01,4326)");
  assert.match(JSON.stringify(plan.rows),/m1_spatial_gist/);
 }finally{await client.query('ROLLBACK');client.release();}
});

test('runtime role is restricted and cannot connect to the isolated Keycloak sentinel',async()=>{
 const roles=await runtime.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
 assert.deepEqual(roles.rows[0],{rolsuper:false,rolcreatedb:false,rolcreaterole:false});
 const identity=new URL(process.env.FAJI_KEYCLOAK_TEST_URL!);
 const application=new URL(process.env.FAJI_RUNTIME_DATABASE_URL!);
 assert.equal(identity.username,application.username);assert.equal(identity.password,application.password);
 assert.equal(identity.host,application.host);assert.equal(identity.pathname,'/keycloak_m1_sentinel');
 assert.equal((await runtime.query("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='keycloak_m1_sentinel') AS present")).rows[0].present,true);
 const forbidden=new Pool({connectionString:identity.toString(),connectionTimeoutMillis:3000});
 try{await assert.rejects(forbidden.query('SELECT 1'),e=>code(e)==='42501');}finally{await forbidden.end();}
 await assert.rejects(runtime.query('CREATE TABLE public.m1_forbidden(id int)'),e=>code(e)==='42501');
 await assert.rejects(runtime.query("UPDATE _faji_migrations SET checksum='forbidden'"),e=>code(e)==='42501');
});
