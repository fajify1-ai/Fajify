import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {DriverOnboardingService} from './driver-onboarding.service';
const register=z.object({vehicleCategory:z.string().trim().min(1).max(32),registration:z.string().trim().min(3).max(40)}).strict();
const decision=z.object({approve:z.boolean()}).strict();
@ApiTags('ride-drivers') @ApiBearerAuth('keycloak')
@Controller({path:'drivers',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,RolesGuard,CustomerWriteGuard)
export class DriverOnboardingController {
 constructor(@Inject(DriverOnboardingService)private readonly service:DriverOnboardingService){}
 @Post('onboarding') @RequireRoles('driver') @ApiBody({schema:{type:'object',required:['vehicleCategory','registration'],properties:{vehicleCategory:{type:'string'},registration:{type:'string'}}}})
 @ApiOkResponse({description:'Pending driver and vehicle review'})
 register(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown) {
  const parsed=register.safeParse(body);
  if(!parsed.success)throw new BadRequestException('Invalid driver registration');
  return this.service.register(req.identity.subject,parsed.data.vehicleCategory,parsed.data.registration);
 }
 @Get('me') @RequireRoles('driver')
 me(@Req() req:{identity:VerifiedIdentity}){return this.service.status(req.identity.subject);}
 @Post(':id/review') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['approve'],properties:{approve:{type:'boolean'}}}})
 @ApiOkResponse({description:'Audited privileged driver approval decision'})
 review(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  const parsed=decision.safeParse(body);
  if(!parsed.success)throw new BadRequestException('Invalid review decision');
  return this.service.decide(req.identity.subject,id,parsed.data.approve);
 }
}
