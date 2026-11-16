/** Private loopback fixture. Refuses every database without an explicit disposable marker. */
import 'reflect-metadata';
import {createServer} from 'node:http';
import {Test} from '@nestjs/testing';
import {Pool} from 'pg';
import {IdentityModule} from '../src/auth/identity.module';
import {DatabaseModule} from '../src/database.module';
import {BetterAuthService} from '../src/auth/better-auth.service';
import {DATABASE_POOL} from '../src/tokens';
import {setupApi} from '../src/main';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import type {NestExpressApplication} from '@nestjs/platform-express';
async function main(){
 if(process.env.NODE_ENV!=='test')throw Error('Test environment required');
 const owner=new Pool({connectionString:process.env.FAJI_DATABASE_URL}),runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL});await assertDisposable(owner);await assertDisposable(runtime);
 const secret=process.env.FAJI_FIXTURE_SECRET;if(!secret||secret.length<32)throw Error('Fixture secret required');
 const deliveries=new Map<string,string>();
 const sms=createServer(async(req,res)=>{if(req.headers.authorization!==`Bearer ${secret}`){res.writeHead(401).end();return;}if(req.method==='GET'){res.setHeader('content-type','application/json');res.end(JSON.stringify({code:deliveries.get(new URL(req.url!,'http://localhost').searchParams.get('phone')??'')}));return;}let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);deliveries.set(body.phoneNumber,body.code);res.writeHead(204).end();});await new Promise<void>(r=>sms.listen(3111,'127.0.0.1',r));
 process.env.FAJI_SMS_WEBHOOK_URL='http://127.0.0.1:3111';process.env.FAJI_SMS_WEBHOOK_SECRET=secret;
 const module=await Test.createTestingModule({imports:[DatabaseModule,IdentityModule]}).overrideProvider(DATABASE_POOL).useValue(runtime).compile();const app=module.createNestApplication<NestExpressApplication>({bodyParser:false});
 app.use('/api/auth',(req:any,res:any,next:any)=>{if(req.originalUrl.startsWith('/api/auth/faji/'))return next();module.get(BetterAuthService).handle(req,res).catch(next);});app.useBodyParser('json');
 app.use('/__fixture',async(req:any,res:any)=>{try{
  if(req.headers['x-fixture-secret']!==secret)return res.sendStatus(401);
  if(req.method==='GET'&&req.path==='/status')return res.json({disposable:true,name:process.env.FAJI_DISPOSABLE_DATABASE});
  const {action,subject,role}=req.body;
  if(action==='limits'){await owner.query('DELETE FROM auth_rate_limit');return res.json({ok:true});}
  const target=await owner.query("SELECT id FROM auth_user WHERE id=$1 AND email LIKE '%@example.test'",[subject]);if(target.rowCount!==1)return res.sendStatus(404);
  if(action==='role'&&['customer','merchant','driver','dispatcher','platform-admin'].includes(role))await owner.query('INSERT INTO application_roles(identity_subject,role) VALUES($1,$2) ON CONFLICT DO NOTHING',[subject,role]);
  else if(action==='suspend')await owner.query('UPDATE account_access SET suspended=$2 WHERE identity_subject=$1',[subject,req.body.value===true]);
  else if(action==='expire')await owner.query("UPDATE auth_session SET expires_at=now()-interval '1 second' WHERE user_id=$1",[subject]);
  else return res.sendStatus(400);
  res.json({ok:true});
 }catch{res.sendStatus(500);}});
 setupApi(app);await app.listen(3101,'127.0.0.1');console.log('Private disposable authentication fixture ready');
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{app.close().then(()=>owner.end()).finally(()=>sms.close(()=>process.exit(0)));});
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Fixture failed');process.exitCode=1;});
