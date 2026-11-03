import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {ArrayMaxSize,IsArray,IsIn,IsInt,IsISO8601,IsOptional,IsString,IsUUID,IsNumber,Length,Matches,Max,Min} from 'class-validator';
export class PlanInput {
 @ApiProperty({minLength:1,maxLength:80}) @IsString() @Length(1,80) occasion!:string;
 @ApiProperty({pattern:'^(0|[1-9][0-9]{0,18})$'}) @Matches(/^(0|[1-9][0-9]{0,18})$/) budgetMinor!:string;
 @ApiProperty({pattern:'^[A-Z]{3}$'}) @Matches(/^[A-Z]{3}$/) currency!:string;
 @ApiProperty({minimum:1,maximum:100}) @IsInt() @Min(1) @Max(100) guests!:number;
 @ApiProperty({format:'date-time'}) @IsISO8601({strict:true,strictSeparator:true}) startsAfter!:string;
 @ApiProperty({format:'date-time'}) @IsISO8601({strict:true,strictSeparator:true}) startsBefore!:string;
 @ApiPropertyOptional({maxLength:120}) @IsOptional() @IsString() @Length(1,120) location?:string;
 @ApiPropertyOptional({type:Number,minimum:-90,maximum:90}) @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?:number;
 @ApiPropertyOptional({type:Number,minimum:-180,maximum:180}) @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?:number;
 @ApiPropertyOptional({type:Number,minimum:1,maximum:100}) @IsOptional() @IsInt() @Min(1) @Max(100) radiusKm?:number;
 @ApiPropertyOptional({type:[String],maxItems:8}) @IsOptional() @IsArray() @ArrayMaxSize(8) @IsIn(['service','package','event'],{each:true}) categories?:string[];
}
export class PlanEditInput extends PlanInput {
 @ApiProperty({type:Number,minimum:1}) @IsInt() @Min(1) revision!:number;
}
export class PlanListQuery {
 @ApiPropertyOptional({minimum:1,maximum:50,default:20}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
 @ApiPropertyOptional({minimum:0,maximum:10000,default:0}) @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(10000) offset=0;
}
export class PlanView {
 @ApiProperty() id!:string;
 @ApiProperty() revision!:number;
 @ApiProperty() occasion!:string;
 @ApiProperty() budgetMinor!:string;
 @ApiProperty() currency!:string;
 @ApiProperty() guests!:number;
 @ApiProperty({format:'date-time'}) startsAfter!:string;
 @ApiProperty({format:'date-time'}) startsBefore!:string;
 @ApiPropertyOptional({nullable:true}) location!:string|null;
 @ApiProperty({type:[String]}) categories!:string[];
 @ApiPropertyOptional({type:Number,nullable:true}) latitude!:number|null;
 @ApiPropertyOptional({type:Number,nullable:true}) longitude!:number|null;
 @ApiPropertyOptional({type:Number,nullable:true}) radiusKm!:number|null;
 @ApiProperty({enum:['draft','archived']}) status!:string;
 @ApiProperty({format:'date-time'}) createdAt!:string;
}
export class PlanPage {
 @ApiProperty({type:()=>[PlanView]}) items!:PlanView[];
 @ApiProperty({nullable:true,type:Number}) nextOffset!:number|null;
}
export class RecommendationView {
 @ApiProperty() id!:string;
 @ApiProperty() availabilityId!:string;
 @ApiProperty() businessId!:string;
 @ApiProperty() branchId!:string;
 @ApiProperty() name!:string;
 @ApiProperty() category!:string;
 @ApiProperty() startsAt!:string;
 @ApiProperty() totalMinor!:string;
 @ApiProperty() currency!:string;
 @ApiProperty() score!:number;
 @ApiProperty({type:[String]}) reasons!:string[];
 @ApiProperty({description:'Informational only; revalidate live price, capacity and payment before booking'}) bookingStatus!:string;
}
export class RecommendationPage {
 @ApiProperty({type:()=>[RecommendationView]}) items!:RecommendationView[];
 @ApiProperty() evaluatedAt!:string;
}

export class PlanFeedbackInput {
 @ApiProperty({type:Number,minimum:1,maximum:5}) @IsInt() @Min(1) @Max(5) rating!:number;
 @ApiPropertyOptional({type:String,maxLength:500}) @IsOptional() @IsString() @Length(1,500) comment?:string;
}
export class PlanFeedbackView {
 @ApiProperty() id!:string;
 @ApiProperty() planId!:string;
 @ApiProperty() rating!:number;
 @ApiProperty({nullable:true,type:String}) comment!:string|null;
 @ApiProperty({format:'date-time'}) createdAt!:string;
}

export class PlanBookingInput {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() availabilityId!:string;
 @ApiProperty({type:String,pattern:'^(0|[1-9][0-9]{0,18})$'}) @Matches(/^(0|[1-9][0-9]{0,18})$/) expectedTotalMinor!:string;
 @ApiProperty({type:String,minLength:1,maxLength:120}) @IsString() @Length(1,120) @Matches(/\S/) guestName!:string;
 @ApiProperty({type:String,pattern:'^[A-Za-z0-9_-]{8,100}$'}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
export class PlanBookingHoldView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({type:String,format:'uuid'}) catalogueId!:string;
 @ApiProperty({type:String,format:'uuid'}) availabilityId!:string;
 @ApiProperty({type:String}) amountMinor!:string;
 @ApiProperty({type:String}) currency!:string;
 @ApiProperty({type:Number}) quantity!:number;
 @ApiProperty({enum:['held','confirmed','expired','cancelled','late']}) status!:string;
 @ApiProperty({type:String,format:'date-time'}) expiresAt!:string;
}
