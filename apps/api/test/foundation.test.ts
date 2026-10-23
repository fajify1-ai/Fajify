import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEnvironment} from '../src/config';
import {extractBearerToken} from '../src/auth/identity.types';
import {RequestContextMiddleware} from '../src/request-context.middleware';
const config={FAJI_DATABASE_URL:'postgresql://localhost:5432/faji',REDIS_URL:'redis://localhost:6379',KEYCLOAK_ISSUER:'http://localhost:8080/realms/faji',KEYCLOAK_AUDIENCE:'faji-api',S3_ENDPOINT:'http://localhost:9000',S3_BUCKET:'faji'};
test('validated config accepts local development',()=>assert.equal(validateEnvironment(config).PORT,3001));
test('production rejects insecure identity and object storage',()=>assert.throws(()=>validateEnvironment({...config,NODE_ENV:'production'})));
test('issuer localhost exception checks hostname and protocol',()=>{
 for(const issuer of ['http://localhost.attacker.example/realms/faji','http://attacker.example/localhost','ftp://localhost/realms/faji']) {
  assert.throws(()=>validateEnvironment({...config,KEYCLOAK_ISSUER:issuer}));
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
