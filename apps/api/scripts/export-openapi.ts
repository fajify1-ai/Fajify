import 'reflect-metadata';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../src/app.module';
import {apiDocument,setupApi} from '../src/main';
async function run(){
 const app=await NestFactory.create(AppModule,{logger:['error','warn']});
 try{
  setupApi(app);await app.init();
  const doc=apiDocument(app);
  if(!doc.paths['/api/v1/health']||!doc.paths['/api/v1/health/ready'])throw new Error('Missing versioned health routes in API contract');
  const root='/api/v1/businesses/{businessId}';
  const required:ReadonlyArray<[string,string,boolean]>=[
   ['/branches','get',false],['/branches','post',true],
   ['/branches/{branchId}','patch',true],
   ['/branches/{branchId}/hours','get',false],['/branches/{branchId}/hours','patch',true],
   ['/branches/{branchId}/catalogue','get',false],['/branches/{branchId}/catalogue','post',true],
   ['/branches/{branchId}/catalogue/{itemId}','patch',true],
   ['/branches/{branchId}/availability','get',false],['/branches/{branchId}/availability','post',true],
   ['/branches/{branchId}/availability/{slotId}','patch',true],
   ['/branches/{branchId}/reservations','get',false],['/branches/{branchId}/reservations','post',true],
   ['/branches/{branchId}/reservations/{id}/status','patch',true],
   ['/branches/{branchId}/orders','get',false],['/branches/{branchId}/orders','post',true],
   ['/branches/{branchId}/orders/{id}/status','patch',true],
   ['/branches/{branchId}/events/{itemId}','get',false],['/branches/{branchId}/events/{itemId}','patch',true],
   ['/branches/{branchId}/packages/{itemId}','get',false],['/branches/{branchId}/packages/{itemId}','patch',true],
   ['/staff','get',false],['/staff/grants','post',true],['/staff/revocations','post',true],
   ['/overview','get',false]
  ];
  for(const [suffix,verb,hasBody] of required){
   const operation=doc.paths[root+suffix]?.[verb as 'get'|'post'|'patch'];
   if(!operation)throw new Error('Missing M3 merchant contract: '+verb.toUpperCase()+' '+root+suffix);
   if(!operation.security?.some(v=>Object.hasOwn(v,'keycloak')))
    throw new Error('Missing Keycloak bearer contract on '+verb+' '+suffix);
   if(hasBody&&!operation.requestBody)
    throw new Error('Missing M3 request body schema: '+verb+' '+suffix);
  }
  const webhook=doc.paths['/api/v1/payments/webhooks/paystack']?.post;
  if(!webhook?.requestBody||!webhook.parameters?.some(p=>'name' in p&&p.name==='x-paystack-signature'&&p.required))
   throw new Error('Missing signed M5 payment webhook contract');
  for(const path of ['/api/v1/customer/payments/{id}','/api/v1/admin/finance/payments/{id}/reconciliation']){
   const operation=doc.paths[path]?.get;
   if(!operation?.security?.some(v=>Object.hasOwn(v,'keycloak'))||!operation.responses?.['200']||
    !operation.parameters?.some(p=>'name' in p&&p.name==='id'&&p.in==='path'&&p.required))
    throw new Error('Missing protected M5 payment read contract: '+path);
  }
  const recovery=doc.paths['/api/v1/admin/finance/payments/{id}/provider-recheck']?.post;
  if(!recovery?.security?.some(v=>Object.hasOwn(v,'keycloak'))||!recovery.responses?.['200']||
   !recovery.parameters?.some(p=>'name' in p&&p.name==='id'&&p.in==='path'&&p.required))
   throw new Error('Missing privileged M5 provider-recheck contract');
  writeFileSync(resolve(__dirname,'../../../packages/api_contracts/openapi.json'),JSON.stringify(doc,null,2)+"\n");
 }finally{await app.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1;});

