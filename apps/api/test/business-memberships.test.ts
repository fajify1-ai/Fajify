import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {AccessService} from '../src/auth/access.service';

test('membership enumeration is database scoped to approved active businesses',async()=>{
 let sql='';
 const pool={query:async(query:string,params:unknown[])=>{
  sql=query;assert.deepEqual(params,['signed-subject']);
  return {rows:[{resource_id:'23a4a70e-7c36-40ac-946f-46f3c05cfdf4',role:'owner'}]};
 }} as unknown as Pool;
 const list=await new AccessService(pool).approvedBusinessMemberships('signed-subject');
 assert.deepEqual(list,[{resourceType:'business',resourceId:'23a4a70e-7c36-40ac-946f-46f3c05cfdf4',role:'owner',status:'approved'}]);
 assert.match(sql,/b\.status='approved'/);
 assert.match(sql,/m\.active=true/);
 assert.match(sql,/a\.suspended=false/);
 assert.match(sql,/p\.suspended=false/);
 assert.match(sql,/m\.identity_subject=\$1/);
});

test('missing membership returns an empty array, never a role-derived grant',async()=>{
 const pool={query:async()=>({rows:[]})} as unknown as Pool;
 assert.deepEqual(await new AccessService(pool).approvedBusinessMemberships('merchant-with-no-scope'),[]);
});
