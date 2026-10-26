import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccessService} from '../src/auth/access.service';
import type {Pool} from 'pg';
function service(rows:{access?:{suspended:boolean;revoked_after:Date|null};profile?:{suspended:boolean}}){
 const seen:string[]=[];
 const pool={query:async(query:string)=>{seen.push(query);return {rows:query.includes('FROM account_access')?(rows.access?[rows.access]:[]):(rows.profile?[rows.profile]:[])}}} as unknown as Pool;
 return {access:new AccessService(pool),seen};
}
test('legacy profile without explicit approved account-access row is denied',async()=>{
 const f=service({profile:{suspended:false}});
 assert.deepEqual(await f.access.state('subject'),{suspended:true,revokedAfter:null});
 assert.equal(f.seen.length,1);
});
test('active account requires unsuspended profile and access row',async()=>{
 const active=service({access:{suspended:false,revoked_after:null},profile:{suspended:false}});
 assert.equal((await active.access.state('subject')).suspended,false);
 const disabled=service({access:{suspended:false,revoked_after:null},profile:{suspended:true}});
 assert.equal((await disabled.access.state('subject')).suspended,true);
 const missing=service({access:{suspended:false,revoked_after:null}});
 assert.equal((await missing.access.state('subject')).suspended,true);
});
test('revocation cutoff preserved while access remains denied',async()=>{
 const date=new Date('2026-10-24T00:00:00.000Z');
 const f=service({access:{suspended:true,revoked_after:date},profile:{suspended:false}});
 assert.deepEqual(await f.access.state('subject'),{suspended:true,revokedAfter:date});
});
