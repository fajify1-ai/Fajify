import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../app.module';
import {FinanceJobs} from './finance-jobs.service';

/** Deploy separately from HTTP. Durable PostgreSQL jobs remain the source of financial work. */
async function run(){
 const app=await NestFactory.createApplicationContext(AppModule,{logger:['warn','error']});
 let stopping=false;
 const stop=()=>{stopping=true;};process.once('SIGTERM',stop);process.once('SIGINT',stop);
 try{do{try{await app.get(FinanceJobs).tick();}catch(error){console.error(JSON.stringify({event:'finance_worker_tick_failed'}));if(process.argv.includes('--once'))throw error;}
  if(process.argv.includes('--once'))break;
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,1000));
 }while(!stopping);}finally{await app.close();}
}
if(require.main===module)run().catch(()=>{console.error('Finance worker failed to initialize');process.exitCode=1;});
