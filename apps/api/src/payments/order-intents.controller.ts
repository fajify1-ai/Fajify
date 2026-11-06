import {Body,Controller,Header,HttpCode,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards,ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiOperation,ApiParam,ApiProperty,ApiTags} from '@nestjs/swagger';
import {Matches} from 'class-validator';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {OrderIntentsService} from './order-intents.service';
class PrepareOrderIntentInput {
 @ApiProperty({type:String,pattern:'^[A-Za-z0-9_-]{8,100}$'}) @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}
class PreparedOrderIntentResponse {
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({type:String,format:'uuid'}) orderId!:string;
 @ApiProperty({type:String,pattern:'^[0-9]+$'}) amountMinor!:string;
 @ApiProperty({enum:['NGN']}) currency!:string;
 @ApiProperty({enum:['pending','succeeded']}) status!:string;
 @ApiProperty({enum:[false],description:'Preparation does not initialize a gateway session or initiate a charge'}) checkoutEnabled!:boolean;
}
@ApiTags('customer-payments') @ApiBearerAuth('keycloak')
@Controller({path:'customer/orders',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class OrderIntentsController {
 constructor(@Inject(OrderIntentsService)private readonly service:OrderIntentsService){}
 @Post(':id/payment-intent') @HttpCode(200) @Header('Cache-Control','no-store')
 @ApiOperation({summary:'Prepare one payment intent from the current customer\'s authoritative order; checkout remains unavailable'})
 @ApiParam({name:'id',type:String,format:'uuid',required:true})
 @ApiBody({type:PrepareOrderIntentInput}) @ApiOkResponse({type:PreparedOrderIntentResponse})
 prepare(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string,
  @Body(new ValidationPipe({expectedType:PrepareOrderIntentInput,whitelist:true,forbidNonWhitelisted:true,transform:true}))input:PrepareOrderIntentInput){
  return this.service.prepare(req.identity,id,input.requestKey);
 }
}
