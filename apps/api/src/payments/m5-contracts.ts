import type {SchemaObject} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
const string:SchemaObject={type:'string'},money:SchemaObject={type:'string',pattern:'^[0-9]+$'},uuid:SchemaObject={type:'string',format:'uuid'},date:SchemaObject={type:'string',format:'date-time'},integer:SchemaObject={type:'integer'},boolean:SchemaObject={type:'boolean'};
const nullable=(s:SchemaObject):SchemaObject=>({...s,nullable:true});
const array=(items:SchemaObject):SchemaObject=>({type:'array',items});
const object=(properties:Record<string,SchemaObject>,optional:string[]=[]):SchemaObject=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties).filter(k=>!optional.includes(k))});
export const M5_SCHEMAS={
 retry:object({paymentIntentId:uuid,orderId:uuid,amountMinor:money,currency:{type:'string',enum:['NGN']},status:{type:'string',enum:['pending','succeeded']},checkoutEnabled:boolean}),
 recheck:object({paymentIntentId:uuid,status:{type:'string',enum:['succeeded']},replayed:boolean}),
 terminal:object({id:string,terminal:boolean}),id:object({id:uuid}),pending:object({id:string,pending:boolean,status:string},['pending','status']),queued:object({id:uuid,queued:boolean}),
 recipient:object({id:uuid,recipient_code:string,environment:{type:'string',enum:['test','live']},active:boolean}),disabled:object({id:uuid,active:boolean}),
 inventory:object({catalogue_id:uuid,capacity:integer,held:integer,issued:integer}),redeemed:object({id:uuid,status:{type:'string',enum:['redeemed']}}),
 policy:object({id:uuid,version:integer,commissionBps:integer,gatewayFeeBearer:{type:'string',enum:['platform','merchant']},payoutFeeBearer:{type:'string',enum:['platform','merchant']},settlementDelayHours:integer,refundWindowHours:integer,cancellationCutoffMinutes:integer,holdMinutes:integer,createdAt:date}),
 batch:object({id:uuid,businessId:uuid,amountMinor:money,recoveredMinor:money,status:{type:'string',enum:['approved','submitting','pending','otp','succeeded','failed','reversed','uncertain','recovered']},createdAt:date}),
 audit:array(object({id:uuid,resource_type:string,resource_id:string,action:string,actor:string,created_at:date})),
};
export const M5_MERCHANT_SCHEMA=object({payableMinor:{type:'string',pattern:'^-?[0-9]+$'},recoveryDebtMinor:money,policy:nullable(M5_SCHEMAS.policy),payments:array(object({id:uuid,amount_minor:money,status:string,commission_minor:nullable(money),merchant_minor:nullable(money),resolution:nullable(string),eligible_at:nullable(date),gateway_fee_minor:nullable(money)})),batches:array(M5_SCHEMAS.batch)});
export const M5_OVERVIEW_SCHEMA=object({
 refunds:array(object({id:uuid,intent_id:uuid,amount_minor:money,state:string,created_at:date})),
 payouts:array(object({id:uuid,business_id:uuid,amount_minor:money,state:string,created_at:date})),
 disputes:array(object({provider_id:string,intent_id:uuid,amount_minor:money,state:string,resolution:nullable(string)})),
 exceptions:array(object({id:uuid,intent_id:uuid,kind:string,provider_id:string})),
 jobs:array(object({id:uuid,kind:string,resource_id:string,state:string,attempts:integer,next_at:date,lease_until:nullable(date),last_error:nullable(string)})),
 jobCounts:array(object({state:string,count:integer})),
});
/** Explicit inventory: generation fails when any M5 lifecycle route/security/schema disappears. */
export const M5_OPERATIONS:ReadonlyArray<readonly [string,'get'|'post',boolean]>=[
 ...(['paid-holds','payments/{id}/checkout','orders/{id}/payment-retry','payments/{id}/refunds'] as const).map(p=>['/api/v1/customer/'+p,'post',true] as const),
 ...(['paid-holds/{id}/cancellation','payments/{id}/recheck'] as const).map(p=>['/api/v1/customer/'+p,'post',false] as const),
 ...(['paid-holds','refunds','tickets'] as const).map(p=>['/api/v1/customer/'+p,'get',false] as const),
 ['/api/v1/businesses/{businessId}/finance','get',false],
 ['/api/v1/businesses/{businessId}/branches/{branchId}/events/{eventId}/inventory','post',true],
 ['/api/v1/businesses/{businessId}/branches/{branchId}/tickets/redemption','post',true],
 ...(['businesses/{businessId}/policies','payments/{id}/refunds','refunds/{id}/decision','refunds/{id}/provider-link','payments/{id}/external-refunds','businesses/{businessId}/recipients','businesses/{businessId}/settlements','settlements/{id}/otp','disputes/{providerId}/resolution'] as const).map(p=>['/api/v1/admin/finance/'+p,'post',true] as const),
 ...(['payments/{id}/checkout-retry','refunds/{id}/reconciliation','recipients/{id}/disable','settlements/{id}/cancellation','settlements/{id}/reconciliation','disputes/{providerId}/reconciliation','jobs/{id}/retry'] as const).map(p=>['/api/v1/admin/finance/'+p,'post',false] as const),
 ...(['operations','businesses/{businessId}/policies','audit'] as const).map(p=>['/api/v1/admin/finance/'+p,'get',false] as const),
];
