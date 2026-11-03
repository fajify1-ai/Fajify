import 'reflect-metadata';
import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {M5_OPERATIONS} from '../src/payments/m5-contracts';
import {M4_OPERATIONS} from '../src/customer/customer-contracts';
import {M6_OPERATIONS} from '../src/planning/planning-contracts';
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
  const prepare=doc.paths['/api/v1/customer/orders/{id}/payment-intent']?.post;
  if(!prepare?.security?.some(s=>Object.hasOwn(s,'keycloak'))||!prepare.requestBody||!prepare.responses?.['200'])
   throw new Error('Missing authoritative M5 order-intent preparation contract');
  for(const contract of M4_OPERATIONS){
   const operation=doc.paths[contract.path]?.[contract.method];
   if(!operation)throw new Error('Missing M4 operation: '+contract.method+' '+contract.path);
   for(const name of [...contract.path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))
    if(!operation.parameters?.some(p=>'name' in p&&p.in==='path'&&p.name===name&&p.required))
     throw new Error('Missing M4 path parameter: '+name+' '+contract.path);
   if(contract.paginated&&!operation.parameters?.some(p=>'name' in p&&p.in==='query'&&p.name==='limit'))
    throw new Error('Missing M4 pagination: '+contract.path);
   if(contract.protected&&!operation.security?.some(s=>Object.hasOwn(s,'keycloak')))
    throw new Error('Missing M4 bearer security: '+contract.path);
   if(contract.body&&!operation.requestBody)throw new Error('Missing M4 request schema: '+contract.path);
   const response=operation.responses[String(contract.status)];
   if(!response||!('content' in response)||!response.content?.['application/json']?.schema)
    throw new Error('Missing M4 response schema: '+contract.method+' '+contract.path);
  }
  for(const [path,method,body] of M5_OPERATIONS){
   const op=doc.paths[path]?.[method];
   if(!op?.security?.some(s=>Object.hasOwn(s,'keycloak')))throw new Error('Missing protected M5 lifecycle operation: '+method+' '+path);
   if(body&&!op.requestBody)throw new Error('Missing M5 lifecycle body: '+path);
   const response=op.responses['200'];
   if(!response||!('content' in response)||!response.content?.['application/json']?.schema)throw new Error('Missing M5 lifecycle response: '+path);
   if(method==='get'&&!op.parameters?.some(p=>'name' in p&&p.in==='query'&&p.name==='limit'))throw new Error('Missing M5 pagination: '+path);
   for(const name of [...path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))
    if(!op.parameters?.some(p=>'name' in p&&p.name===name&&p.in==='path'&&p.required))throw new Error('Missing M5 lifecycle path parameter: '+path);
  }
  for(const contract of M6_OPERATIONS){
   const operation=doc.paths[contract.path]?.[contract.method];
   if(!operation)throw new Error('Missing M6 planning route: '+contract.method+' '+contract.path);
   if(!operation.security?.some(s=>Object.hasOwn(s,'keycloak')))throw new Error('Missing M6 identity protection: '+contract.path);
   if(contract.body&&!operation.requestBody)throw new Error('Missing M6 request body: '+contract.path);
   const response=operation.responses[String(contract.status)];
   if(!response||!('content' in response)||!response.content?.['application/json']?.schema)
    throw new Error('Missing M6 response schema: '+contract.path);
   for(const name of [...contract.path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))
    if(!operation.parameters?.some(p=>'name' in p&&p.name===name&&p.in==='path'&&p.required))
     throw new Error('Missing M6 path parameter: '+contract.path);
   if('paginated' in contract&&contract.paginated&&!operation.parameters?.some(p=>'name' in p&&p.name==='limit'&&p.in==='query'))
    throw new Error('Missing M6 pagination: '+contract.path);
  }
  // M7-P1 contract presence and authenticated operation policy.
  const rides:ReadonlyArray<[string,'get'|'post'|'patch',boolean]>=[
   ['/api/v1/customer/rides/quotes','post',true],
   ['/api/v1/customer/rides','post',true],
   ['/api/v1/customer/rides','get',false],
   ['/api/v1/customer/rides/{id}','get',false],
   ['/api/v1/customer/rides/{id}/cancellation','post',false],
   ['/api/v1/customer/rides/{id}/payment-intent','post',false],
   ['/api/v1/admin/ride-tariffs','post',true],
   ['/api/v1/dispatch/rides/{id}/offers','post',true],
   ['/api/v1/dispatch/rides/{id}/match','post',true],
   ['/api/v1/dispatch/rides/{id}/reassignment','post',true],
   ['/api/v1/dispatch/areas','post',true],
   ['/api/v1/dispatch/areas/{id}','patch',true],
   ['/api/v1/dispatch/areas/{areaId}/rides/{rideId}/candidates','get',false],
   ['/api/v1/dispatch/areas/{areaId}/rides','get',false],
   ['/api/v1/rides/offers/{id}/accept','post',false],
   ['/api/v1/rides/driver/offers','get',false],
   ['/api/v1/rides/driver/trips','get',false],
   ['/api/v1/rides/{id}/state','patch',true],
   ['/api/v1/rides/driver/location','post',true],
   ['/api/v1/rides/driver/location/revoke','post',false],
   ['/api/v1/rides/{id}/timeline','get',false],
   ['/api/v1/rides/{id}/events','get',false],
   ['/api/v1/drivers/onboarding','post',true],
   ['/api/v1/drivers/me','get',false],
   ['/api/v1/drivers/me/availability','post',true],
   ['/api/v1/drivers/me/documents/uploads','post',true],
   ['/api/v1/drivers/me/documents','post',true],
   ['/api/v1/drivers/me/payout-recipient','post',true],
   ['/api/v1/drivers/me/earnings','get',false],
   ['/api/v1/drivers/{id}/review','post',true],
   ['/api/v1/drivers/documents/{id}/review','post',true],
   ['/api/v1/drivers/vehicles/{id}/review','post',true],
   ['/api/v1/drivers/{id}/suspension','post',true],
   ['/api/v1/drivers/{id}/payout-recipient/verify','post',true],
   ['/api/v1/ride-safety/rides/{rideId}/incidents','post',true],
   ['/api/v1/ride-safety/incidents/{id}','get',false],
   ['/api/v1/ride-safety/areas/{areaId}/incidents','get',false],
   ['/api/v1/ride-safety/incidents/{id}','patch',true],
   ['/api/v1/admin/rides/{id}/payout-reservation','post',false],
   ['/api/v1/admin/ride-payouts/{id}/submit','post',false],
   ['/api/v1/admin/ride-payouts/{id}/reconcile','post',false]
  ];
  for(const [path,method,hasBody] of rides){
   const op=doc.paths[path]?.[method];
   if(!op)throw new Error('Missing M7 ride operation: '+method+' '+path);
   if(!op.security?.some(s=>Object.hasOwn(s,'keycloak')))throw new Error('M7 ride route lacks bearer schema: '+path);
   if(hasBody&&!op.requestBody)throw new Error('M7 ride operation lacks request schema: '+path);
   if(!op.responses?.['200']&&!op.responses?.['201'])throw new Error('M7 ride operation lacks a success response: '+path);
  }
  const snapshot=resolve(__dirname,'../../../packages/api_contracts/openapi.json');
  const previous=JSON.parse(readFileSync(snapshot,'utf8')) as typeof doc;
  for(const [path,operation] of Object.entries(previous.paths))
   if(!M5_OPERATIONS.some(([owned])=>owned===path)&&!path.startsWith('/api/v1/customer/')&&!path.startsWith('/api/v1/discovery/')&&!isDeepStrictEqual(doc.paths[path],operation))
    throw new Error('Existing identity/merchant contract changed: '+path);
  for(const [name,schema] of Object.entries(previous.components?.schemas??{}))
   if(!isDeepStrictEqual(doc.components?.schemas?.[name],schema))throw new Error('Existing schema changed: '+name);
  writeFileSync(resolve(__dirname,'../../../packages/api_contracts/openapi.json'),JSON.stringify(doc,null,2)+"\n");
 }finally{await app.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1;});
