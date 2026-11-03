import {Type} from 'class-transformer';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsBoolean,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator';
import {PageQuery} from '../customer/customer.dto';

export class AdminOverviewView {
 @ApiProperty({type:Number}) pendingBusinessApprovals!:number;
 @ApiProperty({type:Number}) openSupportCases!:number;
 @ApiProperty({type:Number}) hiddenReviews!:number;
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
export class AdminCommandAuditView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String}) actorSubject!:string;
 @ApiProperty({type:String}) operation!:string;
 @ApiProperty({type:String}) resourceType!:string;
 @ApiProperty({type:String}) resourceId!:string;
 @ApiProperty({type:String,enum:['applied','unchanged']}) outcome!:string;
 @ApiProperty({type:String,nullable:true}) reason!:string|null;
 @ApiProperty({type:String,format:'date-time'}) occurredAt!:string;
}
export class AdminCommandAuditPage {
 @ApiProperty({type:()=>[AdminCommandAuditView]}) items!:AdminCommandAuditView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class AdminCommandKey {
 @ApiProperty({type:String,pattern:'^[A-Za-z0-9_-]{8,100}$'})
 @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
export class AdminReasonInput extends AdminCommandKey {
 @ApiProperty({type:String,minLength:8,maxLength:500}) @IsString() @Length(8,500) reason!:string;
}
export class AdminModerateInput extends AdminReasonInput {
 @ApiProperty({enum:['visible','hidden']}) @IsIn(['visible','hidden']) visibility!:'visible'|'hidden';
}
export class AdminRestrictionInput extends AdminReasonInput {
 @ApiProperty({type:Boolean}) @IsBoolean() restricted!:boolean;
}
export class AdminAssignInput extends AdminReasonInput {
 @ApiPropertyOptional({type:String,nullable:true}) @IsOptional() @IsString() @Length(1,255) assignee?:string|null;
 @ApiProperty({enum:['low','normal','high','urgent']}) @IsIn(['low','normal','high','urgent']) priority!:'low'|'normal'|'high'|'urgent';
}
export class AdminReplyInput extends AdminCommandKey {
 @ApiProperty({type:String,minLength:1,maxLength:4000}) @IsString() @Length(1,4000) @Matches(/\S/) message!:string;
}
export class AdminSupportStatusInput extends AdminReasonInput {
 @ApiProperty({enum:['open','closed']}) @IsIn(['open','closed']) status!:'open'|'closed';
}
export class AdminIncidentInput extends AdminCommandKey {
 @ApiProperty({enum:['booking','order','ride','provider','security','platform']})
 @IsIn(['booking','order','ride','provider','security','platform']) incidentType!:'booking'|'order'|'ride'|'provider'|'security'|'platform';
 @ApiPropertyOptional({type:String,format:'uuid'}) @IsOptional() @IsUUID() resourceId?:string;
 @ApiProperty({type:String,minLength:8,maxLength:200}) @IsString() @Length(8,200) summary!:string;
 @ApiProperty({enum:['low','medium','high','critical']})
 @IsIn(['low','medium','high','critical']) severity!:'low'|'medium'|'high'|'critical';
}
export class AdminIncidentTransitionInput extends AdminReasonInput {
 @ApiProperty({enum:['open','investigating','mitigated','resolved']})
 @IsIn(['open','investigating','mitigated','resolved']) state!:'open'|'investigating'|'mitigated'|'resolved';
}
export class AdminSupportListQuery extends PageQuery {
 @ApiPropertyOptional({enum:['open','closed']}) @IsOptional() @IsIn(['open','closed']) state?:'open'|'closed';
}
export class AdminReportRangeQuery {
 @ApiPropertyOptional({type:Number,minimum:1,maximum:90,default:30})
 @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(90) days=30;
}
export class AdminPagedResult {
 @ApiProperty({type:'array',items:{type:'object',additionalProperties:true}}) items!:Record<string,unknown>[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
export class AdminChangedView {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:Boolean}) changed!:boolean;
}
export class AdminIncidentView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String}) incidentType!:string;
 @ApiProperty({type:String,nullable:true}) resourceId!:string|null;
 @ApiProperty({type:String}) summary!:string;
 @ApiProperty({type:String}) severity!:string;
 @ApiProperty({type:String}) state!:string;
 @ApiProperty({type:String,nullable:true}) assignedTo!:string|null;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,format:'date-time'}) updatedAt!:string;
}
export class AdminFinanceSummary {
 @ApiProperty({type:String}) capturedMinor!:string;
 @ApiProperty({type:String}) refundedMinor!:string;
 @ApiProperty({type:String}) settledMinor!:string;
 @ApiProperty({type:Number}) openReconciliationCases!:number;
 @ApiProperty({type:Number}) openDisputes!:number;
 @ApiProperty({type:Number}) uncertainRefunds!:number;
}
export class AdminReportSummary {
 @ApiProperty({type:Number}) days!:number;
 @ApiProperty({type:Number}) customers!:number;
 @ApiProperty({type:Number}) approvedBusinesses!:number;
 @ApiProperty({type:Number}) createdOrders!:number;
 @ApiProperty({type:Number}) createdReservations!:number;
 @ApiProperty({type:Number}) issuedTickets!:number;
 @ApiProperty({type:String}) verifiedCaptureMinor!:string;
 @ApiProperty({type:String}) ledgerPlatformRevenueMinor!:string;
 @ApiProperty({type:String}) currency!:string;
}
export class AdminMonitoringSummary {
 @ApiProperty({type:Number}) deadFinanceJobs!:number;
 @ApiProperty({type:Number}) expiredFinanceLeases!:number;
 @ApiProperty({type:Number}) overdueFinanceJobs!:number;
 @ApiProperty({type:Number}) openFinanceExceptions!:number;
 @ApiProperty({type:Number}) staleOutboxEvents!:number;
 @ApiProperty({type:String,enum:['unverified'],description:'No external provider probe is performed'}) providerHealth!:string;
 @ApiProperty({type:String,format:'date-time'}) checkedAt!:string;
}
