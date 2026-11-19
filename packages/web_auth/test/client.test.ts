import {afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {authPost} from '../client';

const original=globalThis.fetch;
afterEach(()=>{globalThis.fetch=original;});

test('plain-text origin rejection becomes a clear authentication error',async()=>{
 globalThis.fetch=async()=>new Response('Invalid origin',{status:403,headers:{'content-type':'text/plain'}});
 await assert.rejects(authPost('sign-in/email',{email:'customer@example.test',password:'test-password'}),
  {message:'Authentication failed (403). Please try again.'});
});

test('JSON authentication errors retain their user-facing message',async()=>{
 globalThis.fetch=async()=>Response.json({code:'UNTRUSTED_ORIGIN',message:'This site is not authorized to start authentication.'},{status:403});
 await assert.rejects(authPost('sign-up/email',{email:'customer@example.test',password:'test-password'}),
  {message:'This site is not authorized to start authentication.'});
});

test('successful authentication requires a JSON object response',async()=>{
 globalThis.fetch=async()=>new Response('<html>unavailable</html>',{status:200,headers:{'content-type':'text/html'}});
 await assert.rejects(authPost('sign-in/email',{email:'customer@example.test',password:'test-password'}),
  {message:'The authentication service returned an invalid response. Please try again.'});
});
