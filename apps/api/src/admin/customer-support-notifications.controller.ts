import {BadRequestException,CanActivate,Controller,ExecutionContext,Get,Header,Inject,Injectable,Param,ParseUUIDPipe,Put,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiParam,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {CustomerSupportNoticePage,CustomerSupportNoticeView} from './customer-support-notifications.dto';
import {CustomerSupportNotificationsService} from './customer-support-notifications.service';

@Injectable()
export class SupportNoticeEmptyBodyGuard implements CanActivate {
 canActivate(ctx:ExecutionContext):boolean {
  const body=ctx.switchToHttp().getRequest<{body?:unknown}>().body;
  if(body!==undefined&&body!==null&&(typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))
   throw new BadRequestException('Support notification read action accepts no body');
  return true;
 }
}

@ApiTags('customer-support-notifications') @ApiBearerAuth('keycloak')
@Controller({path:'customer/support-notifications',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class CustomerSupportNotificationsController {
 constructor(@Inject(CustomerSupportNotificationsService)private readonly service:CustomerSupportNotificationsService){}
 @Get() @pagination() @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CustomerSupportNoticePage})
 list(@Req()req:{identity:VerifiedIdentity},@Query(validated(PageQuery))q:PageQuery){
  return this.service.list(req.identity.subject,q);
 }
 @Put(':id/read') @UseGuards(SupportNoticeEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CustomerSupportNoticeView})
 read(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string){
  return this.service.read(req.identity,id);
 }
}
