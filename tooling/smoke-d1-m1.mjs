import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

const socket=createServer();
socket.listen(0,'127.0.0.1');
await once(socket,'listening');
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
const child=spawn(process.execPath,['apps/api/dist/main.js'],{
 env:{...process.env,NODE_ENV:'test',PORT:String(port),
  FAJI_DATABASE_URL:process.env.FAJI_DATABASE_URL||'postgresql://localhost:1/faji_smoke',
  REDIS_URL:process.env.REDIS_URL||'redis://localhost:1',
  KEYCLOAK_ISSUER:process.env.KEYCLOAK_ISSUER||'http://localhost:8080/realms/faji',
  KEYCLOAK_AUDIENCE:process.env.KEYCLOAK_AUDIENCE||'faji-api',
  S3_ENDPOINT:process.env.S3_ENDPOINT||'http://localhost:9000',S3_BUCKET:process.env.S3_BUCKET||'faji-smoke'},
 stdio:'ignore'
});
const exited=once(child,'exit');
try {
 const url=`http://127.0.0.1:${port}/api/v1/health`;
 let live;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error(`API exited with ${child.exitCode}`);
  try{live=await fetch(url,{headers:{'x-request-id':'compiled_smoke'},signal:AbortSignal.timeout(1000)});break;}
  catch{await delay(100);}
 }
 assert.ok(live,'Compiled API did not start');
 assert.equal(live.status,200);
 assert.equal(live.headers.get('x-request-id'),'compiled_smoke');
 assert.equal((await live.json()).status,'ok');
 const ready=await fetch(`${url}/ready`,{signal:AbortSignal.timeout(5000)});
 assert.equal(ready.status,process.env.FAJI_DATABASE_URL?200:503);
 const missing=await fetch(`http://127.0.0.1:${port}/api/v1/unknown`);
 assert.equal(missing.status,404);
 assert.equal((await missing.json()).error.code,'NOT_FOUND');
 console.log('PASS: compiled API startup, liveness, readiness and error envelope');
} finally {
 child.kill('SIGTERM');
 const timer=setTimeout(()=>child.kill('SIGKILL'),5000);
 const [code,signal]=await exited;
 clearTimeout(timer);
 assert.notEqual(signal,'SIGKILL','API graceful shutdown timed out');
 assert.equal(code,0,'API did not shut down cleanly');
}
