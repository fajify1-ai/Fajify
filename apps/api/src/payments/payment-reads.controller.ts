import {Controller,Get,Header,Inject,Param,ParseUUIDPipe,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiOperation,ApiParam,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PaymentReadsService} from './payment-reads.service';

class PaymentStatusResponse {
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({enum:['pending','succeeded']}) status!:string;
 @ApiProperty({type:String,pattern:'^[0-9]+$',description:'Integer minor units, encoded as a decimal string'}) amountMinor!:string;
 @ApiProperty({enum:['NGN']}) currency!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
 @ApiProperty({type:String,format:'date-time',nullable:true}) verifiedAt!:string|null;
}
class CaptureChecks {
 @ApiProperty({type:Boolean}) verification!:boolean;
 @ApiProperty({type:Boolean}) receipt!:boolean;
 @ApiProperty({type:Boolean}) journal!:boolean;
 @ApiProperty({type:Boolean}) audit!:boolean;
 @ApiProperty({type:Boolean}) outbox!:boolean;
}
class CaptureReconciliationResponse {
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({enum:['pending','succeeded']}) status!:string;
 @ApiProperty({type:String,pattern:'^[0-9]+$'}) amountMinor!:string;
 @ApiProperty({enum:['NGN']}) currency!:string;
 @ApiProperty({enum:['internal_capture']}) scope!:string;
 @ApiProperty({enum:['not_checked']}) providerReconciliation!:string;
 @ApiProperty({enum:['consistent','inconsistent']}) internalStatus!:string;
 @ApiProperty({type:()=>CaptureChecks}) checks!:CaptureChecks;
 @ApiProperty({type:[String],description:'Names of failed internal consistency checks'}) issues!:string[];
}

@ApiTags('customer-payments') @ApiBearerAuth('keycloak')
@Controller({path:'customer/payments',version:'1'})
@UseGuards(IdentityGuard,AccountGuard)
export class CustomerPaymentsController {
 constructor(@Inject(PaymentReadsService)private readonly service:PaymentReadsService){}
 @Get(':id') @ApiOperation({summary:'Get the current customer\'s payment status; this does not assert booking confirmation'})
 @ApiParam({name:'id',type:String,format:'uuid',required:true})
 @Header('Cache-Control','no-store')
 @ApiOkResponse({type:PaymentStatusResponse})
 payment(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string){
  return this.service.customerPayment(req.identity.subject,id);
 }
}

@ApiTags('finance-admin') @ApiBearerAuth('keycloak')
@Controller({path:'admin/finance/payments',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard)
export class FinancePaymentsController {
 constructor(@Inject(PaymentReadsService)private readonly service:PaymentReadsService){}
 @Get(':id/reconciliation') @ApiOperation({summary:'Audit internal capture consistency; provider statements and settlement are not checked'})
 @ApiParam({name:'id',type:String,format:'uuid',required:true})
 @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CaptureReconciliationResponse})
 reconciliation(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string){
  return this.service.reconciliation(req.identity.subject,id);
 }
}
