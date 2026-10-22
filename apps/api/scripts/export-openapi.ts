import 'reflect-metadata';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../src/app.module';
import {apiDocument,setupApi} from '../src/main';
async function run(){
 const app=await NestFactory.create(AppModule,{logger:false});
 try{
  setupApi(app);await app.init();
  const doc=apiDocument(app);
  if(!doc.paths['/api/v1/health']||!doc.paths['/api/v1/health/ready'])throw new Error('Missing versioned health routes in API contract');
  writeFileSync(resolve(__dirname,'../../../packages/api_contracts/openapi.json'),JSON.stringify(doc,null,2)+'\n');
 }finally{await app.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1;});
