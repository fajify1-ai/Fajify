import {test} from 'node:test';
import assert from 'node:assert/strict';
import {json} from './http.mjs';
test('Keycloak 201 user creation with empty body does not attempt JSON parsing',async()=>{
 assert.equal(await json('https://localhost/admin/users',{},201,async()=>new Response(null,{status:201,headers:{location:'/users/synthetic'}})),undefined);
});
test('Keycloak 204 updates with empty body succeed',async()=>{
 assert.equal(await json('https://localhost/admin/client',{},204,async()=>new Response(null,{status:204})),undefined);
});
test('200 response still requires valid JSON',async()=>{
 assert.deepEqual(await json('https://localhost/token',{},200,async()=>Response.json({valid:true})),{valid:true});
 await assert.rejects(()=>json('https://localhost/token',{},200,async()=>new Response('invalid')));
});
test('Unexpected status fails without disclosing response body',async()=>{
 await assert.rejects(()=>json('https://localhost/token',{},200,async()=>new Response('secret fixture',{status:401})),error=>!error.message.includes('secret fixture'));
});
