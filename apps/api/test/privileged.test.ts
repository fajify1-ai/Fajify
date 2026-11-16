import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PrivilegedGuard} from '../src/auth/privileged.guard';
const clock=1800000000,guard=new PrivilegedGuard(()=>clock);
const ctx=(identity:unknown)=>({switchToHttp:()=>({getRequest:()=>({identity})})}) as any;
const identity={subject:'subject',roles:['platform-admin'],authorizedParty:'faji-admin-web',authContext:'faji-mfa',issuedAt:clock-40};
test('privileged guard requires recent elevated identity',()=>{
 assert.equal(guard.canActivate(ctx(identity)),true);
 for(const record of [
  {...identity,roles:['customer']},
  {...identity,issuedAt:clock-301},
  {...identity,issuedAt:clock+1},
  {...identity,issuedAt:undefined},
  undefined
 ])assert.throws(()=>guard.canActivate(ctx(record)),{status:403});
});
