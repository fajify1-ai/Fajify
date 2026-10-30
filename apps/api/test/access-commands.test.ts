import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccessService} from '../src/auth/access.service';
import type {Pool} from 'pg';
function fixture(fail=false){
 const queries:{text:string;args:unknown[]}[]=[];
 let released=false;
 const client={query:async(text:string,args:unknown[]=[] )=>{
  queries.push({text,args});
  if(fail&&text.startsWith('INSERT INTO identity_security_events'))throw Error('audit unavailable');
  return {rowCount:1,rows:[]};
 },release:()=>{released=true;}};
 const pool={connect:async()=>client} as unknown as Pool;
 return {service:new AccessService(pool),queries,isReleased:()=>released};
}
test('new identity provisioned suspended in one transaction',async()=>{
 const f=fixture();
 await f.service.provisionSubject('keycloak-subject');
 assert.deepEqual(f.queries.map(x=>x.text.slice(0,6)),['BEGIN','INSERT','INSERT','INSERT','COMMIT']);
 assert.equal(f.queries[1].args[0],'keycloak-subject');
 assert.equal(f.isReleased(),true);
});
test('failure to audit rolls back account provisioning',async()=>{
 const f=fixture(true);
 await assert.rejects(f.service.provisionSubject('keycloak-subject'),/audit unavailable/);
 assert.equal(f.queries.at(-1)?.text,'ROLLBACK');
 assert.equal(f.isReleased(),true);
});
test('suspension records actor and cuts off existing tokens atomically',async()=>{
 const f=fixture();await f.service.setSuspended('admin','user',true);
 assert.match(f.queries[1].text,/revoked_after/);
 assert.deepEqual(f.queries[1].args,['user',true]);
 assert.equal(f.queries[3].args[1],'account_suspended');
});
test('self administrative action is rejected before querying',async()=>{
 const f=fixture();await assert.rejects(f.service.setSuspended('same','same',true));
 assert.equal(f.queries.length,0);
});
test('membership modification produces auditable transaction',async()=>{
 const f=fixture();await f.service.setMembership('admin','user','business','ae5d7bce-c422-4eae-bf45-e68e46c06c11','manager',true);
 assert.equal(f.queries.at(-1)?.text,'COMMIT');
 assert.equal(f.queries[3].args[1],'membership_enabled');
 assert.match(f.queries[1].text,/status='approved'/);
});

test('repeat enrollment is idempotent and does not emit duplicate provisioning audit',async()=>{
 const queries:string[]=[];
 const client={query:async(text:string)=>{
  queries.push(text);
  if(text.startsWith('INSERT INTO account_access'))return {rowCount:0,rows:[]};
  return {rowCount:1,rows:[]};
 },release:()=>{}};
 const pool={connect:async()=>client} as unknown as Pool;
 await new AccessService(pool).provisionSubject('already-provisioned');
 assert.equal(queries.some(text=>text.startsWith('INSERT INTO identity_security_events')),false);
 assert.equal(queries.at(-1),'COMMIT');
});
