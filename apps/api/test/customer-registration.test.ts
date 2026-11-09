import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {CustomerRegistrationController,CustomerRegistrationService,CustomerRegistrationInput} from '../src/auth/customer-registration';
import {setupApi} from '../src/main';

const input=():CustomerRegistrationInput=>({fullName:'Test Customer',username:'test.customer',email:'test@example.invalid',phone:'+2348012345678',dateOfBirth:'1998-01-02',homeAddress:'Test Street, Lagos',password:'test-only-password',termsAccepted:true});
const root='https://identity.example.invalid/admin/realms/fajify';
function fixture(options:{duplicate?:boolean;dbFailure?:boolean;attempts?:number;configured?:boolean}={}){
 const sql:{text:string;params?:unknown[]}[]=[];
 const calls:{url:string;options:RequestInit}[]=[];
 const connection={query:async(text:string,params?:unknown[])=>{
  sql.push({text,params});if(options.dbFailure&&text.startsWith('INSERT INTO user_profiles'))throw Error('private-db-diagnostic');return {rows:[]};
 },release:()=>{}};
 const pool={query:async(text:string,params?:unknown[])=>{sql.push({text,params});return {rows:[{attempts:options.attempts??1}]};},connect:async()=>connection};
 const http=async(url:string|URL|Request,opts:RequestInit={})=>{
  calls.push({url:String(url),options:opts});
  if(String(url).endsWith('/token'))return new Response(JSON.stringify({access_token:'test-only-service-token'}),{status:200});
  if(String(url)===`${root}/users`){return new Response(null,{status:options.duplicate?409:201,headers:{location:`${root}/users/subject-123`}});}
  if(String(url).endsWith('/roles/customer'))return new Response(JSON.stringify({id:'role-customer',name:'customer'}));
  return new Response(null,{status:204});
 };
 const service=new CustomerRegistrationService(pool as any,{enabled:options.configured??true,issuer:'https://identity.example.invalid/realms/fajify',clientId:'test-server-registration',clientSecret:'test-only-server-secret'},http as typeof fetch);
 return {service,sql,calls};
}

test('public registration creates only a customer identity and records profile/consent without password storage',async()=>{
 const f=fixture();assert.deepEqual(await f.service.register(input(),'127.0.0.1'),{created:true});
 const created=JSON.parse(f.calls.find(c=>c.url===`${root}/users`)!.options.body as string);
 assert.equal(created.enabled,false);assert.equal(created.emailVerified,false);
 assert.equal(created.credentials[0].value,input().password);
 const mapped=JSON.parse(f.calls.find(c=>c.url.endsWith('/role-mappings/realm'))!.options.body as string);
 assert.deepEqual(mapped,[{id:'role-customer',name:'customer'}]);
 assert.ok(f.sql.some(q=>q.text==='COMMIT'));
 assert.ok(f.sql.some(q=>q.text.includes('terms_accepted_at')));
 assert.ok(!JSON.stringify(f.sql).includes(input().password));
 assert.ok(!JSON.stringify(f.sql).includes('test-only-server-secret'));
 assert.ok(f.calls.every(c=>c.options.redirect==='error'&&c.options.signal));
 assert.equal(JSON.parse(f.calls.find(c=>c.options.method==='PUT')!.options.body as string).enabled,true);
});
test('duplicate registration never changes or deletes an existing identity',async()=>{
 const f=fixture({duplicate:true});await assert.rejects(f.service.register(input(),'ip'),{status:409});
 assert.equal(f.calls.length,2);assert.ok(!f.calls.some(c=>['PUT','DELETE'].includes(c.options.method??'')));
 assert.ok(!f.sql.some(q=>q.text==='BEGIN'));
});
test('provisioning failure rolls back and compensates only the newly created identity',async()=>{
 const f=fixture({dbFailure:true});await assert.rejects(f.service.register(input(),'ip'),{status:503});
 assert.ok(f.sql.some(q=>q.text==='ROLLBACK'));assert.ok(!f.sql.some(q=>q.text==='COMMIT'));
 assert.ok(f.calls.some(c=>c.url===`${root}/users/subject-123`&&c.options.method==='DELETE'));
});
test('registration throttling is checked before making privileged identity requests',async()=>{
 const f=fixture({attempts:11});await assert.rejects(f.service.register(input(),'127.0.0.1'),{status:429});
 assert.equal(f.calls.length,0);assert.notEqual(f.sql[0].params?.[0],'127.0.0.1');
});
test('missing server configuration fails closed without network or database calls',async()=>{
 const f=fixture({configured:false});await assert.rejects(f.service.register(input(),'ip'),{status:503});
 assert.equal(f.calls.length,0);assert.equal(f.sql.length,0);
});
test('HTTP registration validates all fields and refuses client-selected roles/identity/verification flags',async()=>{
 let calls=0;
 const module=await Test.createTestingModule({controllers:[CustomerRegistrationController],providers:[{provide:CustomerRegistrationService,useValue:{register:async()=>{calls++;return {created:true};}}}]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();
 try{
  await request(app.getHttpServer()).post('/api/v1/auth/register').send({...input(),role:'admin',emailVerified:true}).expect(400);
  await request(app.getHttpServer()).post('/api/v1/auth/register').send({...input(),termsAccepted:false}).expect(400);
  await request(app.getHttpServer()).post('/api/v1/auth/register').send({...input(),password:'short'}).expect(400);
  assert.equal(calls,0);
  const response=await request(app.getHttpServer()).post('/api/v1/auth/register').send(input()).expect(201);
  assert.deepEqual(response.body,{created:true});assert.equal(calls,1);
 }finally{await app.close();}
});
