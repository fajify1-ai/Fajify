import {Queue,Worker,Job,JobsOptions} from 'bullmq';
import type {RedisOptions} from 'ioredis';
export const NOTIFICATION_QUEUE='notifications';
export interface NotificationJob {eventId:string;recipientId:string;template:string;}
/** Let BullMQ own its clients so queue/worker close also releases Redis sockets. */
export function redisConnection(value:string):RedisOptions{
 const url=new URL(value);
 if(!['redis:','rediss:'].includes(url.protocol))throw new Error('Invalid Redis protocol');
 const db=url.pathname.slice(1);
 if(db && !/^\d+$/.test(db))throw new Error('Invalid Redis database');
 return {host:url.hostname.replace(/^\[|\]$/g,''),port:Number(url.port||6379),
  username:url.username?decodeURIComponent(url.username):undefined,
  password:url.password?decodeURIComponent(url.password):undefined,
  db:db?Number(db):0,tls:url.protocol==='rediss:'?{}:undefined,
  maxRetriesPerRequest:null,enableReadyCheck:true};
}
export function notificationOptions(eventId:string):JobsOptions{
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(eventId))throw new Error('Invalid event id');
 return {jobId:eventId,attempts:5,backoff:{type:'exponential',delay:1000},removeOnComplete:{age:86400,count:1000},removeOnFail:false};
}
export function createNotificationQueue(url:string){const connection=redisConnection(url);return new Queue<NotificationJob>(NOTIFICATION_QUEUE,{connection});}
export function createNotificationWorker(url:string,handler:(job:Job<NotificationJob>)=>Promise<void>){
 return new Worker<NotificationJob>(NOTIFICATION_QUEUE,handler,{connection:redisConnection(url),concurrency:5});
}
