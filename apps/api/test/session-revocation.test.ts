import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccessService} from '../src/auth/access.service';
import type {Pool} from 'pg';

test('session revocation is persisted and audited atomically',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string)=>{queries.push(sql);return {rowCount:1,rows:[]};},release:()=>{queries.push('RELEASE');}};
 const pool={connect:async()=>client} as unknown as Pool;
 await new AccessService(pool).revokeSession('subject-1','sid-1');
 assert.equal(queries[0],'BEGIN');
 assert.match(queries[1],/INSERT INTO revoked_identity_sessions/);
 assert.match(queries[2],/session_revoked/);
 assert.equal(queries[3],'COMMIT');
 assert.equal(queries[4],'RELEASE');
});
test('session revocation rolls back if audit fails',async()=>{
 const queries:string[]=[];
 const client={query:async(sql:string)=>{queries.push(sql);if(sql.includes('identity_security_events'))throw Error('audit down');return {rowCount:1,rows:[]};},release:()=>{}};
 const pool={connect:async()=>client} as unknown as Pool;
 await assert.rejects(new AccessService(pool).revokeSession('subject-1','sid-1'),/audit down/);
 assert.equal(queries.at(-1),'ROLLBACK');
});
