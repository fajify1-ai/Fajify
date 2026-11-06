import {applyDecorators,BadRequestException,Body,Controller,Get,Header,HttpCode,Inject,NotFoundException,Param,ParseUUIDPipe,Post,Query,Req,UseGuards,ValidationPipe,type Type,type CanActivate,type ExecutionContext} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiParam,ApiQuery,ApiResponse,ApiProperty,ApiPropertyOptional,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsEmail,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Matches,Max,Min} from 'class-validator';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {PageQuery} from '../customer/customer.dto';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CommerceLifecycle} from './commerce-lifecycle.service';
import {FinancialOperations} from './financial-operations.service';
import {PaymentsService} from './payments.service';
import {FinanceLedger} from './finance-ledger.service';
import {M5_SCHEMAS as schemas,M5_MERCHANT_SCHEMA,M5_OVERVIEW_SCHEMA} from './m5-contracts';
const strict=(expectedType:Type<unknown>)=>new ValidationPipe({expectedType,transform:true,whitelist:true,forbidNonWhitelisted:true});
const paginated=()=>applyDecorators(ApiQuery({name:'limit',required:false,type:Number,description:'Page size, 1–50; default 20',schema:{type:'integer',minimum:1,maximum:50,default:20}}),ApiQuery({name:'offset',required:false,type:Number,description:'Zero-based row offset',schema:{type:'integer',minimum:0,maximum:10000,default:0}}));
type IdentityRequest={identity:VerifiedIdentity};
export class FinanceEmptyBodyGuard implements CanActivate {
 canActivate(ctx:ExecutionContext){const body=ctx.switchToHttp().getRequest().body;if(body!=null&&(typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw new BadRequestException('This action accepts no request body');return true;}
}
export class M5HoldInput {
 @ApiProperty({enum:['reservation','ticket']}) @IsIn(['reservation','ticket']) kind!:'reservation'|'ticket';
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() sourceId!:string;
 @ApiProperty({type:Number,minimum:1,maximum:50}) @IsInt() @Min(1) @Max(50) quantity!:number;
 @ApiProperty({type:String}) @IsString() @Length(1,120) guestName!:string;
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
export class M5CheckoutInput {@ApiProperty({type:String,format:'email',description:'Receipt contact only; never establishes account ownership'}) @IsEmail() @Length(3,254) email!:string;}
export class M5OrderRetryInput {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() previousPaymentIntentId!:string;
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
export class M5RefundInput {
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
 @ApiProperty({type:String,pattern:'^[1-9][0-9]{0,15}$'}) @Matches(/^[1-9][0-9]{0,15}$/) amountMinor!:string;
 @ApiProperty({type:String}) @IsString() @Length(5,500) reason!:string;
}
export class M5PolicyInput {
 @ApiProperty({type:Number,minimum:0,maximum:10000}) @IsInt() @Min(0) @Max(10000) commissionBps!:number;
 @ApiProperty({enum:['platform','merchant']}) @IsIn(['platform','merchant']) gatewayFeeBearer!:'platform'|'merchant';
 @ApiProperty({enum:['platform','merchant']}) @IsIn(['platform','merchant']) payoutFeeBearer!:'platform'|'merchant';
 @ApiProperty({type:Number,minimum:0,maximum:8760}) @IsInt() @Min(0) @Max(8760) settlementDelayHours!:number;
 @ApiProperty({type:Number,minimum:0,maximum:8760}) @IsInt() @Min(0) @Max(8760) refundWindowHours!:number;
 @ApiProperty({type:Number,minimum:0,maximum:525600}) @IsInt() @Min(0) @Max(525600) cancellationCutoffMinutes!:number;
 @ApiProperty({type:Number,minimum:1,maximum:30}) @IsInt() @Min(1) @Max(30) holdMinutes!:number;
}
export class M5DecisionInput {@ApiProperty({type:Boolean}) @IsBoolean() approve!:boolean;}
export class M5ProviderInput {@ApiProperty({type:String,pattern:'^[1-9][0-9]{0,19}$'}) @Matches(/^[1-9][0-9]{0,19}$/) providerId!:string;}
export class M5RecipientInput {@ApiProperty({type:String}) @Matches(/^RCP_[A-Za-z0-9]+$/) recipientCode!:string;}
export class M5BatchInput {
 @ApiProperty({type:String,format:'uuid'}) @IsUUID() recipientId!:string;
 @ApiProperty({type:String}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
export class M5OtpInput {@ApiProperty({type:String,writeOnly:true}) @Matches(/^[0-9]{4,10}$/) otp!:string;}
export class M5DisputeInput {
 @ApiProperty({enum:['merchant-accepted','declined']}) @IsIn(['merchant-accepted','declined']) resolution!:'merchant-accepted'|'declined';
 @ApiProperty({type:String}) @Matches(/^[1-9][0-9]{0,15}$/) amountMinor!:string;
 @ApiProperty({type:String}) @IsString() @Length(5,500) message!:string;
 @ApiPropertyOptional({type:String}) @IsOptional() @Matches(/^[A-Za-z0-9_.-]{1,200}$/) uploadedFilename?:string;
}
export class M5InventoryInput {@ApiProperty({type:Number}) @IsInt() @Min(1) @Max(1000000) capacity!:number;}
export class M5RedeemInput {@ApiProperty({type:String,description:'Opaque QR token; do not log'}) @IsString() @Length(1,300) token!:string;}
class M5HoldResponse {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({enum:['reservation','ticket']}) kind!:string;
 @ApiProperty({enum:['held','confirmed','expired','cancelled','late']}) status!:string;
 @ApiProperty({type:Number}) quantity!:number;
 @ApiProperty({type:String,format:'date-time'}) expiresAt!:string;
 @ApiProperty({type:String,nullable:true,format:'uuid'}) reservationId!:string|null;
 @ApiProperty({type:String,format:'uuid'}) businessId!:string;
 @ApiProperty({type:String,format:'uuid'}) branchId!:string;
 @ApiProperty({type:String,format:'uuid'}) catalogueId!:string;
 @ApiProperty({type:String,nullable:true,format:'uuid'}) availabilityId!:string|null;
 @ApiProperty({type:String}) guestName!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiPropertyOptional({type:String}) amountMinor?:string;
 @ApiPropertyOptional({enum:['NGN']}) currency?:string;
}
class M5CheckoutResponse {
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({enum:['initializing','ready','uncertain','closed','paid']}) state!:string;
 @ApiProperty({type:Boolean}) checkoutEnabled!:boolean;
 @ApiPropertyOptional({type:String,format:'uri'}) authorizationUrl?:string;
 @ApiPropertyOptional({type:String}) accessCode?:string;
 @ApiPropertyOptional({type:String}) reference?:string;
}
class M5RefundResponse {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({type:String}) amountMinor!:string;
 @ApiProperty({enum:['requested','approved','submitting','pending','processed','failed','uncertain','rejected']}) status!:string;
 @ApiProperty({type:String}) reason!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}
class M5TicketResponse {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'uuid'}) holdId!:string;
 @ApiProperty({type:String,format:'uuid'}) eventId!:string;
 @ApiProperty({enum:['issued','redeemed','revoked']}) status!:string;
 @ApiProperty({type:String,format:'date-time'}) startsAt!:string;
 @ApiProperty({type:String,format:'date-time'}) endsAt!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) redeemedAt!:string|null;
 @ApiPropertyOptional({type:String}) qrToken?:string;
}
class M5HoldPage {
 @ApiProperty({type:()=>[M5HoldResponse]}) items!:M5HoldResponse[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
class M5RefundPage {
 @ApiProperty({type:()=>[M5RefundResponse]}) items!:M5RefundResponse[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
class M5TicketPage {
 @ApiProperty({type:()=>[M5TicketResponse]}) items!:M5TicketResponse[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
function page<T>(rows:T[],q:PageQuery){return {items:rows.slice(0,q.limit),nextOffset:rows.length>q.limit?q.offset+q.limit:null};}
@ApiResponse({status:409,description:'Purchase, policy, capacity or financial state conflict; refresh before retry'}) @ApiResponse({status:503,description:'Provider or signing configuration unavailable; an ambiguous provider write requires reconciliation'})
@ApiTags('customer-finance') @ApiBearerAuth('keycloak')
@Controller({path:'customer',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class M5CustomerController {
 constructor(@Inject(CommerceLifecycle)readonly commerce:CommerceLifecycle,@Inject(FinancialOperations)readonly finance:FinancialOperations,@Inject(PaymentsService)readonly payments:PaymentsService){}
 @Post('paid-holds') @HttpCode(200) @ApiBody({type:M5HoldInput}) @ApiOkResponse({type:M5HoldResponse})
 hold(@Req()r:IdentityRequest,@Body(strict(M5HoldInput))i:M5HoldInput){return this.commerce.hold(r.identity,i);}
 @paginated() @Get('paid-holds') @Header('Cache-Control','no-store') @ApiOkResponse({type:M5HoldPage})
 async holds(@Req()r:IdentityRequest,@Query(strict(PageQuery))q:PageQuery){return page(await this.commerce.holds(r.identity.subject,q.limit+1,q.offset),q);}
 @Post('paid-holds/:id/cancellation') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({type:M5HoldResponse})
 cancel(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){return this.commerce.cancel(r.identity,id);}
 @Post('payments/:id/checkout') @HttpCode(200) @Header('Cache-Control','no-store') @ApiBody({type:M5CheckoutInput}) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({type:M5CheckoutResponse})
 checkout(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5CheckoutInput))i:M5CheckoutInput){return this.commerce.checkout(r.identity,id,i.email);}
 @Post('orders/:id/payment-retry') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5OrderRetryInput}) @ApiOkResponse({schema:schemas.retry})
 retryOrder(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5OrderRetryInput))i:M5OrderRetryInput){return this.commerce.retryOrder(r.identity,id,i.previousPaymentIntentId,i.requestKey);}
 @Post('payments/:id/recheck') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.recheck})
 async recheck(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){if(!(await this.commerce.ledger.pool.query('SELECT 1 FROM payment_intents WHERE id=$1 AND customer_subject=$2',[id,r.identity.subject])).rowCount)throw new NotFoundException('Payment unavailable');return this.payments.recheck(r.identity.subject,id);}
 @Post('payments/:id/refunds') @HttpCode(200) @ApiBody({type:M5RefundInput}) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({type:M5RefundResponse})
 refund(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5RefundInput))i:M5RefundInput){return this.finance.requestRefund(r.identity,id,i);}
 @paginated() @Get('refunds') @Header('Cache-Control','no-store') @ApiOkResponse({type:M5RefundPage})
 async refunds(@Req()r:IdentityRequest,@Query(strict(PageQuery))q:PageQuery){return page(await this.finance.customerRefunds(r.identity.subject,q.limit+1,q.offset),q);}
 @paginated() @Get('tickets') @Header('Cache-Control','no-store') @ApiOkResponse({type:M5TicketPage})
 async tickets(@Req()r:IdentityRequest,@Query(strict(PageQuery))q:PageQuery){return page(await this.commerce.tickets(r.identity.subject,q.limit+1,q.offset),q);}
}
@ApiTags('merchant-finance') @ApiBearerAuth('keycloak')
@Controller({path:'businesses/:businessId',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class M5MerchantController {
 constructor(@Inject(CommerceLifecycle)readonly commerce:CommerceLifecycle,@Inject(FinancialOperations)readonly finance:FinancialOperations){}
 @paginated() @Get('finance') @Header('Cache-Control','no-store') @ApiParam({name:'businessId',format:'uuid'}) @ApiOkResponse({schema:M5_MERCHANT_SCHEMA})
 financeView(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())business:string,@Query(strict(PageQuery))q:PageQuery){return this.finance.merchantFinance(r.identity,business,q.limit,q.offset);}
 @Post('branches/:branchId/events/:eventId/inventory') @HttpCode(200) @ApiBody({type:M5InventoryInput}) @ApiOkResponse({schema:schemas.inventory})
 @ApiParam({name:'businessId',format:'uuid'}) @ApiParam({name:'branchId',format:'uuid'}) @ApiParam({name:'eventId',format:'uuid'})
 inventory(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())b:string,@Param('branchId',new ParseUUIDPipe())branch:string,@Param('eventId',new ParseUUIDPipe())event:string,@Body(strict(M5InventoryInput))i:M5InventoryInput){return this.commerce.inventory(r.identity,b,branch,event,i.capacity);}
 @Post('branches/:branchId/tickets/redemption') @HttpCode(200) @ApiBody({type:M5RedeemInput}) @ApiOkResponse({schema:schemas.redeemed})
 @ApiParam({name:'businessId',format:'uuid'}) @ApiParam({name:'branchId',format:'uuid'})
 redeem(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())b:string,@Param('branchId',new ParseUUIDPipe())branch:string,@Body(strict(M5RedeemInput))i:M5RedeemInput){return this.commerce.redeem(r.identity,b,branch,i.token);}
}
@ApiResponse({status:409,description:'Financial state conflict; unresolved provider evidence blocks money movement'}) @ApiResponse({status:503,description:'Provider unavailable; reconcile ambiguous writes before retry'})
@ApiTags('finance-admin') @ApiBearerAuth('keycloak')
@Controller({path:'admin/finance',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard)
export class M5AdminController {
 constructor(@Inject(FinancialOperations)readonly finance:FinancialOperations,@Inject(FinanceLedger)readonly ledger:FinanceLedger,@Inject(CommerceLifecycle)readonly commerce:CommerceLifecycle){}
 @paginated() @Get('businesses/:businessId/policies') @Header('Cache-Control','no-store') @ApiParam({name:'businessId',format:'uuid'}) @ApiOkResponse({schema:{type:'array',items:schemas.policy}})
 policies(@Param('businessId',new ParseUUIDPipe())b:string,@Query(strict(PageQuery))q:PageQuery){return this.finance.policies(b,q.limit,q.offset);}
 @paginated() @Get('audit') @Header('Cache-Control','no-store') @ApiOkResponse({schema:schemas.audit})
 async history(@Req()r:IdentityRequest,@Query(strict(PageQuery))q:PageQuery){await this.audit('operations','audit',r.identity.subject);return (await this.ledger.pool.query('SELECT id,resource_type,resource_id,action,actor,created_at FROM finance_operation_events ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2',[q.limit,q.offset])).rows;}
 @Post('payments/:id/checkout-retry') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({type:M5CheckoutResponse})
 retryCheckout(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){return this.commerce.retryInitialization(r.identity.subject,id);}
 @Post('businesses/:businessId/policies') @HttpCode(200) @ApiParam({name:'businessId',format:'uuid'}) @ApiBody({type:M5PolicyInput}) @ApiOkResponse({schema:schemas.policy})
 policy(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())b:string,@Body(strict(M5PolicyInput))i:M5PolicyInput){return this.finance.policy(r.identity.subject,b,i);}
 @Post('payments/:id/refunds') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5RefundInput}) @ApiOkResponse({type:M5RefundResponse})
 refund(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5RefundInput))i:M5RefundInput){return this.finance.adminRefund(r.identity.subject,id,i);}
 @Post('refunds/:id/decision') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5DecisionInput}) @ApiOkResponse({type:M5RefundResponse})
 decision(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5DecisionInput))i:M5DecisionInput){return this.finance.decision(r.identity.subject,id,i.approve);}
 @Post('refunds/:id/reconciliation') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.terminal})
 async refundCheck(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){await this.audit('refund',id,r.identity.subject);return {id,terminal:await this.finance.reconcileRefund(id)};}
 @Post('refunds/:id/provider-link') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5ProviderInput}) @ApiOkResponse({schema:schemas.terminal})
 async refundLink(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5ProviderInput))i:M5ProviderInput){await this.audit('refund',id,r.identity.subject);return {id,terminal:await this.finance.reconcileRefund(id,i.providerId)};}
 @Post('payments/:id/external-refunds') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5ProviderInput}) @ApiOkResponse({schema:schemas.id})
 adopt(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5ProviderInput))i:M5ProviderInput){return this.finance.adoptRefund(r.identity.subject,id,i.providerId);}
 @Post('businesses/:businessId/recipients') @HttpCode(200) @ApiParam({name:'businessId',format:'uuid'}) @ApiBody({type:M5RecipientInput}) @ApiOkResponse({schema:schemas.recipient})
 recipient(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())b:string,@Body(strict(M5RecipientInput))i:M5RecipientInput){return this.finance.registerRecipient(r.identity.subject,b,i.recipientCode);}
 @Post('recipients/:id/disable') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.disabled})
 disable(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){return this.finance.disableRecipient(r.identity.subject,id);}
 @Post('businesses/:businessId/settlements') @HttpCode(200) @ApiParam({name:'businessId',format:'uuid'}) @ApiBody({type:M5BatchInput}) @ApiOkResponse({schema:schemas.batch})
 batch(@Req()r:IdentityRequest,@Param('businessId',new ParseUUIDPipe())b:string,@Body(strict(M5BatchInput))i:M5BatchInput){return this.finance.batch(r.identity.subject,b,i.recipientId,i.requestKey);}
 @Post('settlements/:id/otp') @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiBody({type:M5OtpInput}) @ApiOkResponse({schema:schemas.pending})
 otp(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string,@Body(strict(M5OtpInput))i:M5OtpInput){return this.finance.finalize(r.identity.subject,id,i.otp);}
 @Post('settlements/:id/cancellation') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.batch})
 cancelBatch(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){return this.finance.cancelPayout(r.identity.subject,id);}
 @Post('settlements/:id/reconciliation') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.terminal})
 async payoutCheck(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){await this.audit('payout',id,r.identity.subject);return {id,terminal:await this.finance.reconcilePayout(id)};}
 @Post('disputes/:providerId/reconciliation') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'providerId',type:String}) @ApiOkResponse({schema:schemas.terminal})
 async disputeCheck(@Req()r:IdentityRequest,@Param('providerId')id:string){this.providerId(id);await this.audit('dispute',id,r.identity.subject);return {id,terminal:await this.finance.reconcileDispute(id)};}
 @Post('disputes/:providerId/resolution') @HttpCode(200) @ApiParam({name:'providerId',type:String}) @ApiBody({type:M5DisputeInput}) @ApiOkResponse({schema:schemas.pending})
 dispute(@Req()r:IdentityRequest,@Param('providerId')id:string,@Body(strict(M5DisputeInput))i:M5DisputeInput){this.providerId(id);return this.finance.resolveDispute(r.identity.subject,id,i);}
 @paginated() @Get('operations') @Header('Cache-Control','no-store') @ApiOkResponse({schema:M5_OVERVIEW_SCHEMA})
 async overview(@Req()r:IdentityRequest,@Query(strict(PageQuery))q:PageQuery){await this.audit('operations','overview',r.identity.subject);return this.finance.overview(q.limit,q.offset);}
 @Post('jobs/:id/retry') @UseGuards(FinanceEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({schema:schemas.queued})
 async retryJob(@Req()r:IdentityRequest,@Param('id',new ParseUUIDPipe())id:string){await this.audit('job',id,r.identity.subject);const result=await this.ledger.pool.query("UPDATE finance_jobs SET state='queued',attempts=0,next_at=now(),last_error=NULL WHERE id=$1 AND state='dead' RETURNING id",[id]);if(!result.rowCount)throw new BadRequestException('Job is not dead');return {id,queued:true};}
 private providerId(id:string){if(!/^[1-9][0-9]{0,19}$/.test(id)||BigInt(id)>18446744073709551615n)throw new BadRequestException('Invalid provider identifier');}
 private async audit(type:string,id:string,actor:string){await this.ledger.pool.query('INSERT INTO finance_operation_events(resource_type,resource_id,action,actor) VALUES($1,$2,\'admin_requested\',$3)',[type,id,actor]);}
}
