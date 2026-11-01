import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {ExecutionContext} from '@nestjs/common';
import type {Pool} from 'pg';
import {CustomerWriteGuard} from '../src/customer/customer-write.guard';
const context=(method:string,path:string,headers:Record<string,string>={})=>({
 switchToHttp:()=>({
  getRequest:()=>({method,route:{path},identity:{subject:'customer'}}),
  getResponse:()=>({setHeader:(name:string,value:string)=>{headers[name]=value;}}),
 }),
}) as unknown as ExecutionContext;
test('write budget is shared by account, gives 429 with retry information, and exempts reads',async()=>{
 const sql:{query:string;values:unknown[]}[]=[];
 const guard=new CustomerWriteGuard({query:async(query:string,values:unknown[])=>{sql.push({query,values});return {rows:[{used:61}]};}} as unknown as Pool);
 assert.equal(await guard.canActivate(context('GET','/customer/profile')),true);assert.equal(sql.length,0);
 const headers:Record<string,string>={};
 await assert.rejects(()=>guard.canActivate(context('POST','/customer/orders',headers)),e=>(e as {getStatus:()=>number}).getStatus()===429);
 assert.equal(headers['Retry-After'],'60');assert.deepEqual(sql[0].values,['customer','write',60]);
 assert.match(sql[0].query,/ON CONFLICT/);assert.match(sql[0].query,/clock_timestamp/);
});
test('support and review have narrower budgets, and unavailable storage fails closed',async()=>{
 const buckets:unknown[][]=[];
 const guard=new CustomerWriteGuard({query:async(_query:string,values:unknown[])=>{buckets.push(values);return {rows:[{used:1}]};}} as unknown as Pool);
 await guard.canActivate(context('POST','/customer/support'));await guard.canActivate(context('PUT','/customer/orders/:id/review'));
 assert.deepEqual(buckets,[['customer','write',60],['customer','support',10],['customer','write',60],['customer','review',10]]);
 const unavailable=new CustomerWriteGuard({query:async()=>{throw Error('database offline');}} as unknown as Pool);
 await assert.rejects(()=>unavailable.canActivate(context('POST','/customer/orders')),e=>(e as {getStatus:()=>number}).getStatus()===503);
});
