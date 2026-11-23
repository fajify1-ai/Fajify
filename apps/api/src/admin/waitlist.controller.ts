import {Body,Controller,ForbiddenException,Get,Header,Inject,Post,Query,Req,ServiceUnavailableException,UseGuards,ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiCreatedResponse,ApiOkResponse,ApiQuery,ApiTags} from '@nestjs/swagger';
import type {Request} from 'express';
import {normalizeAuthenticationOrigins} from '../auth/auth-origins';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import {AdminScopeGuard,RequireAdminScope} from './admin-scope.guard';
import {AdminReadAuditGuard} from './admin-read-audit.guard';
import {WaitlistAdminQuery,WaitlistPage,WaitlistSignupInput} from './waitlist.dto';
import {WaitlistService,waitlistClientAddress} from './waitlist.service';

const bodyPipe=new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,expectedType:WaitlistSignupInput});
const queryPipe=new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:false},expectedType:WaitlistAdminQuery});

@ApiTags('waitlist')
@Controller({path:'waitlist',version:'1'})
export class WaitlistController {
 constructor(@Inject(WaitlistService)private readonly service:WaitlistService){}

 @Post() @ApiBody({type:WaitlistSignupInput}) @ApiCreatedResponse({schema:{type:'object',properties:{accepted:{type:'boolean'}}}})
 async signup(@Req() req:Request,@Body(bodyPipe) input:WaitlistSignupInput){
  const origin=req.headers.origin??'';
  let trustedOrigins:string[];
  try{trustedOrigins=normalizeAuthenticationOrigins(process.env.FAJI_WEB_ORIGINS??'');}
  catch{throw new ServiceUnavailableException('Waitlist origin configuration is unavailable.');}
  if(!origin||!trustedOrigins.includes(origin))
   throw new ForbiddenException('Waitlist signups must come from an approved Fajify website.');
  const address=waitlistClientAddress(req);
  return this.service.signup(input,address);
 }
}

@ApiTags('admin-waitlist') @ApiBearerAuth('session')
@Controller({path:'admin/waitlist',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminScopeGuard,AdminRateGuard,AdminReadAuditGuard)
export class AdminWaitlistController {
 constructor(@Inject(WaitlistService)private readonly service:WaitlistService){}
 @Get() @RequireAdminScope('waitlist.read') @Header('Cache-Control','no-store')
 @ApiQuery({name:'limit',required:false,schema:{type:'integer',minimum:1,maximum:50,default:20}})
 @ApiQuery({name:'offset',required:false,schema:{type:'integer',minimum:0,maximum:10000,default:0}})
 @ApiQuery({name:'search',required:false,schema:{type:'string',minLength:1,maxLength:120}})
 @ApiOkResponse({type:WaitlistPage})
 list(@Query(queryPipe) query:WaitlistAdminQuery){return this.service.list(query);}
}
