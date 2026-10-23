import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reflector} from '@nestjs/core';
import {RolesGuard,RequireRoles} from '../src/auth/roles.guard';

class Handler {
 @RequireRoles('admin','dispatcher')
 restricted(){}
 unrestricted(){}
}
const guard=new RolesGuard(new Reflector());
const ctx=(method:keyof Handler,roles?:string[])=>({
 getHandler:()=>Handler.prototype[method],
 getClass:()=>Handler,
 switchToHttp:()=>({getRequest:()=>({identity:roles===undefined?undefined:{subject:'user',roles}})})
}) as any;
test('role guard permits unconstrained route',()=>{
 assert.equal(guard.canActivate(ctx('unrestricted')),true);
});
test('role guard requires a verified identity and matching role',()=>{
 assert.throws(()=>guard.canActivate(ctx('restricted')),{status:403});
 assert.throws(()=>guard.canActivate(ctx('restricted',['customer'])),{status:403});
 assert.equal(guard.canActivate(ctx('restricted',['dispatcher'])),true);
 assert.equal(guard.canActivate(ctx('restricted',['admin'])),true);
});
