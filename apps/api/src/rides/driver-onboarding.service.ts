import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
@Injectable()
export class DriverOnboardingService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async register(subject:string,category:string,registration:string){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const d=await client.query<{id:string}>(`INSERT INTO ride_drivers(identity_subject)
      VALUES($1) ON CONFLICT(identity_subject) DO UPDATE SET updated_at=ride_drivers.updated_at
      RETURNING id`,[subject]);
   const driverId=d.rows[0].id;
   const driver=await client.query<{status:string}>(`SELECT status FROM ride_drivers WHERE id=$1 FOR UPDATE`,[driverId]);
   if(driver.rows[0].status==='suspended')throw new ForbiddenException('Driver suspended');
   const vehicle=await client.query<{id:string}>(`INSERT INTO ride_vehicles(driver_id,category,registration)
       VALUES($1,$2,$3) ON CONFLICT(registration) DO NOTHING RETURNING id`,[driverId,category,registration]);
   if(vehicle.rowCount!==1){
    const existing=await client.query<{id:string;driver_id:string;category:string}>(`SELECT id,driver_id,category FROM ride_vehicles WHERE registration=$1`,[registration]);
    if(existing.rows[0]?.driver_id!==driverId||existing.rows[0].category!==category)
     throw new ConflictException('Vehicle registration belongs to a different driver or category');
    vehicle.rows.push({id:existing.rows[0].id});
   }
   await client.query("INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,'ride.driver.registration','ride_driver',$2)",[subject,driverId]);
   await client.query('COMMIT');
   return {driverId,vehicleId:vehicle.rows[0].id,status:driver.rows[0].status};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async status(subject:string) {
  const result=await this.pool.query(`SELECT id,status,available FROM ride_drivers WHERE identity_subject=$1`,[subject]);
  if(!result.rows[0])throw new NotFoundException();
  return result.rows[0];
 }
 async decide(adminSubject:string,driverId:string,approve:boolean){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const d=await client.query<{status:string}>(`SELECT status FROM ride_drivers WHERE id=$1 FOR UPDATE`,[driverId]);
   if(!d.rows[0])throw new NotFoundException();
   if(!['pending','rejected','approved'].includes(d.rows[0].status))throw new ConflictException('Suspended driver requires a separate reinstatement');
   if(approve){
    const valid=await client.query<{allowed:boolean}>(`SELECT
     EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=$1 AND v.approved) AND
     EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=$1 AND x.review_status='approved' AND x.expires_at>now()) AND
     NOT EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=$1 AND (x.review_status<>'approved' OR x.expires_at IS NULL OR x.expires_at<=now())) AS allowed`,[driverId]);
    if(!valid.rows[0]?.allowed)throw new ConflictException('Vehicle and current documents must be approved');
   }
   const status=approve?'approved':'rejected';
   await client.query(`UPDATE ride_drivers SET status=$2,available=false,updated_at=now() WHERE id=$1`,[driverId,status]);
   await client.query(`INSERT INTO audit_events(actor_subject,action,resource_type,resource_id) VALUES($1,$2,'ride_driver',$3)`,[adminSubject,approve?'ride.driver.approved':'ride.driver.rejected',driverId]);
   await client.query('COMMIT');return {driverId,status};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
