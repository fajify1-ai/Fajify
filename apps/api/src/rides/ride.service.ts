import {ConflictException, ForbiddenException, Injectable, Inject, NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {assertTripTransition, canOfferRideToDriver, isUsableDriverPosition, type TripState} from './ride-domain';

/** PostgreSQL is authoritative for dispatch; callers must already be identity-verified. */
@Injectable()
export class RideService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}

 async offer(rideId:string,driverId:string,actor:string,expiresAt:Date,areaId:string) {
  // Dispatch authorization is required at the controller boundary before invoking this method.
  if(!actor||!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now())throw new ConflictException('Invalid offer expiry');
  const client=await this.pool.connect();
  try {
   await client.query('BEGIN');
   const ride=await client.query<{status:TripState;dispatch_generation:string}>('SELECT status,dispatch_generation FROM ride_requests WHERE id=$1 FOR UPDATE',[rideId]);
   if(ride.rowCount!==1)throw new NotFoundException('Ride not found');
   if(!['requested','offered'].includes(ride.rows[0].status))throw new ConflictException('Ride not accepting offers');
   const zone=await client.query("SELECT 1 FROM ride_dispatch_areas a JOIN ride_requests r ON r.id=$2 WHERE a.id=$1 AND a.active AND ST_Intersects(a.boundary,r.pickup::geometry)",[areaId,rideId]);
   if(!zone.rowCount)throw new ForbiddenException('Pickup outside active dispatch area');
   const d=await client.query<{approved:boolean;suspended:boolean;vehicle_approved:boolean;expires_at:Date|null;available:boolean;active:boolean}>(`
     SELECT d.status='approved' AS approved,d.status='suspended' AS suspended,
       EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved) AS vehicle_approved,
       (SELECT MIN(expires_at) FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved') AS expires_at,
       d.available, EXISTS(SELECT 1 FROM ride_requests r WHERE r.assigned_driver_id=d.id AND r.status IN ('assigned','driver_arriving','driver_arrived','in_progress')) AS active
     FROM ride_drivers d WHERE d.id=$1 FOR UPDATE`,[driverId]);
   const x=d.rows[0];
   const documents=await client.query<{valid:boolean}>(`SELECT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=$1 AND x.review_status='approved' AND x.expires_at>now()) AND NOT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=$1 AND (x.review_status<>'approved' OR x.expires_at IS NULL OR x.expires_at<=now())) AS valid`,[driverId]);
   if(!documents.rows[0]?.valid)throw new ForbiddenException('Driver documents ineligible');
   if(!x||!canOfferRideToDriver({approved:x.approved,suspended:x.suspended,vehicleApproved:x.vehicle_approved,documentsExpireAt:x.expires_at,available:x.available,hasActiveAssignment:x.active},new Date()))throw new ForbiddenException('Driver ineligible');
   const eligible=await client.query("SELECT 1 FROM ride_drivers d JOIN account_access acc ON acc.identity_subject=d.identity_subject AND acc.suspended=false JOIN user_profiles p ON p.identity_subject=d.identity_subject AND p.suspended=false JOIN ride_driver_locations l ON l.driver_id=d.id AND l.consent_granted AND l.observed_at>now()-interval '30 seconds' JOIN ride_dispatch_areas a ON a.id=$2 AND a.active JOIN ride_requests r ON r.id=$3 WHERE d.id=$1 AND ST_Intersects(a.boundary,l.position::geometry) AND ST_DWithin(l.position,r.pickup,20000) AND EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved AND v.category=r.category) AND EXISTS(SELECT 1 FROM resource_memberships m WHERE m.identity_subject=d.identity_subject AND m.resource_type='dispatch_area' AND m.resource_id=a.id AND m.role='driver' AND m.active)",[driverId,areaId,rideId]);
   if(!eligible.rowCount)throw new ForbiddenException('Driver outside active eligible coverage');
   const generation=ride.rows[0].status==='requested'?BigInt(ride.rows[0].dispatch_generation)+1n:BigInt(ride.rows[0].dispatch_generation);
   if(ride.rows[0].status==='requested')await client.query("UPDATE ride_requests SET status='offered',dispatch_generation=$2,updated_at=now() WHERE id=$1",[rideId,generation.toString()]);
   const offer=await client.query<{id:string}>("INSERT INTO ride_dispatch_offers(ride_id,driver_id,expires_at,area_id,fence_version) VALUES($1,$2,$3,$4,$5) RETURNING id",[rideId,driverId,expiresAt,areaId,generation.toString()]);
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
   const ride=await client.query<{status:TripState;dispatch_generation:string}>('SELECT status,dispatch_generation FROM ride_requests WHERE id=$1 FOR UPDATE',[ride_id]);
   const driver=await client.query<{identity_subject:string;status:string;available:boolean}>('SELECT identity_subject,status,available FROM ride_drivers WHERE id=$1 FOR UPDATE',[driver_id]);
   if(driver.rows[0]?.identity_subject!==driverSubject)throw new ForbiddenException();
   const offer=await client.query<{status:string;expires_at:Date;fence_version:string;area_id:string}>('SELECT status,expires_at,fence_version,area_id FROM ride_dispatch_offers WHERE id=$1 FOR UPDATE',[offerId]);
   if(ride.rows[0]?.status!=='offered'||offer.rows[0]?.status!=='pending'||offer.rows[0].expires_at.getTime()<=Date.now()||offer.rows[0].fence_version!==ride.rows[0].dispatch_generation)throw new ConflictException('Offer expired or superseded');
   const area=await client.query("SELECT 1 FROM ride_dispatch_areas a JOIN ride_driver_locations l ON l.driver_id=$2 AND l.consent_granted AND l.observed_at>now()-interval '30 seconds' JOIN ride_requests r ON r.id=$3 WHERE a.id=$1 AND a.active AND ST_Intersects(a.boundary,l.position::geometry) AND ST_Intersects(a.boundary,r.pickup::geometry) AND ST_DWithin(l.position,r.pickup,20000)",[offer.rows[0].area_id,driver_id,ride_id]);
   const member=await client.query("SELECT 1 FROM resource_memberships m JOIN account_access a ON a.identity_subject=m.identity_subject AND a.suspended=false JOIN user_profiles p ON p.identity_subject=m.identity_subject AND p.suspended=false WHERE m.identity_subject=$1 AND m.resource_type='dispatch_area' AND m.resource_id=$2 AND m.role='driver' AND m.active",[driverSubject,offer.rows[0].area_id]);
   if(!area.rowCount||!member.rowCount)throw new ForbiddenException('Dispatch-area authorization or GPS eligibility revoked');
   const eligibility=await client.query<{eligible:boolean}>(`SELECT (
     d.status='approved' AND d.available
     AND EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved AND v.category=(SELECT category FROM ride_requests WHERE id=$2))
     AND EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved' AND x.expires_at>now())
     AND NOT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND (x.review_status<>'approved' OR x.expires_at<=now() OR x.expires_at IS NULL))
     AND NOT EXISTS(SELECT 1 FROM ride_requests r WHERE r.assigned_driver_id=d.id AND r.status IN ('assigned','driver_arriving','driver_arrived','in_progress'))
     ) AS eligible FROM ride_drivers d WHERE d.id=$1`,[driver_id,ride_id]);
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
   if(to==='completed'){
    const fare=await client.query(`INSERT INTO ride_fares(ride_id,gross_minor,commission_minor,driver_minor,commission_bps)
      SELECT r.id,r.quote_amount_minor,
       floor(r.quote_amount_minor::numeric*q.commission_bps/10000)::bigint,
       r.quote_amount_minor-floor(r.quote_amount_minor::numeric*q.commission_bps/10000)::bigint,
       q.commission_bps
      FROM ride_requests r JOIN ride_fare_quotes q ON q.id=r.quote_id
      WHERE r.id=$1 AND r.quote_amount_minor>=1 RETURNING ride_id`,[rideId]);
    if(fare.rowCount!==1)throw new ConflictException('Validated booking fare unavailable');
   }
   await client.query('INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,$2,$3,$4)',[rideId,actorSubject,r.rows[0].status,to]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.state.changed',$1)",[JSON.stringify({rideId,to})]);
   await client.query('COMMIT');
   return {rideId,status:to};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }

 async revokeLocation(subject:string){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const driver=await client.query<{id:string}>('SELECT id FROM ride_drivers WHERE identity_subject=$1 FOR UPDATE',[subject]);
   if(!driver.rows[0])throw new NotFoundException('Driver unavailable');
   await client.query('DELETE FROM ride_driver_locations WHERE driver_id=$1',[driver.rows[0].id]);
   await client.query('UPDATE ride_drivers SET available=false,updated_at=now() WHERE id=$1',[driver.rows[0].id]);
   await client.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.location.consent_withdrawn','ride_driver',$2)",[subject,driver.rows[0].id]);
   await client.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.location.revoked',$1)",[JSON.stringify({driverId:driver.rows[0].id})]);
   await client.query('COMMIT');return {consentGranted:false,available:false};
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
