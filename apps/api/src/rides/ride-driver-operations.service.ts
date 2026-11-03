import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';

@Injectable()
export class RideDriverOperations {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 private async tx<T>(work:(c:import('pg').PoolClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();try{
   await c.query('BEGIN');const result=await work(c);await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async document(subject:string,kind:string,key:string,expiresAt:Date){
  return this.tx(async c=>{
   const d=await c.query<{id:string;status:string}>('SELECT id,status FROM ride_drivers WHERE identity_subject=$1 FOR UPDATE',[subject]);
   if(!d.rows[0]||d.rows[0].status==='suspended')throw new ForbiddenException('Driver unavailable');
   const id=d.rows[0].id;
   if(!key.startsWith('private/ride-drivers/'+id+'/'+kind+'/')||
     !/^[A-Za-z0-9_./-]{40,250}$/.test(key)||key.includes('..')||expiresAt.getTime()<=Date.now())
     throw new ConflictException('Invalid private document reference or expiry');
   const r=await c.query<{id:string}>(`INSERT INTO ride_driver_documents(driver_id,document_kind,private_object_key,review_status,expires_at)
      VALUES($1,$2,$3,'pending',$4)
      ON CONFLICT(driver_id,document_kind) DO UPDATE SET private_object_key=EXCLUDED.private_object_key,
      review_status='pending',expires_at=EXCLUDED.expires_at RETURNING id`,[id,kind,key,expiresAt]);
   await c.query("UPDATE ride_drivers SET available=false,updated_at=now() WHERE id=$1",[id]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.document.submitted','ride_driver_document',$2)",[subject,r.rows[0].id]);
   return {id:r.rows[0].id,status:'pending'};
  });
 }
 async reviewDocument(actor:string,documentId:string,approve:boolean){
  return this.tx(async c=>{
   const row=await c.query<{driver_id:string;expires_at:Date|null}>(`SELECT driver_id,expires_at FROM ride_driver_documents WHERE id=$1 FOR UPDATE`,[documentId]);
   if(!row.rows[0])throw new NotFoundException();
   if(approve&&(!row.rows[0].expires_at||row.rows[0].expires_at.getTime()<=Date.now()))throw new ConflictException('Document already expired');
   await c.query("UPDATE ride_driver_documents SET review_status=$2 WHERE id=$1",[documentId,approve?'approved':'rejected']);
   await c.query('UPDATE ride_drivers SET available=false,updated_at=now() WHERE id=$1',[row.rows[0].driver_id]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_driver_document',$3)",[actor,approve?'ride.document.approved':'ride.document.rejected',documentId]);
   return {documentId,status:approve?'approved':'rejected'};
  });
 }
 async reviewVehicle(actor:string,vehicleId:string,approved:boolean){
  return this.tx(async c=>{
   const r=await c.query<{driver_id:string}>('SELECT driver_id FROM ride_vehicles WHERE id=$1 FOR UPDATE',[vehicleId]);
   if(!r.rows[0])throw new NotFoundException();
   await c.query('UPDATE ride_vehicles SET approved=$2 WHERE id=$1',[vehicleId,approved]);
   await c.query('UPDATE ride_drivers SET available=false,updated_at=now() WHERE id=$1',[r.rows[0].driver_id]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_vehicle',$3)",[actor,approved?'ride.vehicle.approved':'ride.vehicle.rejected',vehicleId]);
   return {vehicleId,approved};
  });
 }
 async availability(subject:string,available:boolean){
  return this.tx(async c=>{
   const d=await c.query<{id:string;status:string}>('SELECT id,status FROM ride_drivers WHERE identity_subject=$1 FOR UPDATE',[subject]);
   if(!d.rows[0])throw new NotFoundException();
   const id=d.rows[0].id;
   if(available){
    if(d.rows[0].status!=='approved')throw new ForbiddenException('Unapproved driver');
    const check=await c.query<{eligible:boolean}>(`SELECT
      EXISTS(SELECT 1 FROM ride_vehicles WHERE driver_id=$1 AND approved)
      AND EXISTS(SELECT 1 FROM ride_driver_documents WHERE driver_id=$1 AND review_status='approved' AND expires_at>now())
      AND NOT EXISTS(SELECT 1 FROM ride_driver_documents WHERE driver_id=$1 AND (review_status<>'approved' OR expires_at IS NULL OR expires_at<=now()))
      AND NOT EXISTS(SELECT 1 FROM ride_requests WHERE assigned_driver_id=$1 AND status IN ('assigned','driver_arriving','driver_arrived','in_progress')) AS eligible`,[id]);
    if(!check.rows[0]?.eligible)throw new ConflictException('Driver has invalid documents, vehicle or active trip');
   }
   await c.query('UPDATE ride_drivers SET available=$2,updated_at=now() WHERE id=$1',[id,available]);
   if(!available)await c.query('DELETE FROM ride_driver_locations WHERE driver_id=$1',[id]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_driver',$3)",[subject,available?'ride.driver.online':'ride.driver.offline',id]);
   return {driverId:id,available};
  });
 }
 async suspend(actor:string,driverId:string,suspend:boolean){
  return this.tx(async c=>{
   const d=await c.query<{status:string}>('SELECT status FROM ride_drivers WHERE id=$1 FOR UPDATE',[driverId]);
   if(!d.rows[0])throw new NotFoundException();
   if(!suspend&&d.rows[0].status!=='suspended')throw new ConflictException('Driver is not suspended');
   await c.query("UPDATE ride_drivers SET status=$2,available=false,updated_at=now() WHERE id=$1",[driverId,suspend?'suspended':'pending']);
   await c.query('DELETE FROM ride_driver_locations WHERE driver_id=$1',[driverId]);
   await c.query("UPDATE ride_dispatch_offers SET status='revoked' WHERE driver_id=$1 AND status='pending'",[driverId]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_driver',$3)",[actor,suspend?'ride.driver.suspended':'ride.driver.review_reopened',driverId]);
   return {driverId,status:suspend?'suspended':'pending'};
  });
 }
 async bankReference(subject:string,reference:string){
  return this.tx(async c=>{
   const driver=await c.query<{id:string}>('SELECT id FROM ride_drivers WHERE identity_subject=$1 FOR UPDATE',[subject]);
   if(!driver.rows[0])throw new NotFoundException();
   await c.query(`INSERT INTO ride_driver_bank_refs(driver_id,payout_recipient_ref,verified)
    VALUES($1,$2,false) ON CONFLICT(driver_id) DO UPDATE SET payout_recipient_ref=EXCLUDED.payout_recipient_ref,verified=false,updated_at=now()`,[driver.rows[0].id,reference]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.payout_reference.updated','ride_driver',$2)",[subject,driver.rows[0].id]);
   return {driverId:driver.rows[0].id,verified:false};
  });
 }
 async verifyBankReference(actor:string,driverId:string,reference:string){
  return this.tx(async c=>{
   const r=await c.query('UPDATE ride_driver_bank_refs SET verified=true,updated_at=now() WHERE driver_id=$1 AND payout_recipient_ref=$2 RETURNING driver_id',[driverId,reference]);
   if(!r.rowCount)throw new ConflictException('Payout recipient changed or not found');
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.payout_reference.verified','ride_driver',$2)",[actor,driverId]);
   return {driverId,verified:true};
  });
 }
}
