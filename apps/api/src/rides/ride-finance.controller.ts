import {BadRequestException,Controller,Get,Inject,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiOkResponse,ApiParam} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {FinanceEmptyBodyGuard} from '../payments/m5-lifecycle.controller';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideFinanceService} from './ride-finance.service';
@ApiTags('ride-finance') @ApiBearerAuth('keycloak')
@Controller({path:'',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,RolesGuard,CustomerWriteGuard)
export class RideFinanceController {
 constructor(@Inject(RideFinanceService)private readonly finance:RideFinanceService){}
 @Post('customer/rides/:id/payment-intent') @RequireRoles('customer') @UseGuards(FinanceEmptyBodyGuard)
 @ApiParam({name:'id',format:'uuid'}) @ApiOkResponse({description:'M5 payment intent from authoritative completed ride; use existing verified checkout API'})
 prepare(@Req() r:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){
  return this.finance.prepare(r.identity.subject,id);
 }
 @Get('drivers/me/earnings') @RequireRoles('driver')
 @ApiOkResponse({description:'Owned ride earnings, never an assertion of payout'})
 earnings(@Req() r:{identity:VerifiedIdentity},@Query('limit') raw?:string){
  const limit=raw===undefined?20:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new BadRequestException('Invalid limit');
  return this.finance.earnings(r.identity.subject,limit);
 }
 @Post('admin/rides/:id/payout-reservation') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard,FinanceEmptyBodyGuard)
 reserve(@Req() r:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){
  return this.finance.reservePayout(r.identity.subject,id);
 }
 @Post('admin/ride-payouts/:id/submit') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard,FinanceEmptyBodyGuard)
 submit(@Req() r:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){
  return this.finance.submitPayout(r.identity.subject,id);
 }
 @Post('admin/ride-payouts/:id/reconcile') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard,FinanceEmptyBodyGuard)
 reconcile(@Req() r:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){
  return this.finance.reconcilePayout(r.identity.subject,id);
 }
}
