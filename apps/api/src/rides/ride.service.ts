import {ConflictException, ForbiddenException, Injectable, Inject, NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {assertTripTransition, canOfferRideToDriver, isUsableDriverPosition, type TripState} from './ride-domain';

/** PostgreSQL is authoritative for dispatch; callers must already be identity-verified. */
@Injectable()
export class RideService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}

 async offer(rideId:string,driverId:string,actor:string,expiresAt:Date) {
  // Dispatch authorization is required at the controller boundary before invoking this method.
  if(!actor||!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now())throw new ConflictException('Invalid offer expiry');
  const client=await this.pool.connect();
  try {
   await client.query('BEGIN');
   const ride=await client.query<{status:TripState}>('SELECT status FROM ride_requests WHERE id=$1 FOR UPDATE',[rideId]);
   if(ride.rowCount!==1)throw new NotFoundException('Ride not found');
   if(!['requested','offered'].includes(ride.rows[0].status))throw new ConflictException('Ride not accepting offers');
   const d=await client.query<{approved:boolean;suspended:boolean;vehicle_approved:boolean;expires_at:Date|null;available:boolean;active:boolean}>(`
     SELECT d.status='approved' AS approved,d.status='suspended' AS suspended,
       EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved) AS vehicle_approved,
       (SELECT MIN(expires_at) FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved') AS expires_at,
       d.available, EXISTS(SELECT 1 FROM ride_requests r WHERE r.assigned_driver_id=d.id AND r.status IN ('assigned','driver_arriving','driver_arrived','in_progress')) AS active
     FROM ride_drivers d WHERE d.id=$1 FOR UPDATE`,[driverId]);
   const x=d.rows[0];
   if(!x||!canOfferRideToDriver({approved:x.approved,suspended:x.suspended,vehicleApproved:x.vehicle_approved,documentsExpireAt:x.expires_at,available:x.available,hasActiveAssignment:x.active},new Date()))throw new ForbiddenException('Driver ineligible');
   const offer=await client.query<{id:string}>(`INSERT INTO ride_dispatch_offers(ride_id,driver_id,expires_at)
      VALUES($1,$2,$3) RETURNING id`,[rideId,driverId,expiresAt]);
   if(ride.rows[0].status==='requested')await client.query("UPDATE ride_requests SET status='offered',updated_at=now() WHERE id=$1",[rideId]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.offer.created',$1)",[JSON.stringify({rideId,driverId,offerId:offer.rows[0].id})]);
   await client.query('COMMIT');
   return offer.rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }

 async acceptOffer(offerId:string,driverSubject:string) {
  // Lock ride first, then driver, then offer to maintain a consistent global lock order.
  const client=await this.pool.connect();
  try {
   await client.query('BEGIN');
   const lookup=await client.query<{ride_id:string;driver_id:string}>('SELECT ride_id,driver_id FROM ride_dispatch_offers WHERE id=$1',[offerId]);
   if(lookup.rowCount!==1)throw new NotFoundException('Offer not found');
   const {ride_id,driver_id}=lookup.rows[0];
   const ride=await client.query<{status:TripState}>('SELECT status FROM ride_requests WHERE id=$1 FOR UPDATE',[ride_id]);
   const driver=await client.query<{identity_subject:string;status:string;available:boolean}>('SELECT identity_subject,status,available FROM ride_drivers WHERE id=$1 FOR UPDATE',[driver_id]);
   if(driver.rows[0]?.identity_subject!==driverSubject)throw new ForbiddenException();
   const offer=await client.query<{status:string;expires_at:Date}>('SELECT status,expires_at FROM ride_dispatch_offers WHERE id=$1 FOR UPDATE',[offerId]);
   if(ride.rows[0]?.status!=='offered'||offer.rows[0]?.status!=='pending'||offer.rows[0].expires_at.getTime()<=Date.now())throw new ConflictException('Offer no longer available');
   const eligibility=await client.query<{eligible:boolean}>(`SELECT (
     d.status='approved' AND d.available
     AND EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved)
     AND EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved' AND x.expires_at>now())
     AND NOT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND (x.review_status<>'approved' OR x.expires_at<=now() OR x.expires_at IS NULL))
     AND NOT EXISTS(SELECT 1 FROM ride_requests r WHERE r.assigned_driver_id=d.id AND r.status IN ('assigned','driver_arriving','driver_arrived','in_progress'))
     ) AS eligible FROM ride_drivers d WHERE d.id=$1`,[driver_id]);
   if(!eligibility.rows[0]?.eligible)throw new ForbiddenException('Driver ineligible');
   await client.query("UPDATE ride_requests SET status='assigned',assigned_driver_id=$2,updated_at=now() WHERE id=$1",[ride_id,driver_id]);
   await client.query("UPDATE ride_dispatch_offers SET status='accepted' WHERE id=$1",[offerId]);
   await client.query("UPDATE ride_dispatch_offers SET status='revoked' WHERE ride_id=$1 AND id<>$2 AND status='pending'",[ride_id,offerId]);
   await client.query("INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,$2,'offered','assigned')",[ride_id,driverSubject]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.assigned',$1)",[JSON.stringify({rideId:ride_id,driverId:driver_id})]);
   await client.query('COMMIT');
   return {rideId:ride_id,status:'assigned' as const};
  }catch(e){await client.query('ROLLBACK');if((e as {code?:string}).code==='23505')throw new ConflictException('Concurrent assignment');throw e;}finally{client.release();}
 }

 async transition(rideId:string,actorSubject:string,to:TripState){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const r=await client.query<{status:TripState;identity_subject:string}>(`SELECT r.status,d.identity_subject FROM ride_requests r JOIN ride_drivers d ON d.id=r.assigned_driver_id WHERE r.id=$1 FOR UPDATE OF r`,[rideId]);
   if(r.rowCount!==1)throw new NotFoundException();
   if(r.rows[0].identity_subject!==actorSubject)throw new ForbiddenException();
   try{assertTripTransition(r.rows[0].status,to);}catch{throw new ConflictException('Illegal trip transition');}
   // Driver commands may only advance operational trip states, not override dispatch decisions.
   if(!['driver_arriving','driver_arrived','in_progress','completed'].includes(to))throw new ForbiddenException();
   await client.query('UPDATE ride_requests SET status=$2,updated_at=now() WHERE id=$1',[rideId,to]);
   await client.query('INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,$2,$3,$4)',[rideId,actorSubject,r.rows[0].status,to]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.state.changed',$1)",[JSON.stringify({rideId,to})]);
   await client.query('COMMIT');
   return {rideId,status:to};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }

 async location(subject:string,latitude:number,longitude:number,observedAt:Date,sequence:number,consentGranted:boolean) {
  if(!Number.isSafeInteger(sequence)||sequence<0||!isUsableDriverPosition({latitude,longitude,recordedAt:observedAt,consentGranted},new Date(),30000))throw new ConflictException('Invalid or stale position');
  const result=await this.pool.query(`INSERT INTO ride_driver_locations(driver_id,position,observed_at,sequence,consent_granted)
   SELECT d.id,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,$4,$5,$6
   FROM ride_drivers d WHERE d.identity_subject=$1 AND d.status='approved' AND d.available
   ON CONFLICT(driver_id) DO UPDATE SET position=EXCLUDED.position,observed_at=EXCLUDED.observed_at,sequence=EXCLUDED.sequence,consent_granted=EXCLUDED.consent_granted,updated_at=now()
   WHERE ride_driver_locations.sequence<EXCLUDED.sequence AND ride_driver_locations.observed_at<EXCLUDED.observed_at
   RETURNING driver_id`,[subject,longitude,latitude,observedAt,sequence,consentGranted]);
  if(result.rowCount!==1)throw new ConflictException('Location not accepted');
  return {accepted:true};
 }
}
