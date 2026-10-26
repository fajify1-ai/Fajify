import {Body,Controller,Param,Post,Req,UseGuards,BadRequestException} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsUUID} from 'class-validator';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {PrivilegedGuard} from './privileged.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';

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
}
