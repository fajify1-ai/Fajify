import {ApiTags,ApiBearerAuth,ApiBody,ApiOperation,ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Body,Controller,Post,Req,UseGuards,VERSION_NEUTRAL,ForbiddenException,Inject} from '@nestjs/common';
import {IsString,Length,IsOptional} from 'class-validator';
import {BetterAuthService} from './better-auth.service';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';
class StepUpInput {@ApiProperty({type:String,format:'password'}) @IsString() @Length(1,128) password!:string;@IsOptional() @IsString() @Length(6,6) @ApiPropertyOptional({type:String,minLength:6,maxLength:6}) code?:string;@IsOptional() @IsString() @Length(6,128) @ApiPropertyOptional({type:String,minLength:6,maxLength:128}) backupCode?:string;}
type AuthRequest={headers:Record<string,string>;identity:VerifiedIdentity;socket:{remoteAddress?:string}};
@ApiTags('account-security')
@Controller({path:'auth/faji',version:VERSION_NEUTRAL})
export class AuthSecurityController {
 constructor(@Inject(BetterAuthService)private readonly auth:BetterAuthService,@Inject(AccessService)private readonly access:AccessService){}
 @ApiBearerAuth('session') @ApiOperation({summary:'Establish recent password and enrolled-factor proof'})
 @ApiBody({type:StepUpInput})
 @Post('step-up') @UseGuards(IdentityGuard,AccountGuard)
 async stepUp(@Body() body:StepUpInput,@Req() req:AuthRequest){
  if(!await this.access.allowPrivilegedRequest(req.identity.subject))throw new ForbiddenException('Too many attempts');
  return this.auth.stepUp(new Headers(req.headers),body.password,body.code,body.backupCode);
 }
 @ApiBearerAuth('session')
 @Post('unlink-phone') @UseGuards(IdentityGuard,AccountGuard)
 unlink(@Req() req:AuthRequest){return this.auth.unlinkPhone(new Headers(req.headers));}
}
