/* Boot the deploy --prod artifact against a marked disposable database, loopback only. */
const {resolve}=require('node:path');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
async function main(){
 if(process.env.NODE_ENV!=='test')throw Error('NODE_ENV=test required');
 const root=resolve(process.argv[2]||'work/api-production-bundle');const local=name=>require(resolve(root,'node_modules',name));
 const {Pool}=local('pg');const check=new Pool({connectionString:process.env.FAJI_DATABASE_URL});
 try{const result=await check.query("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");assert.match(result.rows[0].name,/^fajify_m[1-8]_test_/);assert.match(result.rows[0].marker,/^fajify:m[1-8]:disposable$/);}finally{await check.end();}
 const {NestFactory}=local('@nestjs/core');const {AppModule}=require(resolve(root,'dist/app.module'));const {BetterAuthService}=require(resolve(root,'dist/auth/better-auth.service'));const {setupApi}=require(resolve(root,'dist/main'));
 const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false,rawBody:true});
 app.use('/api/auth',(req,res,next)=>{if(req.originalUrl.startsWith('/api/auth/faji/'))return next();app.get(BetterAuthService).handle(req,res).catch(next);});app.useBodyParser('json');setupApi(app);await app.listen(0,'127.0.0.1');
 try{
  const base=await app.getUrl();assert.equal((await fetch(base+'/api/v1/health')).status,200);assert.equal((await fetch(base+'/api/v1/health/ready')).status,200);assert.equal((await fetch(base+'/api/auth/ok')).status,200);assert.equal((await fetch(base+'/api/v1/auth/me')).status,401);
  const response=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Production package probe',email:`bundle-${randomUUID()}@example.test`,password:'disposable-bundle-password-123'})});assert.equal(response.status,200);const data=await response.json();
  const me=await fetch(base+'/api/v1/auth/me',{headers:{authorization:`Bearer ${data.token}`}});assert.equal(me.status,200);assert.deepEqual((await me.json()).roles,['customer']);
  console.log('PASS: production-only API package boots, validates PostgreSQL health, serves Better Auth and enforces authenticated identity on loopback');
 }finally{await app.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Production package probe failed');process.exitCode=1;});
