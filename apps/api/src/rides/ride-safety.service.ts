import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {RideAreasService} from './ride-areas.service';
@Injectable()
export class RideSafetyService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(RideAreasService)private readonly areas:RideAreasService){}
 async report(subject:string,rideId:string,kind:string,severity:'normal'|'urgent'|'emergency',key:string){
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const ride=await c.query<{customer_subject:string;driver_subject:string|null}>(`SELECT r.customer_subject,d.identity_subject AS driver_subject FROM ride_requests r
      LEFT JOIN ride_drivers d ON d.id=r.assigned_driver_id WHERE r.id=$1 FOR SHARE OF r`,[rideId]);
   if(!ride.rows[0]||![ride.rows[0].customer_subject,ride.rows[0].driver_subject].includes(subject))throw new NotFoundException('Ride unavailable');
   const old=await c.query<{id:string;kind:string;severity:string}>(`SELECT id,kind,severity FROM ride_incidents WHERE ride_id=$1 AND reporter_subject=$2 AND request_key=$3`,[rideId,subject,key]);
   if(old.rows[0]){
    if(old.rows[0].kind!==kind||old.rows[0].severity!==severity)throw new ConflictException('Incident request key reused');
    await c.query('COMMIT');return {id:old.rows[0].id,replayed:true};
   }
   const r=await c.query<{id:string}>(`INSERT INTO ride_incidents(ride_id,reporter_subject,kind,severity,request_key)
      VALUES($1,$2,$3,$4,$5) RETURNING id`,[rideId,subject,kind,severity,key]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)",[severity==='emergency'?'ride.safety.emergency':'ride.safety.incident',JSON.stringify({rideId,incidentId:r.rows[0].id,severity})]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.incident.reported','ride_incident',$2)",[subject,r.rows[0].id]);
   await c.query('COMMIT');return {id:r.rows[0].id,replayed:false};
  }catch(e){await c.query('ROLLBACK');if((e as {code?:string}).code==='23505')throw new ConflictException('Concurrent incident retry');throw e;}finally{c.release();}
 }
 async details(subject:string,id:string){
  const r=await this.pool.query(`SELECT i.id,i.ride_id,i.kind,i.severity,i.status,i.created_at,i.resolved_at
     FROM ride_incidents i JOIN ride_requests ride ON ride.id=i.ride_id
     LEFT JOIN ride_drivers d ON d.id=ride.assigned_driver_id
     WHERE i.id=$1 AND (ride.customer_subject=$2 OR d.identity_subject=$2)
  `,[id,subject]);
  if(!r.rows[0])throw new NotFoundException();return r.rows[0];
 }
 async resolve(actor:string,incidentId:string,areaId:string,next:'investigating'|'resolved'){
  await this.areas.requireDispatcher(actor,areaId);
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const incident=await c.query<{ride_id:string;status:string}>(`SELECT ride_id,status FROM ride_incidents WHERE id=$1 FOR UPDATE`,[incidentId]);
   if(!incident.rows[0])throw new NotFoundException();
   const scope=await c.query(`SELECT 1 FROM ride_requests r JOIN ride_dispatch_areas a ON a.id=$2 AND a.active
    WHERE r.id=$1 AND ST_Intersects(a.boundary,r.pickup::geometry)`,[incident.rows[0].ride_id,areaId]);
   if(!scope.rowCount)throw new ForbiddenException();
   if(incident.rows[0].status==='resolved'||(incident.rows[0].status==='open'&&next==='resolved'))throw new ConflictException('Incident must be investigated first');
   await c.query(`UPDATE ride_incidents SET status=$2,resolved_at=CASE WHEN $2='resolved' THEN now() ELSE null END WHERE id=$1`,[incidentId,next]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_incident',$3)",[actor,'ride.incident.'+next,incidentId]);
   await c.query('COMMIT');return {incidentId,status:next};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
