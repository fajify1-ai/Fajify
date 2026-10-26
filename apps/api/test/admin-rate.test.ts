import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AdminRateGuard} from '../src/auth/admin-rate.guard';
import {AccessService} from '../src/auth/access.service';
import type {Pool} from 'pg';

const ctx=(subject?:string)=>({switchToHttp:()=>({getRequest:()=>({
 identity:subject?{subject}:undefined
})})}) as any;

test('database-backed rate guard permits requests below quota',async()=>{
 const access={allowPrivilegedRequest:async(subject:string)=>{assert.equal(subject,'admin-1');return true;}} as AccessService;
 assert.equal(await new AdminRateGuard(access).canActivate(ctx('admin-1')),true);
});
test('rate guard rejects quota exhaustion with 429',async()=>{
 const access={allowPrivilegedRequest:async()=>false} as AccessService;
 await assert.rejects(new AdminRateGuard(access).canActivate(ctx('admin-1')),{status:429});
});
test('rate guard fails closed if PostgreSQL is unavailable',async()=>{
 const access={allowPrivilegedRequest:async()=>{throw Error('db offline');}} as AccessService;
 await assert.rejects(new AdminRateGuard(access).canActivate(ctx('admin-1')),{status:503});
 await assert.rejects(new AdminRateGuard(access).canActivate(ctx()),{status:401});
});
function fixture(count:string){
 const statements:string[]=[];
 const client={
  query:async(sql:string)=>{
   statements.push(sql);
   return sql.startsWith('SELECT COUNT(')?{rows:[{total:count}],rowCount:1}:{rows:[],rowCount:1};
  },release:()=>{}
 };
 const pool={connect:async()=>client} as unknown as Pool;
 return {access:new AccessService(pool),statements};
}
test('20 requests per minute quota stops logging accepted requests at capacity',async()=>{
 const permitted=fixture('19');
 assert.equal(await permitted.access.allowPrivilegedRequest('admin-2'),true);
 assert.ok(permitted.statements.some(s=>s.includes("VALUES($1,'admin_request')")));
 const rejected=fixture('20');
 assert.equal(await rejected.access.allowPrivilegedRequest('admin-2'),false);
 assert.equal(rejected.statements.some(s=>s.includes("VALUES($1,'admin_request')")),false);
 assert.equal(rejected.statements.at(-1),'COMMIT');
});
