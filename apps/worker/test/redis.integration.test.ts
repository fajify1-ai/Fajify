import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationQueue,NOTIFICATION_QUEUE} from '../src/jobs';
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
