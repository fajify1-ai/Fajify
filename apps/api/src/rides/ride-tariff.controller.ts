import {BadRequestException,Body,Controller,Inject,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideTariffService} from './ride-tariff.service';
const policy=z.object({category:z.string().min(1).max(32),baseMinor:z.string().regex(/^[0-9]{1,16}$/),
 perKmMinor:z.string().regex(/^[0-9]{1,16}$/),commissionBps:z.number().int().min(0).max(10000)}).strict();
@ApiTags('ride-fare-policy') @ApiBearerAuth('keycloak')
@UseGuards(IdentityGuard,AccountGuard,RolesGuard,PrivilegedGuard,AdminRateGuard,CustomerWriteGuard)
@RequireRoles('platform-admin')
@Controller({path:'admin/ride-tariffs',version:'1'})
export class RideTariffController {
 constructor(@Inject(RideTariffService)private readonly tariffs:RideTariffService){}
 @Post() @ApiBody({schema:{type:'object',required:['category','baseMinor','perKmMinor','commissionBps'],properties:{category:{type:'string'},baseMinor:{type:'string'},perKmMinor:{type:'string'},commissionBps:{type:'integer'}}}})
 @ApiOkResponse({description:'New active category tariff with immutable version history'})
 create(@Req() request:{identity:VerifiedIdentity},@Body() body:unknown){
  const p=policy.safeParse(body);if(!p.success)throw new BadRequestException('Invalid ride tariff');
  return this.tariffs.create(request.identity.subject,p.data);
 }
}
