import {ApiProperty} from '@nestjs/swagger';
export class WebApplicationContact {
 @ApiProperty({type:String}) fullName!:string;
 @ApiProperty({type:String,format:'email'}) email!:string;
 @ApiProperty({type:String}) phone!:string;
}
export class WebApplicationBusiness {
 @ApiProperty({type:String}) registrationNumber!:string;
 @ApiProperty({type:String}) address!:string;
}
export class WebApplicationLocation {
 @ApiProperty({type:String}) city!:string;
 @ApiProperty({type:String}) area!:string;
 @ApiProperty({type:String}) landmark!:string;
}
export class WebApplicationSnapshot {
 @ApiProperty({type:String}) businessName!:string;
 @ApiProperty({type:String}) category!:string;
 @ApiProperty({type:[String]}) services!:string[];
 @ApiProperty({type:String}) scale!:string;
 @ApiProperty({type:()=>WebApplicationContact}) contact!:WebApplicationContact;
 @ApiProperty({type:()=>WebApplicationBusiness}) business!:WebApplicationBusiness;
 @ApiProperty({type:()=>WebApplicationLocation}) location!:WebApplicationLocation;
 @ApiProperty({enum:['not_reviewed']}) verificationStatus!:'not_reviewed';
}
export class WebApplicationReviewDetail {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String}) displayName!:string;
 @ApiProperty({enum:['pending','approved','rejected']}) status!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) submittedAt!:string|null;
 @ApiProperty({type:()=>WebApplicationSnapshot,nullable:true}) application!:WebApplicationSnapshot|null;
}
