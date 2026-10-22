import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
test('migration creates PostGIS and application tables', {skip:!process.env.FAJI_DATABASE_URL},async()=>{
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL});
 try{const r=await pool.query("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='postgis') AS postgis, to_regclass('public.user_profiles') IS NOT NULL AS profiles,to_regclass('public.outbox_events') IS NOT NULL AS outbox");assert.deepEqual(r.rows[0],{postgis:true,profiles:true,outbox:true});}
 finally{await pool.end();}
});
