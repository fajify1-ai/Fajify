import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min} from 'class-validator';
import {OfferingView} from './customer.dto';

export class ProfileInput {
 @ApiProperty({type:String,minLength:1,maxLength:120}) @IsString() @Length(1,120) @Matches(/\S/) displayName!:string;
}
export class ProfileView {
 @ApiProperty({type:String}) displayName!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}
export class ReviewInput {
 @ApiProperty({type:Number,minimum:1,maximum:5}) @IsInt() @Min(1) @Max(5) rating!:number;
 @ApiProperty({type:String,minLength:1,maxLength:2000}) @IsString() @Length(1,2000) @Matches(/\S/) body!:string;
}
export class ReviewView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:Number}) rating!:number;
 @ApiProperty({type:String}) body!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,description:'Privacy-preserving label, not account identity.'}) author!:string;
}
export class ReviewPage {
 @ApiProperty({type:()=>[ReviewView]}) items!:ReviewView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class PrivateReviewView extends ReviewView {
 @ApiProperty({type:String}) branchId!:string;
 @ApiProperty({type:String,nullable:true}) reservationId!:string|null;
 @ApiProperty({type:String,nullable:true}) orderId!:string|null;
 @ApiProperty({type:Boolean}) withdrawn!:boolean;
 @ApiProperty({enum:['visible','hidden']}) moderationStatus!:string;
}
export class PrivateReviewPage {
 @ApiProperty({type:()=>[PrivateReviewView]}) items!:PrivateReviewView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class WishlistView extends OfferingView {
 @ApiProperty({type:String,format:'date-time'}) savedAt!:string;
}
export class WishlistPage {
 @ApiProperty({type:()=>[WishlistView]}) items!:WishlistView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class NotificationView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({enum:['reservation','order']}) resourceType!:string;
 @ApiProperty({type:String}) resourceId!:string;
 @ApiProperty({type:String}) status!:string;
 @ApiProperty({type:String}) title!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) readAt!:string|null;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}
export class NotificationPage {
 @ApiProperty({type:()=>[NotificationView]}) items!:NotificationView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class UnreadView { @ApiProperty({type:Number}) unread!:number; }
export class SupportInput {
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
 @ApiProperty({enum:['reservation','order','account','other']}) @IsIn(['reservation','order','account','other']) category!:'reservation'|'order'|'account'|'other';
 @ApiPropertyOptional({type:String,format:'uuid'}) @IsOptional() @IsUUID() resourceId?:string;
 @ApiProperty({type:String,minLength:1,maxLength:160}) @IsString() @Length(1,160) @Matches(/\S/) subject!:string;
 @ApiProperty({type:String,minLength:1,maxLength:4000}) @IsString() @Length(1,4000) @Matches(/\S/) message!:string;
}
export class SupportMessageInput {
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
 @ApiProperty({type:String,minLength:1,maxLength:4000}) @IsString() @Length(1,4000) @Matches(/\S/) message!:string;
}
export class SupportCaseView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) category!:string;
 @ApiProperty({type:String,nullable:true}) resourceId!:string|null;
 @ApiProperty({type:String}) subject!:string;
 @ApiProperty({enum:['open','closed']}) status!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,format:'date-time'}) updatedAt!:string;
}
export class SupportCasePage {
 @ApiProperty({type:()=>[SupportCaseView]}) items!:SupportCaseView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class SupportMessageView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) body!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}
export class SupportMessagePage {
 @ApiProperty({type:()=>[SupportMessageView]}) items!:SupportMessageView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
