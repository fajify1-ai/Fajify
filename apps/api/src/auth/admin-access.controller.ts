import {Body,Controller,Param,Post,Req,UseGuards,BadRequestException} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsIn,IsUUID} from 'class-validator';
import type {ResourceType,ResourceRole} from './access.service';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {PrivilegedGuard} from './privileged.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';

class MembershipInput {
 @IsIn(['business','branch','dispatch_area']) type!:ResourceType;
 @IsUUID() resourceId!:string;
 @IsIn(['owner','manager','staff','driver','dispatcher']) role!:ResourceRole;
 @IsBoolean() active!:boolean;
}
class SuspensionInput {
 @IsBoolean() suspended!:boolean;
}

/** Administrative approval and suspension require signed Keycloak identity,
 * an active backend account, platform-admin role and recent verified MFA.
 */
@ApiTags('identity-admin')
@ApiBearerAuth('keycloak')
@Controller({path:'admin/accounts',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard)
export class AdminAccessController {
 constructor(private readonly access:AccessService){}
 @Post(':subject/suspension')
 async setSuspension(@Req() req:{identity:VerifiedIdentity},
  @Param('subject') subject:string,@Body() body:SuspensionInput){
  if(!subject||subject.length>255||subject===req.identity.subject)
   throw new BadRequestException('Invalid target account');
  await this.access.setSuspended(req.identity.subject,subject,body.suspended);
  return {subject,suspended:body.suspended};
 }
 @Post(':subject/memberships')
 async setMembership(@Req() req:{identity:VerifiedIdentity},
  @Param('subject') subject:string,@Body() body:MembershipInput){
  if(!subject||subject.length>255||subject===req.identity.subject)
   throw new BadRequestException('Invalid target account');
  await this.access.setMembership(req.identity.subject,subject,body.type,body.resourceId,body.role,body.active);
  return {subject,type:body.type,resourceId:body.resourceId,role:body.role,active:body.active};
 }
}
