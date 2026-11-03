import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';

@Injectable()
export class RideLifecycleOperations {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 private async run<T>(rideId:string,handler:(client:import('pg').PoolClient,ride:{status:string;customer_subject:string;assigned_driver_id:string|null})=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const r=await c.query<{status:string;customer_subject:string;assigned_driver_id:string|null}>('SELECT status,customer_subject,assigned_driver_id FROM ride_requests WHERE id=$1 FOR UPDATE',[rideId]);
   if(!r.rows[0])throw new NotFoundException();
   const out=await handler(c,r.rows[0]);await c.query('COMMIT');return out;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async customerCancel(subject:string,rideId:string){
  return this.run(rideId,async(c,r)=>{
   if(r.customer_subject!==subject)throw new NotFoundException();
   if(r.status==='cancelled')return {rideId,status:'cancelled',replayed:true};
   if(!['requested','offered','assigned','driver_arriving'].includes(r.status))throw new ConflictException('Ride cannot be cancelled automatically');
   const paid=await c.query("SELECT 1 FROM ride_fares WHERE ride_id=$1 AND payment_state='verified'",[rideId]);
   if(paid.rowCount)throw new ConflictException('Refund/reconciliation required before cancellation');
   await c.query("UPDATE ride_requests SET status='cancelled',assigned_driver_id=NULL,dispatch_generation=dispatch_generation+1,updated_at=now() WHERE id=$1",[rideId]);
   await c.query("UPDATE ride_dispatch_offers SET status='revoked' WHERE ride_id=$1 AND status IN ('pending','accepted')",[rideId]);
   await c.query("INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,$2,$3,'cancelled')",[rideId,subject,r.status]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.cancelled',$1)",[JSON.stringify({rideId})]);
   return {rideId,status:'cancelled',replayed:false};
  });
 }
 async reassign(actor:string,rideId:string,areaId:string){
  return this.run(rideId,async(c,r)=>{
   if(!['assigned','driver_arriving'].includes(r.status))throw new ConflictException('Trip cannot be reassigned after driver arrival');
   const scope=await c.query("SELECT 1 FROM ride_dispatch_areas a JOIN ride_requests r ON r.id=$2 WHERE a.id=$1 AND a.active AND ST_Intersects(a.boundary,r.pickup::geometry)",[areaId,rideId]);
   if(!scope.rowCount)throw new ForbiddenException('Ride outside assigned dispatch area');
   await c.query("UPDATE ride_requests SET status='requested',assigned_driver_id=NULL,dispatch_generation=dispatch_generation+1,updated_at=now() WHERE id=$1",[rideId]);
   await c.query("UPDATE ride_dispatch_offers SET status='revoked' WHERE ride_id=$1 AND status IN ('accepted','pending')",[rideId]);
   await c.query("INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,$2,$3,'requested')",[rideId,actor,r.status]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.dispatch.reassigned','ride_request',$2)",[actor,rideId]);
   await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.dispatch.requeue',$1)",[JSON.stringify({rideId})]);
   return {rideId,status:'requested'};
  });
 }
}
