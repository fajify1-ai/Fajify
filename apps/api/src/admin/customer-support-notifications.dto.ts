import {ApiProperty} from '@nestjs/swagger';

export class CustomerSupportNoticeView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) caseId!:string;
 @ApiProperty({type:String}) title!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) readAt!:string|null;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}
export class CustomerSupportNoticePage {
 @ApiProperty({type:()=>[CustomerSupportNoticeView]}) items!:CustomerSupportNoticeView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
