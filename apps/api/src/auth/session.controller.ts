import {Controller,Get,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import type {VerifiedIdentity} from './identity.types';

/** Server-side proof of verified identity and active Faji account. */
@ApiTags('identity')
@ApiBearerAuth('keycloak')
@Controller({path:'auth',version:'1'})
export class SessionController {
 @Get('me')
 @UseGuards(IdentityGuard,AccountGuard)
 @ApiOperation({summary:'Get validated identity and active-account status'})
 me(@Req() req:{identity:VerifiedIdentity}){
  return {subject:req.identity.subject,roles:req.identity.roles};
 }
}
