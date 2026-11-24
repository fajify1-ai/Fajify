import {Body,Controller,Get,Header,Inject,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import type {Request} from 'express';
import type {VerifiedIdentity} from '../auth/identity.types';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import {validated} from '../customer/customer-http';
import {AdminReadAuditGuard} from './admin-read-audit.guard';
import {AdminAccessInput,type AdminAccessManagerView,type ManagedAdminView} from './admin-access.dto';
import {AdminAccessService,PlatformAdminOwnerGuard} from './admin-access.service';

@ApiTags('admin-access')
@ApiBearerAuth('session')
@Controller({path:'admin/access',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,AdminReadAuditGuard)
export class AdminAccessController {
 constructor(@Inject(AdminAccessService)private readonly access:AdminAccessService){}

 @Get('manager')
 @Header('Cache-Control','no-store')
 @ApiOkResponse({schema:{type:'object',properties:{canManageAdmins:{type:'boolean'},managerSubject:{type:'string',nullable:true}}}})
 manager(@Req()request:Request & {identity:VerifiedIdentity}):Promise<AdminAccessManagerView>{
  return this.access.manager(request.identity);
 }

 @Get('admins')
 @UseGuards(PlatformAdminOwnerGuard)
 @Header('Cache-Control','no-store')
 @ApiOkResponse({schema:{type:'array',items:{type:'object'}}})
 admins():Promise<ManagedAdminView[]>{return this.access.admins();}

 @Post('grants')
 @UseGuards(PlatformAdminOwnerGuard)
 @ApiOkResponse({schema:{type:'object',properties:{changed:{type:'boolean'}}}})
 setAccess(
  @Req()request:Request & {identity:VerifiedIdentity},
  @Body(validated(AdminAccessInput))input:AdminAccessInput
 ):Promise<{changed:boolean}>{
  return this.access.setAccess(request.identity,input);
 }
}
