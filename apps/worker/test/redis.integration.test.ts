import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createNotificationQueue,createNotificationWorker,NOTIFICATION_QUEUE} from '../src/jobs';
test('Redis supports idempotent notification queue registration',{skip:!process.env.REDIS_URL},async()=>{
 const queue=createNotificationQueue(process.env.REDIS_URL!);
 try{
  const name='m1_'+Date.now();
  const a=await queue.add('pending-delivery',{eventId:name,recipientId:'fixture',template:'fixture'},{jobId:name});
  const b=await queue.add('pending-delivery',{eventId:name,recipientId:'fixture',template:'fixture'},{jobId:name});
  assert.equal(a.id,b.id);assert.equal(queue.name,NOTIFICATION_QUEUE);
  await queue.remove(name);
 }finally{await queue.close();}
});
test('worker processes jobs, retains failures and closes Redis clients', {skip:!process.env.REDIS_URL,timeout:15000},async()=>{
 const queue=createNotificationQueue(process.env.REDIS_URL!);
 const worker=createNotificationWorker(process.env.REDIS_URL!,async(job)=>{
  if(job.data.template==='fail')throw new Error('fixture delivery unavailable');
 });
 const ids=[`success_${Date.now()}`,`failure_${Date.now()}`];
 try{
  await worker.waitUntilReady();
  const completed=once(worker,'completed',{signal:AbortSignal.timeout(10000)});
  await queue.add('pending-delivery',{eventId:ids[0],recipientId:'fixture',template:'success'},{jobId:ids[0]});
  assert.equal((await completed)[0].id,ids[0]);
  const failed=once(worker,'failed',{signal:AbortSignal.timeout(10000)});
  await queue.add('pending-delivery',{eventId:ids[1],recipientId:'fixture',template:'fail'},{jobId:ids[1],attempts:1,removeOnFail:false});
  assert.equal((await failed)[0].id,ids[1]);
  const job=await queue.getJob(ids[1]);
  assert.equal(await job?.getState(),'failed');
  assert.equal(job?.failedReason,'fixture delivery unavailable');
 }finally{
  await worker.close();
  for(const id of ids)await queue.remove(id);
  await queue.close();
 }
});
