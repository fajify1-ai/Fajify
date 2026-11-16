import {ApiTags,ApiBearerAuth,ApiBody,ApiOperation,ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {requestIp} from './request-ip';
import {Body,Controller,Post,Req,UseGuards,VERSION_NEUTRAL,ForbiddenException,Inject} from '@nestjs/common';
import {IsString,Length,IsOptional} from 'class-validator';
import {BetterAuthService} from './better-auth.service';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';
class ClaimInput {@ApiProperty({type:String,minLength:43,maxLength:43,description:'One-time independently delivered claim secret'}) @IsString() @Length(43,43) token!:string;@IsString() @Length(12,128) @ApiProperty({type:String,minLength:12,maxLength:128,format:'password'}) password!:string;}
class StepUpInput {@ApiProperty({type:String,format:'password'}) @IsString() @Length(1,128) password!:string;@IsOptional() @IsString() @Length(6,6) @ApiPropertyOptional({type:String,minLength:6,maxLength:6}) code?:string;@IsOptional() @IsString() @Length(6,128) @ApiPropertyOptional({type:String,minLength:6,maxLength:128}) backupCode?:string;}
type AuthRequest={headers:Record<string,string>;identity:VerifiedIdentity;socket:{remoteAddress?:string}};
@ApiTags('account-security')
@Controller({path:'auth/faji',version:VERSION_NEUTRAL})
export class AuthSecurityController {
 constructor(@Inject(BetterAuthService)private readonly auth:BetterAuthService,@Inject(AccessService)private readonly access:AccessService){}
 @ApiOperation({summary:'Claim a reconciled legacy identity using independently verified ownership proof'})
 @ApiBody({type:ClaimInput})
 @Post('claim')
 claim(@Body() body:ClaimInput,@Req() req:AuthRequest){
  if(req.headers.origin&&!(process.env.FAJI_WEB_ORIGINS??'').split(',').includes(req.headers.origin))throw new ForbiddenException();
  if(req.headers.cookie&&!req.headers.origin)throw new ForbiddenException();
  return this.auth.claim(body.token,body.password,requestIp(req));
 }
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
