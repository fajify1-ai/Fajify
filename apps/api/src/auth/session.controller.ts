import {BadRequestException,Controller,Get,Post,Req,UseGuards,Inject} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';

/** Server-side proof of verified identity and active Faji account. */
@ApiTags('identity')
@ApiBearerAuth('keycloak')
@Controller({path:'auth',version:'1'})
export class SessionController {
 constructor(@Inject(AccessService) private readonly access:AccessService){}
 @Post('sessions/revoke-current')
 @UseGuards(IdentityGuard,AccountGuard)
 @ApiOperation({summary:'Revoke this Keycloak session at the Faji API; clients must also end the Keycloak session to invalidate refresh tokens'})
 async revokeCurrent(@Req() req:{identity:VerifiedIdentity}){
  if(!req.identity.sessionId)throw new BadRequestException('Signed session identifier required');
  await this.access.revokeSession(req.identity.subject,req.identity.sessionId);
  return {revoked:true};
 }
 @Get('me')
 @UseGuards(IdentityGuard,AccountGuard)
 @ApiOperation({summary:'Get validated identity and active-account status'})
 async me(@Req() req:{identity:VerifiedIdentity}){
  const memberships=await this.access.approvedBusinessMemberships(req.identity.subject);
  return {subject:req.identity.subject,roles:req.identity.roles,memberships};
 }
}
