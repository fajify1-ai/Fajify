import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEnvironment} from '../src/config';
import {extractBearerToken} from '../src/auth/identity.types';
import {RequestContextMiddleware} from '../src/request-context.middleware';
const config={FAJI_DATABASE_URL:'postgresql://localhost:5432/faji',REDIS_URL:'redis://localhost:6379',BETTER_AUTH_URL:'http://localhost:3001',BETTER_AUTH_SECRET:'test-secret-at-least-thirty-two-characters',FAJI_WEB_ORIGINS:'http://localhost:3000',S3_ENDPOINT:'http://localhost:9000',S3_BUCKET:'faji'};
test('validated config accepts local development',()=>assert.equal(validateEnvironment(config).PORT,3001));
test('production rejects insecure identity and object storage',()=>assert.throws(()=>validateEnvironment({...config,NODE_ENV:'production'})));
test('issuer localhost exception checks hostname and protocol',()=>{
 for(const issuer of ['http://localhost.attacker.example/realms/faji','http://attacker.example/localhost','ftp://localhost/realms/faji']) {
  assert.throws(()=>validateEnvironment({...config,BETTER_AUTH_URL:issuer}));
 }
});
test('authentication environment requires a secret, API base URL, and trusted web origins',()=>{
 for(const key of ['BETTER_AUTH_SECRET','BETTER_AUTH_URL','FAJI_WEB_ORIGINS']){
  const missing={...config};delete (missing as Record<string,string>)[key];
  assert.throws(()=>validateEnvironment(missing));
 }
});
test('bearer parsing does not accept malformed credentials',()=>{assert.equal(extractBearerToken('Basic abc'),null);assert.equal(extractBearerToken('Bearer abc.def.sig'),'abc.def.sig');});
test('correlation ID ignores untrusted control characters',()=>{
 let responseId='';let called=false;
 const req={header:()=> 'evil\nheader'} as any;
 const res={setHeader:(_name:string,value:string)=>{responseId=value;}} as any;
 new RequestContextMiddleware().use(req,res,()=>{called=true;});
 assert.equal(called,true);assert.match(responseId,/^[0-9a-f-]{36}$/);
});
