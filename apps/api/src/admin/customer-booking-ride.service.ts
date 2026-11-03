import {ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {CustomerService} from '../customer/customer.service';
import type {PageQuery} from '../customer/customer.dto';
import type {VerifiedIdentity} from '../auth/identity.types';
import type {CustomerBookingRideInput,CustomerBookingRidePage,CustomerBookingRideView} from './customer-booking-ride.dto';

const columns='id,reservation_id AS "reservationId",ride_id AS "rideId",status,created_at AS "createdAt",cancelled_at AS "cancelledAt"';

/** Only associates an existing customer-owned ride with a customer-owned
 * reservation; never calls M7 quote, dispatch, payment or trip mutation.
 */
@Injectable()
export class CustomerBookingRideService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(CustomerService)private readonly customer:CustomerService){}
 async bind(identity:VerifiedIdentity,input:CustomerBookingRideInput):Promise<CustomerBookingRideView>{
  return this.customer.withAccountTransaction(identity,async c=>{
   const prior=await c.query<CustomerBookingRideView>(
    `SELECT ${columns} FROM customer_booking_ride_links WHERE customer_subject=$1 AND request_key=$2`,
    [identity.subject,input.requestKey]);
   if(prior.rowCount){
    if(prior.rows[0].reservationId!==input.reservationId.toLowerCase()||
       prior.rows[0].rideId!==input.rideId.toLowerCase())
     throw new ConflictException('Booking-to-ride key was used for another association');
    return prior.rows[0];
   }
   const reservation=await c.query<{status:string}>(
    'SELECT status FROM business_reservations WHERE id=$1 AND customer_subject=$2 FOR SHARE',
    [input.reservationId,identity.subject]);
   if(!reservation.rowCount)throw new NotFoundException('Reservation not found');
   if(!['confirmed','checked_in','completed'].includes(reservation.rows[0].status))
    throw new ConflictException('Reservation cannot be linked to a ride');
   const ride=await c.query<{status:string}>(
    'SELECT status FROM ride_requests WHERE id=$1 AND customer_subject=$2 FOR SHARE',
    [input.rideId,identity.subject]);
   if(!ride.rowCount)throw new NotFoundException('Owned ride not found');
   if(ride.rows[0].status==='cancelled')throw new ConflictException('Cancelled ride cannot be linked');
   // M7 has no automatic venue destination. A venue without a geocoded public
   // position is intentionally ineligible, never matched by guessed coordinates.
   const destination=await c.query<{valid:boolean}>(`
    SELECT EXISTS (
     SELECT 1 FROM business_reservations r
     JOIN business_branches b ON b.id=r.branch_id AND b.business_id=r.business_id AND b.active
     JOIN business_onboarding m ON m.id=r.business_id AND m.status='approved'
     JOIN business_public_profiles venue ON venue.branch_id=r.branch_id AND venue.business_id=r.business_id
     JOIN ride_requests ride ON ride.id=$2 AND ride.customer_subject=$3
     WHERE r.id=$1 AND r.customer_subject=$3 AND venue.location IS NOT NULL
      AND ST_DWithin(ride.destination,venue.location,250)
    ) AS valid`,[input.reservationId,input.rideId,identity.subject]);
   if(destination.rows[0]?.valid!==true)throw new ConflictException('Ride destination does not match a geocoded booking venue');
   let created;
   try{
    created=await c.query<CustomerBookingRideView>(`
     INSERT INTO customer_booking_ride_links(customer_subject,reservation_id,ride_id,request_key)
     VALUES($1,$2,$3,$4) RETURNING ${columns}`,
     [identity.subject,input.reservationId,input.rideId,input.requestKey]);
   }catch(e){
    if((e as {code?:string}).code==='23505')throw new ConflictException('This booking or ride is already linked');
    throw e;
   }
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
    ['customer.booking_ride.linked',JSON.stringify({linkId:created.rows[0].id,reservationId:input.reservationId,rideId:input.rideId})]);
   return created.rows[0];
  });
 }
 async list(subject:string,q:PageQuery):Promise<CustomerBookingRidePage>{
  const r=await this.pool.query<CustomerBookingRideView>(
   `SELECT ${columns} FROM customer_booking_ride_links WHERE customer_subject=$1
    ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,q.limit+1,q.offset]);
  return {items:r.rows.slice(0,q.limit),nextOffset:r.rows.length>q.limit?q.offset+q.limit:null};
 }
 async unlink(identity:VerifiedIdentity,id:string):Promise<CustomerBookingRideView>{
  return this.customer.withAccountTransaction(identity,async c=>{
   const prior=await c.query<CustomerBookingRideView>(
    `SELECT ${columns} FROM customer_booking_ride_links WHERE id=$1 AND customer_subject=$2 FOR UPDATE`,
    [id,identity.subject]);
   if(!prior.rowCount)throw new NotFoundException('Booking-to-ride link not found');
   if(prior.rows[0].status==='cancelled')return prior.rows[0];
   const updated=await c.query<CustomerBookingRideView>(
    `UPDATE customer_booking_ride_links SET status='cancelled',cancelled_at=now()
      WHERE id=$1 AND customer_subject=$2 RETURNING ${columns}`,[id,identity.subject]);
   await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
    ['customer.booking_ride.unlinked',JSON.stringify({linkId:id})]);
   return updated.rows[0];
  });
 }
}
