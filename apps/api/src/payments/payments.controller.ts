import {BadRequestException,Controller,Headers,HttpCode,Inject,Post,RawBodyRequest,Req} from '@nestjs/common';
import {ApiBody,ApiHeader,ApiOperation,ApiResponse,ApiTags} from '@nestjs/swagger';
import type {Request} from 'express';
import {PaymentsService} from './payments.service';

@ApiTags('payments')
@Controller({path:'payments/webhooks',version:'1'})
export class PaymentsController {
 constructor(@Inject(PaymentsService)private readonly service:PaymentsService){}
 @Post('paystack') @HttpCode(200)
 @ApiOperation({summary:'Signed Paystack notification; independently verified before posting funds'})
 @ApiHeader({name:'x-paystack-signature',required:true,description:'HMAC-SHA512 over the exact raw request bytes'})
 @ApiBody({schema:{type:'object',additionalProperties:true}})
 @ApiResponse({status:200,description:'Event accepted or safely replayed'})
 @ApiResponse({status:401,description:'Signature rejected'})
 @ApiResponse({status:503,description:'Provider verification unavailable; retry notification'})
 webhook(@Req()request:RawBodyRequest<Request>,@Headers('x-paystack-signature')signature:unknown){
  if(!request.rawBody)throw new BadRequestException('Raw payment payload required');
  return this.service.webhook(request.rawBody,signature);
 }
}
