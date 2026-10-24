import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
const clock=1800000000,guard=new PrivilegedGuard('faji-mfa',()=>clock);
const ctx=(identity:unknown)=>({switchToHttp:()=>({getRequest:()=>({identity})})}) as any;
const identity={subject:'subject',roles:['platform-admin'],authContext:'faji-mfa',authTime:clock-40};
test('privileged guard requires recent elevated identity',()=>{
 assert.equal(guard.canActivate(ctx(identity)),true);
 for(const record of [
  {...identity,roles:['customer']},
  {...identity,authContext:'1'},
  {...identity,authTime:clock-301},
  {...identity,authTime:clock+1},
  {...identity,authTime:undefined},
  undefined
 ])assert.throws(()=>guard.canActivate(ctx(record)),{status:403});
});
