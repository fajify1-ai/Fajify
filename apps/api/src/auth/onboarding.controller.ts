import {Controller,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from './identity.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';

/** Self provisioning uses only the verified JWT subject, never a client-supplied ID.
 * A provisioned account remains suspended until an authorized approval.
 */
@ApiTags('identity')
@ApiBearerAuth('keycloak')
@Controller({path:'auth',version:'1'})
export class OnboardingController {
 constructor(private readonly access:AccessService){}
 @Post('enroll')
 @UseGuards(IdentityGuard)
 @ApiOperation({summary:'Register verified Keycloak subject for approval (pending by default)'})
 async enroll(@Req() req:{identity:VerifiedIdentity}){
  await this.access.provisionSubject(req.identity.subject);
  return {subject:req.identity.subject,status:'pending_approval'};
 }
}
