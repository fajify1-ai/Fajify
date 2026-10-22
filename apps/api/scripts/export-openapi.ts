import 'reflect-metadata';
import {writeFileSync} from 'node:fs';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../src/app.module';
import {apiDocument,setupApi} from '../src/main';
async function run(){
 const app=await NestFactory.create(AppModule,{logger:false});
 setupApi(app);await app.init();
 const doc=apiDocument(app);
 writeFileSync('../../packages/api_contracts/openapi.json',JSON.stringify(doc,null,2)+'\n');
 await app.close();
}
run().catch(err=>{console.error(err);process.exitCode=1;});
