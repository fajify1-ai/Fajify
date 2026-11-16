import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateEnvironment} from '../src/config';
import {RideDocumentStorage} from '../src/rides/ride-document-storage.service';

const baseline={
 NODE_ENV:'staging',FAJI_DATABASE_URL:'postgresql://localhost:5432/faji',
 REDIS_URL:'redis://localhost:6379',BETTER_AUTH_SECRET:'a'.repeat(32),
 BETTER_AUTH_URL:'https://api.fajify.com',FAJI_WEB_ORIGINS:'https://preview.fajify.com',
};

test('explicitly disabled email and Ride storage permit staging configuration without SMTP/S3',()=>{
 const env=validateEnvironment({...baseline,FAJI_EMAIL_DELIVERY_ENABLED:'false',FAJI_RIDE_STORAGE_ENABLED:'false'});
 assert.equal(env.S3_ENDPOINT,undefined);
 assert.equal(env.FAJI_EMAIL_DELIVERY_ENABLED,'false');
});

test('Ride storage remains mandatory by default',()=>{
 assert.throws(()=>validateEnvironment(baseline),/Ride storage requires/);
});

test('enabled Ride storage requires both endpoint and bucket',()=>{
 assert.throws(()=>validateEnvironment({...baseline,S3_ENDPOINT:'https://storage.example.test/'}),/Ride storage requires/);
 const env=validateEnvironment({...baseline,S3_ENDPOINT:'https://storage.example.test/',S3_BUCKET:'faji-private'});
 assert.equal(env.FAJI_RIDE_STORAGE_ENABLED,'true');
});

test('enabled Ride storage rejects non-HTTPS endpoint in staging',()=>{
 assert.throws(()=>validateEnvironment({...baseline,S3_ENDPOINT:'http://localhost:9000',S3_BUCKET:'faji-private'}),/HTTPS required/);
});

test('disabled Ride storage fails closed for both upload and metadata verification',async()=>{
 const before=process.env.FAJI_RIDE_STORAGE_ENABLED;
 process.env.FAJI_RIDE_STORAGE_ENABLED='false';
 try{
  const service=new RideDocumentStorage();
  assert.throws(()=>service.presignUpload('01234567-89ab-4cde-8fab-0123456789ab','licence','application/pdf'),{status:503});
  await assert.rejects(()=>service.verify('private/ride-drivers/fixture'),{status:503});
 }finally{
  if(before===undefined)delete process.env.FAJI_RIDE_STORAGE_ENABLED;
  else process.env.FAJI_RIDE_STORAGE_ENABLED=before;
 }
});
