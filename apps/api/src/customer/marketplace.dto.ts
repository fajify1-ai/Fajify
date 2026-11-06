import {Type} from 'class-transformer';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {ArrayMaxSize, IsArray, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, IsUrl, Length, Matches, Max, Min, ValidateNested} from 'class-validator';
import {DiscoveryQuery, OfferingView, PageQuery} from './customer.dto';

export class VenueQuery extends DiscoveryQuery {
 @ApiPropertyOptional({type:Number}) @IsOptional() @Type(()=>Number) @IsNumber() @Min(-90) @Max(90) latitude?:number;
 @ApiPropertyOptional({type:Number}) @IsOptional() @Type(()=>Number) @IsNumber() @Min(-180) @Max(180) longitude?:number;
 @ApiPropertyOptional({type:Number,default:10,minimum:1,maximum:100}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) radiusKm?:number;
}
export class PlanQuery extends VenueQuery {
 @ApiPropertyOptional({type:String}) @IsOptional() @Matches(/^(0|[1-9][0-9]{0,18})$/) minBudgetMinor?:string;
 @ApiPropertyOptional({type:String}) @IsOptional() @Matches(/^(0|[1-9][0-9]{0,18})$/) maxBudgetMinor?:string;
 @ApiPropertyOptional({type:String,default:'NGN'}) @Matches(/^[A-Z]{3}$/) currency='NGN';
 @ApiPropertyOptional({type:Number,default:1}) @Type(()=>Number) @IsInt() @Min(1) @Max(10000) guests=1;
 @ApiPropertyOptional({type:String,format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) startsAt?:string;
}
export class PublicProfileInput {
 @ApiProperty({type:String,maxLength:2000}) @IsString() @Length(0,2000) summary!:string;
 @ApiProperty({type:String,maxLength:120}) @IsString() @Length(0,120) city!:string;
 @ApiPropertyOptional({type:String,nullable:true}) @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{5,40}$/) publicPhone?:string|null;
 @ApiPropertyOptional({type:Number,nullable:true}) @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?:number|null;
 @ApiPropertyOptional({type:Number,nullable:true}) @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?:number|null;
}
export class MediaInput {
 @ApiProperty({type:String,format:'uri'}) @IsUrl({protocols:['https'],require_protocol:true,require_tld:true,allow_fragments:false,allow_query_components:true,disallow_auth:true}) @Length(1,2048) url!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,160) @Matches(/\S/) alt!:string;
}
export class MediaReplacement {
 @ApiPropertyOptional({type:String,format:'uuid'}) @IsOptional() @IsUUID() catalogueId?:string;
 @ApiProperty({type:()=>[MediaInput],maxItems:20}) @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>MediaInput) items!:MediaInput[];
}
export class AddonInput {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() catalogueId!:string;
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) maxQuantity!:number;
}
export class PackagePublicInput {
 @ApiProperty({enum:['per_group','per_guest']}) @IsIn(['per_group','per_guest']) pricingModel!:'per_group'|'per_guest';
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) minGuests!:number;
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) maxGuests!:number;
 @ApiProperty({type:()=>[AddonInput],maxItems:20}) @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>AddonInput) addOns!:AddonInput[];
}
export class QuoteAddon {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() catalogueId!:string;
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) quantity!:number;
}
export class PlanQuoteInput {
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) guests!:number;
 @ApiPropertyOptional({type:String,format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) startsAt?:string;
 @ApiProperty({type:()=>[QuoteAddon],maxItems:20}) @IsArray() @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>QuoteAddon) addOns!:QuoteAddon[];
}
export class PublicMediaView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String,format:'uri'}) url!:string;
 @ApiProperty({type:String}) alt!:string;
 @ApiProperty({type:Number}) position!:number;
}
export class VenueView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) businessId!:string;
 @ApiProperty({type:String}) businessName!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String,nullable:true}) address!:string|null;
 @ApiProperty({type:String}) timezone!:string;
 @ApiProperty({type:String}) summary!:string;
 @ApiProperty({type:String}) city!:string;
 @ApiProperty({type:String,nullable:true}) publicPhone!:string|null;
 @ApiProperty({type:Number,nullable:true}) latitude!:number|null;
 @ApiProperty({type:Number,nullable:true}) longitude!:number|null;
 @ApiProperty({type:Number,nullable:true}) distanceKm!:number|null;
 @ApiProperty({type:String,description:'Average of visible verified reviews, decimal string.'}) rating!:string;
 @ApiProperty({type:Number}) reviewCount!:number;
}
export class VenuePage {
 @ApiProperty({type:()=>[VenueView]}) items!:VenueView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class BranchHoursView {
 @ApiProperty({type:Number}) weekday!:number;
 @ApiProperty({type:Number}) opensMinute!:number;
 @ApiProperty({type:Number}) closesMinute!:number;
}
export class VenueDetail extends VenueView {
 @ApiProperty({type:()=>[PublicMediaView]}) media!:PublicMediaView[];
 @ApiProperty({type:()=>[BranchHoursView]}) hours!:BranchHoursView[];
}
export class EventView {
 @ApiProperty({type:String,format:'date-time'}) startsAt!:string;
 @ApiProperty({type:String,format:'date-time'}) endsAt!:string;
 @ApiProperty({type:Number}) maxGuests!:number;
}
export class PackageComponentView {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) category!:string;
 @ApiProperty({type:Number}) quantity!:number;
}
export class PackageAddonView {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) category!:string;
 @ApiProperty({type:Number}) maxQuantity!:number;
 @ApiProperty({type:String}) priceMinor!:string;
 @ApiProperty({type:String}) currency!:string;
}
export class PackageView {
 @ApiProperty({enum:['per_group','per_guest']}) pricingModel!:string;
 @ApiProperty({type:Number}) minGuests!:number;
 @ApiProperty({type:Number}) maxGuests!:number;
 @ApiProperty({type:()=>[PackageComponentView]}) components!:PackageComponentView[];
 @ApiProperty({type:()=>[PackageAddonView]}) addOns!:PackageAddonView[];
}
export class OfferingDetail extends OfferingView {
 @ApiProperty({type:()=>[PublicMediaView]}) media!:PublicMediaView[];
 @ApiProperty({type:()=>EventView,nullable:true}) event!:EventView|null;
 @ApiProperty({type:()=>PackageView,nullable:true}) package!:PackageView|null;
 @ApiProperty({type:Boolean}) customerReservationEnabled!:boolean;
 @ApiProperty({type:Boolean}) customerOrderEnabled!:boolean;
}
export class PlanView extends OfferingView {
 @ApiProperty({enum:['per_group','per_guest']}) pricingModel!:string;
 @ApiProperty({type:Number}) minGuests!:number;
 @ApiProperty({type:Number}) maxGuests!:number;
 @ApiProperty({type:String}) groupTotalMinor!:string;
}
export class PlanPage {
 @ApiProperty({type:()=>[PlanView]}) items!:PlanView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class QuoteLineView {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:Number}) quantity!:number;
 @ApiProperty({type:String}) unitPriceMinor!:string;
 @ApiProperty({type:String}) totalMinor!:string;
}
export class PlanQuoteView {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:Number}) guests!:number;
 @ApiProperty({type:String}) baseMinor!:string;
 @ApiProperty({type:String}) totalMinor!:string;
 @ApiProperty({type:String}) currency!:string;
 @ApiProperty({type:()=>[QuoteLineView]}) addOns!:QuoteLineView[];
 @ApiProperty({type:Boolean,description:'Always false: quotes do not create capacity holds.'}) capacityHeld!:boolean;
 @ApiProperty({type:Boolean,description:'Always false until M5 paid checkout is integrated.'}) checkoutEnabled!:boolean;
}
export class MediaPage { @ApiProperty({type:()=>[PublicMediaView]}) items!:PublicMediaView[]; }
export class ChangedView { @ApiProperty({type:Boolean}) changed!:boolean; }
export class CategoryView {
 @ApiProperty({enum:['product','service','package','event']}) id!:string;
 @ApiProperty({type:String}) name!:string;
}
export class CategoriesView { @ApiProperty({type:()=>[CategoryView]}) items!:CategoryView[]; }
export {PageQuery};
