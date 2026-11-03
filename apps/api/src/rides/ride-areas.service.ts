import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AccessService} from '../auth/access.service';

@Injectable()
export class RideAreasService {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool,@Inject(AccessService) private readonly access:AccessService){}
 async requireDispatcher(subject:string,areaId:string) {
  if(!await this.access.member(subject,'dispatch_area',areaId,['dispatcher']))throw new ForbiddenException('No active dispatch-area membership');
  const zone=await this.pool.query('SELECT 1 FROM ride_dispatch_areas WHERE id=$1 AND active=true',[areaId]);
  if(!zone.rowCount)throw new ForbiddenException('Dispatch area unavailable');
 }
 async create(subject:string,name:string,geojson:string){
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const geo=await c.query<{valid:boolean;type:string;vertices:number}>(`SELECT ST_IsValid(g.geom) AS valid,ST_GeometryType(g.geom) AS type, ST_NPoints(g.geom)::integer AS vertices
   FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS geom) g`,[geojson]);
   if(!geo.rows[0]?.valid||!['ST_Polygon','ST_MultiPolygon'].includes(geo.rows[0].type)||geo.rows[0].vertices>500)
    throw new BadRequestException('Invalid area polygon');
   const result=await c.query<{id:string}>(`INSERT INTO ride_dispatch_areas(name,boundary)
   VALUES($1,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2),4326))) RETURNING id`,[name,geojson]);
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.area.created','ride_dispatch_area',$2)",[subject,result.rows[0].id]);
   await c.query('COMMIT');return {id:result.rows[0].id,active:false};
  }catch(e){await c.query('ROLLBACK');if((e as {code?:string}).code==='23505')throw new ConflictException('Duplicate dispatch area');throw e;}finally{c.release();}
 }
 async setActive(subject:string,areaId:string,active:boolean){
  const c=await this.pool.connect();try{
   await c.query('BEGIN');
   const r=await c.query('UPDATE ride_dispatch_areas SET active=$2 WHERE id=$1 RETURNING id',[areaId,active]);
   if(!r.rowCount)throw new NotFoundException();
   await c.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_dispatch_area',$3)",[subject,active?'ride.area.activated':'ride.area.deactivated',areaId]);
   await c.query('COMMIT');return {areaId,active};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async monitor(subject:string,areaId:string,limit=50){
  await this.requireDispatcher(subject,areaId);
  const r=await this.pool.query(`SELECT ride.id,ride.status,ride.category,ride.created_at,
   ride.assigned_driver_id,
   ST_Y(ride.pickup::geometry) AS pickup_lat,ST_X(ride.pickup::geometry) AS pickup_lng,
   (SELECT count(*)::int FROM ride_incidents i WHERE i.ride_id=ride.id AND i.status<>'resolved') AS open_incidents
   FROM ride_requests ride JOIN ride_dispatch_areas area ON area.id=$1 AND area.active
   WHERE ride.status IN ('requested','offered','assigned','driver_arriving','driver_arrived','in_progress')
     AND ST_Intersects(area.boundary,ride.pickup::geometry)
   ORDER BY ride.created_at DESC LIMIT $2`,[areaId,limit]);
  return {areaId,rides:r.rows};
 }
 async candidates(subject:string,areaId:string,rideId:string,limit:number){
  await this.requireDispatcher(subject,areaId);
  const rows=await this.pool.query<{driver_id:string;metres:number}>(`SELECT d.id AS driver_id,
    ST_Distance(l.position,r.pickup) AS metres
   FROM ride_requests r
   JOIN ride_dispatch_areas a ON a.id=$1 AND a.active
   JOIN ride_driver_locations l ON l.consent_granted=true AND l.observed_at>now()-interval '30 seconds'
   JOIN ride_drivers d ON d.id=l.driver_id AND d.status='approved' AND d.available=true
   JOIN account_access account ON account.identity_subject=d.identity_subject AND account.suspended=false
   JOIN user_profiles profile ON profile.identity_subject=d.identity_subject AND profile.suspended=false
   WHERE r.id=$2 AND r.status IN ('requested','offered') AND ST_Intersects(a.boundary,r.pickup::geometry)
      AND ST_Intersects(a.boundary,l.position::geometry)
      AND ST_DWithin(l.position,r.pickup,20000)
      AND EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved AND v.category=r.category)
      AND EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved' AND x.expires_at>now())
      AND NOT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND (x.review_status<>'approved' OR x.expires_at IS NULL OR x.expires_at<=now()))
      AND EXISTS(SELECT 1 FROM resource_memberships m WHERE m.identity_subject=d.identity_subject AND m.resource_type='dispatch_area' AND m.resource_id=a.id AND m.role='driver' AND m.active)
      AND NOT EXISTS(SELECT 1 FROM ride_requests other WHERE other.assigned_driver_id=d.id AND other.status IN ('assigned','driver_arriving','driver_arrived','in_progress'))
   ORDER BY l.position <-> r.pickup LIMIT $3`,[areaId,rideId,limit]);
  return {rideId,areaId,candidates:rows.rows.map(d=>({driverId:d.driver_id,distanceMetres:Math.round(d.metres)}))};
 }
}
