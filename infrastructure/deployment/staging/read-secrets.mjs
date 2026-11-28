import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const read=name=>readFileSync('/run/secrets/'+name,'utf8').trim();
const env={...process.env};
const database=new URL(`postgresql://${env.FAJI_DB_USER}@db:5432/${env.FAJI_DB_NAME}`);database.password=read(env.FAJI_DB_PASSWORD_SECRET);env.FAJI_DATABASE_URL=database.toString();
if(env.FAJI_DB_USER==='faji_migrator'){const runtime=new URL(database);runtime.username='faji_runtime';runtime.password=read('db_runtime_password');env.FAJI_RUNTIME_DATABASE_URL=runtime.toString();}
else{env.BETTER_AUTH_SECRET=read('better_auth_secret');env.FAJI_VERIFICATION_ENCRYPTION_KEY=read('verification_encryption_key');env.SMTP_URL=read('smtp_url');env.FAJI_SMS_WEBHOOK_SECRET=read('sms_webhook_secret');const redis=new URL('redis://redis:6379');redis.password=read('redis_password');env.REDIS_URL=redis.toString();}
const child=spawn(process.argv[2],process.argv.slice(3),{env,stdio:'inherit'});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??1));child.on('error',()=>{console.error('Application startup failed');process.exitCode=1;});
