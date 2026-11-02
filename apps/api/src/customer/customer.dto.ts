import {Type} from 'class-transformer';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateNested} from 'class-validator';

export class PageQuery {
  @ApiPropertyOptional({type:Number, default:20, minimum:1, maximum:50})
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
  @ApiPropertyOptional({type:Number, default:0, minimum:0, maximum:10000})
  @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(10000) offset=0;
}
export class DiscoveryQuery extends PageQuery {
  @ApiPropertyOptional({type:String, format:'uuid'}) @IsOptional() @IsUUID() branchId?:string;
  @ApiPropertyOptional({type:String, maxLength:120})
  @IsOptional() @IsString() @Length(1,120) q?:string;
  @ApiPropertyOptional({type:String, description:'Case-insensitive branch address match; not radius search.'})
  @IsOptional() @IsString() @Length(1,120) location?:string;
  @ApiPropertyOptional({enum:['product','service','package','event']})
  @IsOptional() @IsIn(['product','service','package','event']) category?:string;
}
export class CustomerReservationInput {
  @ApiProperty({type:String, pattern:'^[A-Za-z0-9_-]{8,100}$'})
  @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
  @ApiProperty({type:String, format:'uuid'}) @IsUUID() availabilityId!:string;
  @ApiProperty({type:Number, minimum:1, maximum:10000}) @IsInt() @Min(1) @Max(10000) guests!:number;
  @ApiProperty({type:String, minLength:1, maxLength:120}) @IsString() @Length(1,120) @Matches(/\S/) guestName!:string;
}
export class CustomerOrderLine {
  @ApiProperty({type:String, format:'uuid'}) @IsUUID() catalogueId!:string;
  @ApiProperty({type:Number, minimum:1, maximum:10000}) @IsInt() @Min(1) @Max(10000) quantity!:number;
  @ApiProperty({type:String, pattern:'^(0|[1-9][0-9]{0,18})$', description:'Last displayed unit price, in minor units. Server rejects a changed price.'})
  @Matches(/^(0|[1-9][0-9]{0,18})$/) expectedPriceMinor!:string;
}
export class CustomerOrderInput {
  @ApiProperty({type:String, format:'uuid'}) @IsUUID() branchId!:string;
  @ApiProperty({type:String, pattern:'^[A-Za-z0-9_-]{8,100}$'}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
  @ApiProperty({type:()=>[CustomerOrderLine]})
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>CustomerOrderLine) items!:CustomerOrderLine[];
}

// Explicit response DTOs make customer clients usable without exposing SELECT * rows.
export class OfferingView {
  @ApiProperty({type:String}) id!:string;
  @ApiProperty({type:String}) businessId!:string;
  @ApiProperty({type:String}) branchId!:string;
  @ApiProperty({type:String}) businessName!:string;
  @ApiProperty({type:String}) branchName!:string;
  @ApiProperty({type:String, nullable:true}) address!:string|null;
  @ApiProperty({type:String}) name!:string;
  @ApiProperty({type:String, nullable:true}) description!:string|null;
  @ApiProperty({enum:['product','service','package','event']}) category!:string;
  @ApiProperty({type:String, description:'Integer minor units; string preserves bigint precision.'}) priceMinor!:string;
  @ApiProperty({type:String}) currency!:string;
}
export class OfferingPage {
  @ApiProperty({type:()=>[OfferingView]}) items!:OfferingView[];
  @ApiProperty({type:Number, nullable:true}) nextOffset!:number|null;
}
export class SlotView {
  @ApiProperty({type:String}) id!:string;
  @ApiProperty({type:String}) catalogueId!:string;
  @ApiProperty({type:String, format:'date-time'}) startsAt!:string;
  @ApiProperty({type:String, format:'date-time'}) endsAt!:string;
  @ApiProperty({type:Number}) remaining!:number;
}
export class SlotPage {
  @ApiProperty({type:()=>[SlotView]}) items!:SlotView[];
  @ApiProperty({type:Number, nullable:true}) nextOffset!:number|null;
}
export class ReservationView {
  @ApiProperty({type:String}) id!:string;
  @ApiProperty({type:String}) businessId!:string;
  @ApiProperty({type:String}) branchId!:string;
  @ApiProperty({type:String}) availabilityId!:string;
  @ApiProperty({type:Number}) guests!:number;
  @ApiProperty({type:String, nullable:true}) guestName!:string|null;
  @ApiProperty({enum:['confirmed','checked_in','completed','cancelled']}) status!:string;
  @ApiProperty({type:String, format:'date-time'}) createdAt!:string;
}
export class ReservationPage {
  @ApiProperty({type:()=>[ReservationView]}) items!:ReservationView[];
  @ApiProperty({type:Number, nullable:true}) nextOffset!:number|null;
}
export class OrderView {
  @ApiProperty({type:String}) id!:string;
  @ApiProperty({type:String}) businessId!:string;
  @ApiProperty({type:String}) branchId!:string;
  @ApiProperty({enum:['placed','accepted','preparing','ready','fulfilled','cancelled']}) status!:string;
  @ApiProperty({type:String}) totalMinor!:string;
  @ApiProperty({type:String}) currency!:string;
  @ApiProperty({type:String, format:'date-time'}) createdAt!:string;
}
export class OrderPage {
  @ApiProperty({type:()=>[OrderView]}) items!:OrderView[];
  @ApiProperty({type:Number, nullable:true}) nextOffset!:number|null;
}
export class OrderItemView {
  @ApiProperty({type:String}) catalogueId!:string;
  @ApiProperty({type:Number}) quantity!:number;
  @ApiProperty({type:String}) unitPriceMinor!:string;
}
export class OrderDetail extends OrderView {
  @ApiProperty({type:()=>[OrderItemView]}) items!:OrderItemView[];
}
