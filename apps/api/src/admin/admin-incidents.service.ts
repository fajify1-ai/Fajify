import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {PageQuery} from '../customer/customer.dto';
import {AdminCommandService} from './admin-command.service';
function page<T>(rows:T[],q:PageQuery){return {items:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null};}
const incidentFields='id,incident_type AS "incidentType",resource_id AS "resourceId",summary,severity,state,assigned_to AS "assignedTo",created_at AS "createdAt",updated_at AS "updatedAt"';
type IncidentType='booking'|'order'|'ride'|'provider'|'security'|'platform';
type Severity='low'|'medium'|'high'|'critical';
type State='open'|'investigating'|'mitigated'|'resolved';
@Injectable()
export class AdminIncidentService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AdminCommandService)private readonly commands:AdminCommandService){}
 async list(q:PageQuery){
  const r=await this.pool.query(`SELECT ${incidentFields} FROM admin_incidents ORDER BY updated_at DESC,id DESC LIMIT $1 OFFSET $2`,
   [q.limit+1,q.offset]);return page(r.rows,q);
 }
 async create(actor:string,input:{requestKey:string;incidentType:IncidentType;resourceId?:string;summary:string;severity:Severity}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'incident.create',resourceType:'incident',resourceId:input.requestKey,
   payload:input},async c=>{
   if(input.resourceId){
    if(input.incidentType!=='booking'&&input.incidentType!=='order')
     throw new BadRequestException('External incident linkage is not verified for this domain');
    const table=input.incidentType==='booking'?'business_reservations':'business_orders';
    const source=await c.query('SELECT 1 FROM '+table+' WHERE id=$1',[input.resourceId]);
    if(!source.rowCount)throw new NotFoundException('Incident source not found');
   }
   const incident=(await c.query(`INSERT INTO admin_incidents(incident_type,resource_id,summary,severity,created_by)
    VALUES($1,$2,$3,$4,$5) RETURNING ${incidentFields}`,
    [input.incidentType,input.resourceId??null,input.summary.trim(),input.severity,actor])).rows[0];
   if(['high','critical'].includes(input.severity)){
    await c.query('INSERT INTO admin_alerts(incident_id,severity) VALUES($1,$2)',[incident.id,input.severity]);
    await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
     ['admin.incident.'+input.severity,JSON.stringify({incidentId:incident.id,severity:input.severity})]);
   }
   return incident;
  });
 }
 async transition(actor:string,id:string,input:{requestKey:string;state:State;reason:string}){
  return this.commands.execute({actor,requestKey:input.requestKey,operation:'incident.transition',resourceType:'incident',resourceId:id,
   payload:{state:input.state,reason:input.reason},reason:input.reason},async c=>{
   const old=await c.query<{state:State}>('SELECT state FROM admin_incidents WHERE id=$1 FOR UPDATE',[id]);
   if(!old.rowCount)throw new NotFoundException('Incident not found');
   const current=old.rows[0].state;
   if(input.state==='resolved'&&(await c.query('SELECT 1 FROM admin_monitor_signals WHERE incident_id=$1 AND active=true',[id])).rowCount)
    throw new ConflictException('Active monitoring signal must clear before incident resolution');
   const next:Record<State,readonly State[]>={
    open:['investigating','resolved'],investigating:['mitigated','resolved'],
    mitigated:['investigating','resolved'],resolved:['investigating']
   };
   if(current===input.state)return {id,state:current,changed:false};
   if(!next[current].includes(input.state))throw new ConflictException('Illegal incident transition');
   await c.query('UPDATE admin_incidents SET state=$2,updated_at=now() WHERE id=$1',[id,input.state]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
    ['admin.incident.state_changed',JSON.stringify({incidentId:id,state:input.state})]);
   return {id,state:input.state,changed:true};
  });
 }
}
