import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RideDocumentStorage} from '../src/rides/ride-document-storage.service';

const object='private/ride-drivers/01234567-89ab-4cde-8fab-0123456789ab/licence/fixture-12345678.pdf';
const keys=['S3_ENDPOINT','S3_BUCKET','FAJI_S3_ACCESS_KEY_ID','FAJI_S3_SECRET_ACCESS_KEY','FAJI_S3_REGION','FAJI_S3_SESSION_TOKEN'] as const;
function configured<T>(work:()=>Promise<T>):Promise<T>{
 const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]])) as Record<string,string|undefined>;
 process.env.S3_ENDPOINT='https://s3.fixture.invalid/';
 process.env.S3_BUCKET='faji-private';
 process.env.FAJI_S3_ACCESS_KEY_ID='fixture_access_id';
 process.env.FAJI_S3_SECRET_ACCESS_KEY='fixture_secret_material_only';
 process.env.FAJI_S3_REGION='us-east-1';
 delete process.env.FAJI_S3_SESSION_TOKEN;
 return work().finally(()=>{for(const k of keys){const value=prior[k];if(value===undefined)delete process.env[k];else process.env[k]=value;}});
}

test('M7 private document: signed HEAD proves expected restricted object metadata',async()=>{
 await configured(async()=>{
  let checked=false;
  const transport:typeof fetch=async(url,options)=>{
   const uri=new URL(String(url));
   assert.equal(uri.hostname,'s3.fixture.invalid');
   assert.equal(uri.pathname,'/faji-private/'+object);
   assert.equal(options?.method,'HEAD');
   const headers=new Headers(options?.headers);
   assert.match(headers.get('authorization')??'',/^AWS4-HMAC-SHA256 Credential=fixture_access_id\//);
   assert.match(headers.get('x-amz-date')??'',/^\d{8}T\d{6}Z$/);
   checked=true;
   return new Response(null,{status:200,headers:{
    'content-length':'19000','content-type':'application/pdf','etag':'"abc123"',
    'x-amz-version-id':'v7'
   }});
  };
  const result=await new RideDocumentStorage().verify(object,transport);
  assert.equal(checked,true);
  assert.deepEqual(result,{etag:'"abc123"',bytes:19000,contentType:'application/pdf',versionId:'v7'});
 });
});
test('M7 private document: oversized or unsupported content fails closed',async()=>{
 await configured(async()=>{
  const bad:typeof fetch=async()=>new Response(null,{status:200,headers:{
   'content-length':'20000000','content-type':'application/x-msdownload','etag':'"fixture"'
  }});
  await assert.rejects(()=>new RideDocumentStorage().verify(object,bad),{status:422});
 });
});
test('M7 private document: arbitrary object paths cannot become server-side metadata probes',async()=>{
 await configured(async()=>{
  const prohibited:typeof fetch=async()=>{throw Error('Transport must not be called')};
  await assert.rejects(()=>new RideDocumentStorage().verify('private/customers/another-tenant/identity.pdf',prohibited),{status:422});
 });
});
test('M7 private document: missing credentials block all metadata checks',async()=>{
 await configured(async()=>{
  delete process.env.FAJI_S3_SECRET_ACCESS_KEY;
  await assert.rejects(()=>new RideDocumentStorage().verify(object),{status:503});
 });
});

test('M7 private document: signed upload URL has bounded expiry and server-selected key',async()=>{
 await configured(async()=>{
  const uploaded=new RideDocumentStorage().presignUpload(
   '01234567-89ab-4cde-8fab-0123456789ab','licence','application/pdf');
  assert.match(uploaded.key,/^private\/ride-drivers\/01234567-89ab-4cde-8fab-0123456789ab\/licence\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(uploaded.method,'PUT');
  assert.equal(uploaded.expiresInSeconds,300);
  assert.equal(uploaded.headers['Content-Type'],'application/pdf');
  const uri=new URL(uploaded.uploadUrl);
  assert.equal(uri.hostname,'s3.fixture.invalid');
  assert.equal(uri.searchParams.get('X-Amz-Expires'),'300');
  assert.equal(uri.searchParams.get('X-Amz-SignedHeaders'),'content-type;host');
  assert.match(uri.searchParams.get('X-Amz-Signature')??'',/^[a-f0-9]{64}$/);
  assert.ok(!uploaded.uploadUrl.includes('fixture_secret_material_only'));
 });
});
