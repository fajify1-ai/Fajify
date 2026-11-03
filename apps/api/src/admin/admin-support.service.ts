import {createHash} from 'node:crypto';
import {ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';
import {AdminCommandService} from './admin-command.service';
function page<T>(rows:T[],q:PageQuery){return {items:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null};}
const caseFields='id,customer_subject AS "customerSubject",category,resource_id AS "resourceId",subject,status,assigned_to AS "assignedTo",priority,created_at AS "createdAt",updated_at AS "updatedAt"';
@Injectable()
export class AdminSupportService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AdminCommandService)private readonly commands:AdminCommandService){}
 async cases(q:PageQuery,state:'open'|'closed'='open'){
  const r=await this.pool.query(`SELECT ${caseFields} FROM customer_support_cases WHERE status=$1 ORDER BY updated_at DESC,id DESC LIMIT $2 OFFSET $3`,
   [state,q.limit+1,q.offset]);return page(r.rows,q);
 }
 async detail(id:string,q:PageQuery){
  const result=await this.pool.query(`SELECT ${caseFields} FROM customer_support_cases WHERE id=$1`,[id]);
  if(!result.rowCount)throw new NotFoundException('Support case not found');
  const messages=await this.pool.query(
   'SELECT id,body,author_kind AS "authorKind",created_at AS "createdAt" FROM customer_support_messages WHERE case_id=$1 ORDER BY created_at,id LIMIT $2 OFFSET $3',
   [id,q.limit+1,q.offset]);
  return {...result.rows[0],messages:page(messages.rows,q)};
 }
 async assign(actor:string,id:string,input:{requestKey:string;assignee:string|null;priority:'low'|'normal'|'high'|'urgent';reason:string}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'support.assign',resourceType:'support',resourceId:id,
   payload:input,reason:input.reason},async c=>{
   const existing=await c.query<{assigned_to:string|null;priority:string}>(
    'SELECT assigned_to,priority FROM customer_support_cases WHERE id=$1 FOR UPDATE',[id]);
   if(!existing.rowCount)throw new NotFoundException('Support case not found');
   if(input.assignee){
    const granted=await c.query(`SELECT 1 FROM admin_scope_grants g
      JOIN account_access a ON a.identity_subject=g.identity_subject AND a.suspended=false
      JOIN user_profiles p ON p.identity_subject=g.identity_subject AND p.suspended=false
      WHERE g.identity_subject=$1 AND g.scope='support.write' AND g.active=true LIMIT 1`,[input.assignee]);
    if(!granted.rowCount)throw new ConflictException('Support assignee lacks active scope');
   }
   const changed=existing.rows[0].assigned_to!==input.assignee||existing.rows[0].priority!==input.priority;
   if(changed)await c.query(
    'UPDATE customer_support_cases SET assigned_to=$2,priority=$3,updated_at=now() WHERE id=$1',
    [id,input.assignee,input.priority]);
   return {id,assignedTo:input.assignee,priority:input.priority,changed};
  });
 }
 async reply(actor:string,id:string,input:{requestKey:string;message:string}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'support.reply',resourceType:'support',resourceId:id,
   payload:{message:input.message}},async c=>{
   const state=await c.query('SELECT status FROM customer_support_cases WHERE id=$1 FOR UPDATE',[id]);
   if(!state.rowCount)throw new NotFoundException('Support case not found');
   if(state.rows[0].status!=='open')throw new ConflictException('Support case is closed');
   const count=await c.query<{count:number}>('SELECT count(*)::int AS count FROM customer_support_messages WHERE case_id=$1',[id]);
   if(count.rows[0].count>=100)throw new ConflictException('Support message limit reached');
   const added=await c.query(
    'INSERT INTO customer_support_messages(case_id,request_key,body,author_kind,author_subject) VALUES($1,$2,$3,\'admin\',$4) RETURNING id,body,created_at AS "createdAt"',
    [id,'m8_'+createHash('sha256').update(actor+':'+input.requestKey).digest('hex'),input.message.trim(),actor]);
   await c.query('UPDATE customer_support_cases SET updated_at=now() WHERE id=$1',[id]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
    ['admin.support.replied',JSON.stringify({caseId:id})]);
   return added.rows[0];
  });
 }
 async status(actor:string,id:string,input:{requestKey:string;status:'open'|'closed';reason:string}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'support.status',resourceType:'support',resourceId:id,
   payload:{status:input.status,reason:input.reason},reason:input.reason},async c=>{
   const found=await c.query<{status:string}>('SELECT status FROM customer_support_cases WHERE id=$1 FOR UPDATE',[id]);
   if(!found.rowCount)throw new NotFoundException('Support case not found');
   const changed=found.rows[0].status!==input.status;
   if(changed){
    await c.query('UPDATE customer_support_cases SET status=$2,updated_at=now() WHERE id=$1',[id,input.status]);
    await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
     ['admin.support.'+input.status,JSON.stringify({caseId:id})]);
   }
   return {id,status:input.status,changed};
  });
 }
}
