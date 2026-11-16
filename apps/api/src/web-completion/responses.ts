import {applyDecorators,type Type} from '@nestjs/common';
import {ApiExtraModels,ApiOkResponse,ApiProperty,getSchemaPath} from '@nestjs/swagger';
export class WebDraftData {
 @ApiProperty({type:Number}) step!:number;
 @ApiProperty({type:String}) businessName!:string;
 @ApiProperty({type:String}) fields!:string;
}
export class WebDraftView {
 @ApiProperty({type:Number}) revision!:number;
 @ApiProperty({type:()=>WebDraftData}) data!:WebDraftData;
}
export class WebApplication {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) display_name!:string;
 @ApiProperty({type:String}) status!:string;
 @ApiProperty({type:String}) created_at!:string;
}
export class WebApplications {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebApplication]}) items!:WebApplication[];
}
export class WebDocumentMeta {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) mime!:string;
 @ApiProperty({type:String}) created_at!:string;
}
export class WebDocuments {
 @ApiProperty({type:()=>[WebDocumentMeta]}) items!:WebDocumentMeta[];
 @ApiProperty({type:String}) verificationStatus!:string;
}
export class WebDocumentFile {
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) mime!:string;
 @ApiProperty({type:String}) base64!:string;
}
export class WebUploadResult {
 @ApiProperty({type:Boolean}) stored!:boolean;
 @ApiProperty({type:()=>WebDocumentMeta,required:false,nullable:true}) document?:WebDocumentMeta | null;
 @ApiProperty({type:String}) verificationStatus!:string;
}
export class WebReceipt {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) amount_minor!:string;
 @ApiProperty({type:String}) currency!:string;
 @ApiProperty({type:String}) verified_at!:string;
 @ApiProperty({type:String}) filename!:string;
 @ApiProperty({type:String}) contentType!:string;
 @ApiProperty({type:String}) content!:string;
}
export class WebCartQuote {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) branch_id!:string;
 @ApiProperty({type:String}) price_minor!:string;
 @ApiProperty({type:String}) currency!:string;
}
export class WebCartLine {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:Number}) quantity!:number;
}
export class WebCart {
 @ApiProperty({type:Number}) revision!:number;
 @ApiProperty({type:()=>[WebCartLine]}) items!:WebCartLine[];
 @ApiProperty({type:()=>[WebCartQuote]}) quotes!:WebCartQuote[];
 @ApiProperty({type:Boolean}) checkoutEnabled!:boolean;
}
export class WebHostedEvent {
 @ApiProperty({type:Boolean,required:false}) is_owner?:boolean;
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) name!:string;
 @ApiProperty({type:String}) description!:string;
 @ApiProperty({type:String}) location!:string;
 @ApiProperty({type:String}) starts_at!:string;
 @ApiProperty({type:String}) ends_at!:string;
 @ApiProperty({type:Number}) capacity!:number;
}
export class WebHostedEvents {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebHostedEvent]}) items!:WebHostedEvent[];
}
export class WebInvitation {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) expires_at!:string;
 @ApiProperty({type:String}) token!:string;
 @ApiProperty({type:String}) delivery!:string;
 @ApiProperty({type:String}) grants!:string;
}
export class WebInvitationAccepted {
 @ApiProperty({type:String}) eventId!:string;
 @ApiProperty({type:String}) status!:string;
 @ApiProperty({type:Boolean}) bookingCreated!:boolean;
}
export class WebPromotion {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) business_id!:string;
 @ApiProperty({type:String}) title!:string;
 @ApiProperty({type:String}) description!:string;
 @ApiProperty({type:String}) expires_at!:string;
}
export class WebPromotions {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebPromotion]}) items!:WebPromotion[];
}
export class WebOrderMetric {
 @ApiProperty({type:String}) currency!:string;
 @ApiProperty({type:Number}) orders!:number;
 @ApiProperty({type:Number}) cancelled!:number;
 @ApiProperty({type:String}) fulfilled_minor!:string;
}
export class WebReservationMetric {
 @ApiProperty({type:String}) status!:string;
 @ApiProperty({type:Number}) count!:number;
}
export class WebDailyMetric {
 @ApiProperty({type:String}) day!:string;
 @ApiProperty({type:String}) currency!:string;
 @ApiProperty({type:Number}) orders!:number;
 @ApiProperty({type:String}) fulfilled_minor!:string;
}
export class WebReport {
 @ApiProperty({type:()=>[WebOrderMetric]}) orders!:WebOrderMetric[];
 @ApiProperty({type:()=>[WebReservationMetric]}) reservations!:WebReservationMetric[];
 @ApiProperty({type:()=>[WebDailyMetric]}) daily!:WebDailyMetric[];
 @ApiProperty({type:String}) timezone!:string;
 @ApiProperty({type:Number}) periodDays!:number;
 @ApiProperty({type:String}) metric!:string;
}
export class WebMerchantNotification {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) title!:string;
 @ApiProperty({type:String}) created_at!:string;
 @ApiProperty({type:Boolean}) read!:boolean;
}
export class WebMerchantNotifications {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebMerchantNotification]}) items!:WebMerchantNotification[];
}
export class WebNotificationRead {
 @ApiProperty({type:Boolean}) read!:boolean;
}
export class WebSupportCase {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) title!:string;
 @ApiProperty({type:String}) status!:string;
 @ApiProperty({type:String}) created_at!:string;
}
export class WebSupportCases {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebSupportCase]}) items!:WebSupportCase[];
}
export class WebSupportMessage {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) body!:string;
 @ApiProperty({type:String}) created_at!:string;
}
export class WebSupportMessages {
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
 @ApiProperty({type:()=>[WebSupportMessage]}) items!:WebSupportMessage[];
}
export function journeyResponse(model:Type<unknown>){return applyDecorators(ApiExtraModels(model),ApiOkResponse({schema:{type:'object',required:['data'],properties:{data:{$ref:getSchemaPath(model)}}}}));}

export class WebMediaItem {
 @ApiProperty({type:String}) id!:string;
 @ApiProperty({type:String}) url!:string;
 @ApiProperty({type:String}) alt!:string;
 @ApiProperty({type:Number}) position!:number;
}
export class WebMedia {
 @ApiProperty({type:()=>[WebMediaItem]}) items!:WebMediaItem[];
}

export class WebPublicProfile {
 @ApiProperty({type:String}) summary!:string;
 @ApiProperty({type:String}) city!:string;
 @ApiProperty({type:String,nullable:true}) public_phone!:string|null;
 @ApiProperty({type:Number,nullable:true}) latitude!:number|null;
 @ApiProperty({type:Number,nullable:true}) longitude!:number|null;
}

export class WebPackageAddon {
 @ApiProperty({type:String}) catalogueId!:string;
 @ApiProperty({type:Number}) maxQuantity!:number;
}
export class WebPackageOptions {
 @ApiProperty({type:Boolean}) configured!:boolean;
 @ApiProperty({type:String}) pricingModel!:string;
 @ApiProperty({type:Number}) minGuests!:number;
 @ApiProperty({type:Number}) maxGuests!:number;
 @ApiProperty({type:()=>[WebPackageAddon]}) addOns!:WebPackageAddon[];
}
