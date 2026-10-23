import {createNotificationWorker} from './jobs';
/** Worker foundation only. No external delivery is wired before notification integration. */
export const workerServiceName='faji-worker';
if(require.main===module){
 const redis=process.env.REDIS_URL;
 if(!redis)throw new Error('REDIS_URL is required');
 const worker=createNotificationWorker(redis,async()=>{throw new Error('Notification delivery not configured');});
 worker.on('failed',(job,error)=>console.error(JSON.stringify({event:'job_failed',jobId:job?.id,error:error.message})));
 const shutdown=async()=>{await worker.close();process.exitCode=0;};
 process.once('SIGTERM',()=>{void shutdown();});process.once('SIGINT',()=>{void shutdown();});
}
