import {BadRequestException,ForbiddenException,Inject,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AccessService} from '../auth/access.service';
import type {VerifiedIdentity} from '../auth/identity.types';

@Injectable()
export class RideTrackingService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(AccessService)private readonly access:AccessService){}
 async authorize(identity:VerifiedIdentity,rideId:string,areaId?:string){
  const state=await this.access.state(identity.subject);
  if(state.suspended||(state.revokedAfter&&state.revokedAfter.getTime()/1000>=identity.issuedAt)||
     (identity.sessionId&&await this.access.sessionRevoked(identity.subject,identity.sessionId)))
   throw new UnauthorizedException('Session no longer active');
  const r=await this.pool.query<{customer_subject:string;driver_subject:string|null;status:string}>(`SELECT ride.customer_subject,driver.identity_subject AS driver_subject,ride.status
     FROM ride_requests ride LEFT JOIN ride_drivers driver ON driver.id=ride.assigned_driver_id
     WHERE ride.id=$1`,[rideId]);
  if(!r.rows[0])throw new NotFoundException();
  if(r.rows[0].customer_subject===identity.subject||r.rows[0].driver_subject===identity.subject)return r.rows[0];
  if(!areaId||!identity.roles.includes('dispatcher')||!await this.access.member(identity.subject,'dispatch_area',areaId,['dispatcher']))
   throw new NotFoundException();
  const zone=await this.pool.query(`SELECT 1 FROM ride_dispatch_areas zone
     JOIN ride_requests ride ON ride.id=$2 WHERE zone.id=$1 AND zone.active AND ST_Intersects(zone.boundary,ride.pickup::geometry)`,[areaId,rideId]);
  if(!zone.rowCount)throw new NotFoundException();
  return r.rows[0];
 }
 async timeline(identity:VerifiedIdentity,rideId:string,afterId?:string,areaId?:string){
  const permitted=await this.authorize(identity,rideId,areaId);
  if(afterId){
   const cursor=await this.pool.query('SELECT 1 FROM ride_trip_events WHERE id=$1 AND ride_id=$2',[afterId,rideId]);
   if(!cursor.rowCount)throw new BadRequestException('Unknown event cursor');
  }
  const events=await this.pool.query<{id:string;from_state:string;to_state:string;occurred_at:Date}>(`
   SELECT id,from_state,to_state,occurred_at FROM ride_trip_events
   WHERE ride_id=$1 AND ($2::uuid IS NULL OR (occurred_at,id)>(
     SELECT occurred_at,id FROM ride_trip_events WHERE ride_id=$1 AND id=$2::uuid))
   ORDER BY occurred_at,id LIMIT 100`,[rideId,afterId??null]);
  const active=['assigned','driver_arriving','driver_arrived','in_progress'].includes(permitted.status);
  const loc=active?await this.pool.query<{lat:number;lng:number;observed_at:Date}>(`
    SELECT ST_Y(l.position::geometry) AS lat,ST_X(l.position::geometry) AS lng,l.observed_at
    FROM ride_requests r JOIN ride_driver_locations l ON l.driver_id=r.assigned_driver_id
    WHERE r.id=$1 AND l.consent_granted AND l.observed_at>now()-interval '30 seconds'
    `,[rideId]):null;
  return {rideId,status:permitted.status,events:events.rows,
   cursor:events.rows.at(-1)?.id??afterId??null,
   driverLocation:loc?.rows[0]??null};
 }
}
