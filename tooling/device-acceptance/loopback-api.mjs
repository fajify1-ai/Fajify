// Real Nest application over verified loopback TLS for VM-based acceptance.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {transport} from './transport.mjs';
const state=resolve(process.argv[2]);
assert.equal(statSync(state).mode&0o077,0);
const c=JSON.parse(readFileSync(state+'/state.json','utf8'));
assert.equal(c.marker,'fajify-device-acceptance-v1');
assert.equal(c.transport,'loopback-vm');
assert.match(c.database,/^fajify_m2_test_device_[a-f0-9]{12}$/);
assert.match(c.origin,/^https:\/\/localhost:[0-9]{1,5}$/);
assert.equal(c.apiOrigin,'https://localhost:'+c.ports.api);
transport(c,state);
Object.assign(process.env,{NODE_ENV:'test',PORT:String(c.ports.api),LOG_LEVEL:'error',
 FAJI_DATABASE_URL:`postgresql://faji_device_runtime:${c.passwords.runtime}@127.0.0.1:${c.ports.appdb}/${c.database}?sslmode=verify-full&sslrootcert=${state}/ca.pem`,
 KEYCLOAK_ISSUER:c.origin+'/realms/faji',KEYCLOAK_AUDIENCE:'faji-api',
 REDIS_URL:'redis://127.0.0.1:6379',S3_ENDPOINT:'http://127.0.0.1:9000',S3_BUCKET:'device-unused'});
const require=createRequire(new URL('../../apps/api/package.json',import.meta.url));
const {NestFactory}=require('@nestjs/core');
const {AppModule}=require('../../apps/api/dist/app.module.js');
const {setupApi}=require('../../apps/api/dist/main.js');
const app=await NestFactory.create(AppModule,{logger:false,httpsOptions:{
 key:readFileSync(state+'/server.key'),cert:readFileSync(state+'/server.crt')}});
setupApi(app);
app.enableShutdownHooks();
await app.listen(c.ports.api,'127.0.0.1');
console.log('READY: real Nest API, loopback TLS, dedicated application runtime role');
