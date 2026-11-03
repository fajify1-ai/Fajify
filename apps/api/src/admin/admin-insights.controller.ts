import {Body,Controller,Get,Header,HttpCode,Inject,Param,ParseUUIDPipe,Post,Query,Req,UseGuards,BadRequestException} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiParam,ApiQuery,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {AdminScopeGuard,RequireAdminScope,RequireAdminScopes} from './admin-scope.guard';
import {AdminReadAuditGuard} from './admin-read-audit.guard';
import {AdminEmptyBodyGuard} from './admin-empty-body.guard';
import {AdminInsightsService} from './admin-insights.service';
import {AdminMonitorService} from './admin-monitor.service';
import {AdminReportRangeQuery,AdminPagedResult,AdminFinanceSummary,AdminReportSummary,AdminMonitoringSummary,AdminCommandAuditPage,AdminAlertPage,AdminCommandKey,AdminChangedView,AdminConsistencyView,AdminBusinessReportView} from './admin.dto';
type ActorRequest={identity:VerifiedIdentity};
const guards=[IdentityGuard,AccountGuard,PrivilegedGuard,AdminScopeGuard,AdminRateGuard,AdminReadAuditGuard];

@ApiTags('admin-finance-reports') @ApiBearerAuth('keycloak')
@Controller({path:'admin',version:'1'}) @UseGuards(...guards)
export class AdminInsightsController{
 constructor(@Inject(AdminInsightsService)private readonly insights:AdminInsightsService,
 @Inject(AdminMonitorService)private readonly monitor:AdminMonitorService){}
 @Get('finance/summary') @RequireAdminScope('finance.read') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminFinanceSummary})
 finance(){return this.insights.finance();}
 @Get('reports/overview') @ApiQuery({name:'days',required:false,schema:{type:'integer',minimum:1,maximum:90,default:30}}) @RequireAdminScopes('reports.read','finance.read') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminReportSummary})
 report(@Query(validated(AdminReportRangeQuery)) q:AdminReportRangeQuery){return this.insights.report(q.days);}
 @Get('reports/businesses/:id') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}})
 @RequireAdminScopes('reports.read','finance.read') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminBusinessReportView})
 business(@Param('id',new ParseUUIDPipe()) id:string){return this.insights.businessReport(id);}
 @Get('integrations/consistency') @RequireAdminScope('integrations.read') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminConsistencyView})
 consistency(){return this.insights.consistency();}
 @Get('monitoring/status') @RequireAdminScope('monitoring.read') @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminMonitoringSummary})
 status(){return this.insights.monitoring();}
 @Post('monitoring/check') @UseGuards(AdminEmptyBodyGuard) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @HttpCode(200) @RequireAdminScope('incidents.write') @Header('Cache-Control','no-store')
 @ApiOkResponse({schema:{type:'object',properties:{checkedAt:{type:'string',format:'date-time'},opened:{type:'array',items:{type:'string'}},cleared:{type:'array',items:{type:'string'}}}}})
 check(){return this.monitor.tick();}
 @Get('monitoring/alerts') @RequireAdminScope('monitoring.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminAlertPage})
 alerts(@Query(validated(PageQuery)) q:PageQuery){return this.monitor.alerts(q);}
 @Post('monitoring/alerts/:id/acknowledgement') @ApiParam({name:'id',schema:{type:'string',format:'uuid'}})
 @HttpCode(200) @RequireAdminScope('incidents.write') @Header('Cache-Control','no-store') @ApiOkResponse({type:AdminChangedView})
 @ApiBody({type:AdminCommandKey})
 acknowledge(@Req()r:ActorRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(AdminCommandKey)) body:AdminCommandKey){
  return this.monitor.acknowledge(r.identity.subject,id,body.requestKey);
 }
 @Get('operations/command-audit') @RequireAdminScope('audit.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminCommandAuditPage})
 actionAudit(@Query(validated(PageQuery)) q:PageQuery){return this.insights.commandAudit(q);}
 @Get('integrations/customers/:subject/activity') @ApiParam({name:'subject',type:String}) @RequireAdminScope('integrations.read') @Header('Cache-Control','no-store')
 @pagination() @ApiOkResponse({type:AdminPagedResult})
 activity(@Req()r:ActorRequest,@Param('subject') subject:string,@Query(validated(PageQuery)) q:PageQuery){
  if(!subject||subject.length>255)throw new BadRequestException('Invalid subject');
  return this.insights.activity(r.identity.subject,subject,q);
 }
}
