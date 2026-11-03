import {ApiProperty} from '@nestjs/swagger';
import {Equals,IsUUID,Matches} from 'class-validator';
export class CustomerBookingRideInput {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() reservationId!:string;
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() rideId!:string;
 @ApiProperty({type:String,pattern:'^[A-Za-z0-9_-]{8,100}$'})
 @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
 @ApiProperty({type:Boolean,enum:[true],description:'Explicit consent to associate an existing ride with this reservation. Does not create or pay for a ride.'})
 @Equals(true) consent!:true;
}
export class CustomerBookingRideView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) reservationId!:string;
 @ApiProperty({type:String,format:'uuid'}) rideId!:string;
 @ApiProperty({enum:['active','cancelled']}) status!:'active'|'cancelled';
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) cancelledAt!:string|null;
}
export class CustomerBookingRidePage {
 @ApiProperty({type:()=>[CustomerBookingRideView]}) items!:CustomerBookingRideView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
