import {Queue,Worker,Job,JobsOptions} from 'bullmq';
import IORedis from 'ioredis';
export const NOTIFICATION_QUEUE='notifications';
export interface NotificationJob {eventId:string;recipientId:string;template:string;}
export function redisConnection(url:string){return new IORedis(url,{maxRetriesPerRequest:null,enableReadyCheck:true});}
export function notificationOptions(eventId:string):JobsOptions{
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(eventId))throw new Error('Invalid event id');
 return {jobId:eventId,attempts:5,backoff:{type:'exponential',delay:1000},removeOnComplete:{age:86400,count:1000},removeOnFail:false};
}
export function createNotificationQueue(url:string){const connection=redisConnection(url);return new Queue<NotificationJob>(NOTIFICATION_QUEUE,{connection});}
export function createNotificationWorker(url:string,handler:(job:Job<NotificationJob>)=>Promise<void>){
 return new Worker<NotificationJob>(NOTIFICATION_QUEUE,handler,{connection:redisConnection(url),concurrency:5});
}
