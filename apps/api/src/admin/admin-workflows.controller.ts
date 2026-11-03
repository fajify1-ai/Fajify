import {Body,Controller,Get,Header,HttpCode,Inject,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiCreatedResponse,ApiOkResponse,ApiParam,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {AdminScopeGuard,RequireAdminScope} from './admin-scope.guard';
import {AdminGovernanceService} from './admin-governance.service';
import {AdminSupportService} from './admin-support.service';
import {AdminIncidentService} from './admin-incidents.service';
import {AdminPagedResult,AdminChangedView,AdminModerateInput,AdminRestrictionInput,AdminAssignInput,AdminReplyInput,AdminSupportStatusInput,AdminIncidentInput,AdminIncidentTransitionInput,AdminIncidentView,AdminSupportListQuery} from './admin.dto';
type ActorRequest={identity:VerifiedIdentity};
const guards=[IdentityGuard,AccountGuard,PrivilegedGuard,AdminScopeGuard,AdminRateGuard];

@ApiTags('admin-governance') @ApiBearerAuth('keycloak')
@Controller({path:'admin/governance',version:'1'}) @UseGuards(...guards)
export class AdminGovernanceController {
 constructor(@Inject(AdminGovernanceService)private readonly service:AdminGovernanceService){}
 @Get('approvals') @RequireAdminScope('governance.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 applications(@Query(validated(PageQuery)) q:PageQuery){return this.service.applications(q);}
 @Get('reviews') @RequireAdminScope('governance.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 reviews(@Query(validated(PageQuery)) q:PageQuery){return this.service.reviews(q);}
 @Get('restrictions') @RequireAdminScope('governance.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 restrictions(@Query(validated(PageQuery)) q:PageQuery){return this.service.restrictions(q);}
 @Post('reviews/:id/moderation') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('governance.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 moderate(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminModerateInput)) body:AdminModerateInput){
  return this.service.moderation(req.identity.subject,id,body);
 }
 @Post('branches/:id/restriction') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('governance.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 branch(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminRestrictionInput)) body:AdminRestrictionInput){
  return this.service.restriction(req.identity.subject,'branch',id,body);
 }
 @Post('catalogue/:id/restriction') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('governance.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 catalogue(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminRestrictionInput)) body:AdminRestrictionInput){
  return this.service.restriction(req.identity.subject,'catalogue',id,body);
 }
}

@ApiTags('admin-support') @ApiBearerAuth('keycloak')
@Controller({path:'admin/support',version:'1'}) @UseGuards(...guards)
export class AdminSupportController {
 constructor(@Inject(AdminSupportService)private readonly service:AdminSupportService){}
 @Get('cases') @RequireAdminScope('support.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 cases(@Query(validated(AdminSupportListQuery)) q:AdminSupportListQuery){return this.service.cases(q,q.state??'open');}
 @Get('cases/:id') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @RequireAdminScope('support.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 detail(@Param('id',new ParseUUIDPipe()) id:string,@Query(validated(PageQuery)) q:PageQuery){return this.service.detail(id,q);}
 @Post('cases/:id/assignment') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('support.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 assign(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminAssignInput)) body:AdminAssignInput){
  return this.service.assign(req.identity.subject,id,{...body,assignee:body.assignee??null});
 }
 @Post('cases/:id/messages') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('support.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminPagedResult})
 reply(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminReplyInput)) body:AdminReplyInput){
  return this.service.reply(req.identity.subject,id,body);
 }
 @Post('cases/:id/status') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('support.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 status(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminSupportStatusInput)) body:AdminSupportStatusInput){
  return this.service.status(req.identity.subject,id,body);
 }
}

@ApiTags('admin-incidents') @ApiBearerAuth('keycloak')
@Controller({path:'admin/incidents',version:'1'}) @UseGuards(...guards)
export class AdminIncidentController {
 constructor(@Inject(AdminIncidentService)private readonly service:AdminIncidentService){}
 @Get() @RequireAdminScope('monitoring.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 list(@Query(validated(PageQuery)) q:PageQuery){return this.service.list(q);}
 @Post() @RequireAdminScope('incidents.write') @Header('Cache-Control','no-store')
 @ApiCreatedResponse({type:AdminIncidentView})
 create(@Req() req:ActorRequest,@Body(validated(AdminIncidentInput)) body:AdminIncidentInput){
  return this.service.create(req.identity.subject,body);
 }
 @Post(':id/status') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @HttpCode(200) @RequireAdminScope('incidents.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminChangedView})
 transition(@Req() req:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminIncidentTransitionInput)) body:AdminIncidentTransitionInput){
  return this.service.transition(req.identity.subject,id,body);
 }
}
