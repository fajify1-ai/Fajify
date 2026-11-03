import {createHash} from 'node:crypto';
import {ConflictException,Inject,Injectable} from '@nestjs/common';
import {Pool,type PoolClient} from 'pg';
import {DATABASE_POOL} from '../tokens';

export interface AdminCommandInput {
 actor:string;requestKey:string;operation:string;resourceType:string;resourceId:string;
 payload:unknown;reason?:string;
}
@Injectable()
export class AdminCommandService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async execute<T>(input:AdminCommandInput,run:(client:PoolClient)=>Promise<T>):Promise<T>{
  const {actor,requestKey,operation,resourceType,resourceId}=input;
  if(!actor||!/^[A-Za-z0-9_-]{8,100}$/.test(requestKey))throw new ConflictException('Invalid administrative command');
  const fingerprint=createHash('sha256').update(JSON.stringify({
   operation,resourceType,resourceId,payload:input.payload
  })).digest('hex');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("SET LOCAL lock_timeout='5s'");
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['m8:'+actor+':'+requestKey]);
   const old=await client.query<{fingerprint:string;result_json:T}>(
    'SELECT fingerprint,result_json FROM admin_command_receipts WHERE actor_subject=$1 AND request_key=$2',
    [actor,requestKey]);
   if(old.rowCount){
    if(old.rows[0].fingerprint!==fingerprint)throw new ConflictException('Administrative request key reused with different command');
    await client.query('COMMIT');
    return old.rows[0].result_json;
   }
   const result=await run(client);
   const outcome=(result&&typeof result==='object'&&'changed' in result&&(result as {changed?:boolean}).changed===false)
    ?'unchanged':'applied';
   await client.query(
    'INSERT INTO admin_command_receipts(actor_subject,request_key,fingerprint,operation,resource_type,resource_id,result_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
    [actor,requestKey,fingerprint,operation,resourceType,resourceId,JSON.stringify(result)]);
   await client.query(
    'INSERT INTO admin_action_events(actor_subject,operation,resource_type,resource_id,outcome,reason) VALUES($1,$2,$3,$4,$5,$6)',
    [actor,operation,resourceType,resourceId,outcome,input.reason??null]);
   await client.query('COMMIT');
   return result;
  }catch(error){
   await client.query('ROLLBACK');
   if(['40P01','40001','55P03'].includes((error as {code?:string}).code??''))
    throw new ConflictException('Concurrent administrative command; retry using the same request key');
   throw error;
  }finally{client.release();}
 }
}
