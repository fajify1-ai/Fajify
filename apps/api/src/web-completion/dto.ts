import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsArray,ArrayMaxSize,IsString,Length,IsInt,Min,Max,IsOptional,IsUUID,ValidateNested,IsISO8601,IsIn,Matches} from 'class-validator';
export class DraftInput {
 @ApiProperty({type:Number,minimum:0}) @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:Number,minimum:1,maximum:8}) @IsInt() @Min(1) @Max(8) step!:number;
 @ApiProperty({type:String,maxLength:120}) @IsString() @Length(0,120) businessName!:string;
 @ApiPropertyOptional({type:String,maxLength:5000,description:'JSON onboarding fields; no identity files or credentials'}) @IsOptional() @IsString() @Length(0,5000) fields?:string;
}
export class UploadInput {
 @ApiProperty({type:String,maxLength:120}) @IsString() @Length(1,120) @Matches(/^[\w .()-]+$/) name!:string;
 @ApiPropertyOptional({enum:['business_document','business_registration','business_photo','business_video']}) @IsOptional() @IsIn(['business_document','business_registration','business_photo','business_video']) documentType?:string;
 @ApiProperty({enum:['image/jpeg','image/png','application/pdf','video/mp4','video/webm']}) @IsIn(['image/jpeg','image/png','application/pdf','video/mp4','video/webm']) mime!:string;
 @ApiProperty({type:String,maxLength:7000000}) @IsString() @Length(4,7000000) @Matches(/^[A-Za-z0-9+/]+={0,2}$/) base64!:string;
}
export class CartLine {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() catalogueId!:string;
 @ApiProperty({type:Number,minimum:1,maximum:100}) @IsInt() @Min(1) @Max(100) quantity!:number;
}
export class CartInput {
 @ApiProperty({type:Number}) @IsInt() @Min(0) revision!:number;
 @ApiProperty({type:()=>[CartLine]}) @IsArray() @ArrayMaxSize(50) @ValidateNested({each:true}) @Type(()=>CartLine) items!:CartLine[];
}
export class HostedEventInput {
 @ApiProperty({type:String}) @IsString() @Length(2,120) name!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,2000) description!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,300) location!:string;
 @ApiProperty({type:String,format:'date-time'}) @IsISO8601({strict:true}) startsAt!:string;
 @ApiProperty({type:String,format:'date-time'}) @IsISO8601({strict:true}) endsAt!:string;
 @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) capacity!:number;
}
export class InvitationAcceptance {
 @ApiProperty({type:String}) @Matches(/^[a-f0-9]{64}$/) token!:string;
}
export class PromotionInput {
 @ApiProperty({type:String}) @IsString() @Length(2,120) title!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,2000) description!:string;
 @ApiProperty({type:String,format:'date-time'}) @IsISO8601({strict:true}) expiresAt!:string;
}
export class MerchantSupportInput {
 @ApiProperty({type:String}) @IsString() @Length(2,160) title!:string;
 @ApiProperty({type:String}) @IsString() @Length(1,4000) message!:string;
}
export class MerchantMessageInput {
 @ApiProperty({type:String}) @IsString() @Length(1,4000) message!:string;
}
export class JsonView {
 @ApiProperty({type:Object,additionalProperties:true,description:'Versioned journey response. Fields follow the operation response contract.'}) data!:Record<string,unknown>;
}
