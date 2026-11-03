import {BadRequestException,Body,Controller,Header,HttpCode,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiOperation,ApiParam,ApiProperty,ApiResponse,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PaymentsService} from './payments.service';

class PaymentRecheckResponse {
 @ApiProperty({type:String,format:'uuid'}) paymentIntentId!:string;
 @ApiProperty({enum:['succeeded']}) status!:string;
 @ApiProperty({type:Boolean,description:'True when the matching capture was already posted'}) replayed!:boolean;
}

@ApiTags('finance-admin') @ApiBearerAuth('keycloak')
@Controller({path:'admin/finance/payments',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard)
export class PaymentRecoveryController {
 constructor(@Inject(PaymentsService)private readonly service:PaymentsService){}
 @Post(':id/provider-recheck') @HttpCode(200) @Header('Cache-Control','no-store')
 @ApiOperation({summary:'Recover a missed notification by independently verifying the stored payment reference; no charge is initiated'})
 @ApiParam({name:'id',type:String,format:'uuid',required:true})
 @ApiBody({required:false,schema:{type:'object',additionalProperties:false}})
 @ApiOkResponse({type:PaymentRecheckResponse})
 @ApiResponse({status:409,description:'Verified charge differs from local intent or receipt'})
 @ApiResponse({status:503,description:'Provider verification unavailable or transaction not successful; no capture posted'})
 recheck(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string,@Body()body:unknown){
  if(body!=null&&(typeof body!=='object'||Array.isArray(body)||Object.keys(body).length>0))
   throw new BadRequestException('This action does not accept payment details');
  return this.service.recheck(req.identity.subject,id);
 }
}
