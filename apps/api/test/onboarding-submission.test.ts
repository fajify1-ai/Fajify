import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applicationSnapshot} from '../src/web-completion/onboarding';
const fields={category:'restaurant',services:['ordering','reservations'],scale:'small',fullName:' Ada Merchant ',email:'ada@example.test',phone:'+2348012345678',regNum:'',bizAddr:'12 Real Street',city:'Lagos',lga:'Lekki',landmark:''};
const complete={step:8,businessName:' A merchant ',fields:JSON.stringify(fields)};
test('application snapshots validate and normalize all merchant application sections without asserting identity verification',()=>{
 const snapshot=applicationSnapshot(complete);assert.equal(snapshot.businessName,'A merchant');assert.equal(snapshot.contact.fullName,'Ada Merchant');assert.deepEqual(snapshot.services,['ordering','reservations']);assert.equal(snapshot.verificationStatus,'not_reviewed');
 for(const override of [{step:7},{businessName:'x'},{fields:'null'},{fields:'invalid JSON'},...Object.entries({category:'unsupported',services:[],scale:'wrong',fullName:'',email:'invalid',phone:'bad',bizAddr:'',city:'',lga:''}).map(([key,value])=>({fields:JSON.stringify({...fields,[key]:value})}))])assert.throws(()=>applicationSnapshot({...complete,...override}));
});
