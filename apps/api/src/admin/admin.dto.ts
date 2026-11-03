import {ApiProperty} from '@nestjs/swagger';

export class AdminOverviewView {
 @ApiProperty({type:Number,description:'Merchant onboarding requests awaiting review'}) pendingBusinessApprovals!:number;
 @ApiProperty({type:Number,description:'Open customer support cases'}) openSupportCases!:number;
 @ApiProperty({type:Number,description:'Hidden customer reviews that have not been withdrawn'}) hiddenReviews!:number;
}
export class AdminAuditEventView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,nullable:true}) actorSubject!:string|null;
 @ApiProperty({type:String}) eventType!:string;
 @ApiProperty({type:String,format:'date-time'}) occurredAt!:string;
}
export class AdminAuditPage {
 @ApiProperty({type:()=>[AdminAuditEventView]}) items!:AdminAuditEventView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
