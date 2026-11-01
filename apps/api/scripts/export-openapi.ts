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
  const customer:ReadonlyArray<[string,'get'|'post',boolean]>=[
   ['/api/v1/discovery/offerings','get',false],
   ['/api/v1/discovery/offerings/{id}','get',false],
   ['/api/v1/discovery/offerings/{id}/availability','get',false],
   ...['reservations','orders'].flatMap(resource=>[
    [`/api/v1/customer/${resource}`,'get',true],
    [`/api/v1/customer/${resource}`,'post',true],
    [`/api/v1/customer/${resource}/{id}`,'get',true],
    [`/api/v1/customer/${resource}/{id}/cancellation`,'post',true],
   ] as [string,'get'|'post',boolean][]),
  ];
  for(const [path,verb,protectedRoute] of customer){
   const operation=doc.paths[path]?.[verb];
   if(!operation)throw new Error('Missing M4 customer contract: '+verb+' '+path);
   if(path.includes('{id}')&&!operation.parameters?.some(p=>'name' in p&&p.in==='path'&&p.name==='id'&&p.required))
    throw new Error('Missing M4 resource path parameter: '+path);
   if(verb==='get'&&!path.endsWith('{id}')&&!operation.parameters?.some(p=>'name' in p&&p.in==='query'&&p.name==='limit'))
    throw new Error('Missing M4 pagination: '+path);
   if(protectedRoute&&!operation.security?.some(s=>Object.hasOwn(s,'keycloak')))
    throw new Error('Missing customer bearer security: '+path);
   const response=operation.responses[verb==='post'?'201':'200'];
   if(!response||!('content' in response)||!response.content?.['application/json']?.schema)
    throw new Error('Missing M4 response schema: '+verb+' '+path);
  }
  for(const path of ['/api/v1/customer/orders','/api/v1/customer/reservations'])
   if(!doc.paths[path]?.post?.requestBody)throw new Error('Missing M4 write schema: '+path);
  writeFileSync(resolve(__dirname,'../../../packages/api_contracts/openapi.json'),JSON.stringify(doc,null,2)+"\n");
 }finally{await app.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1;});

