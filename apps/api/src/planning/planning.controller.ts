import {applyDecorators,Body,Controller,Get,Header,Put,Param,ParseUUIDPipe,Post,Query,Req,UseGuards,ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiCreatedResponse,ApiOkResponse,ApiTags,ApiParam,ApiQuery} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerSavedPlanInput,CustomerSavedPlanEditInput,CustomerPlanBookingInput,CustomerPlanBookingHoldView,CustomerPlanFeedbackInput,CustomerPlanFeedbackView,CustomerSavedPlanListQuery,CustomerSavedPlanPage,CustomerSavedPlanView,CustomerPlanRecommendationPage} from './planning.dto';
import {PlanningService} from './planning.service';
type Request={identity:VerifiedIdentity};
const resource=()=>ApiParam({name:'id',schema:{type:'string',format:'uuid'}});
const page=()=>applyDecorators(ApiQuery({name:'limit',required:false,schema:{type:'integer',minimum:1,maximum:50,default:20}}),ApiQuery({name:'offset',required:false,schema:{type:'integer',minimum:0,maximum:10000,default:0}}));
const strict=<T extends object>(expectedType:new()=>T)=>new ValidationPipe({expectedType,whitelist:true,forbidNonWhitelisted:true,transform:true});
@ApiTags('experience-planning') @ApiBearerAuth('keycloak')
@Controller({path:'plans',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class PlanningController {
 constructor(private readonly planning:PlanningService){}
 @Post() @ApiBody({type:CustomerSavedPlanInput}) @ApiCreatedResponse({type:CustomerSavedPlanView})
 create(@Req() r:Request,@Body(strict(CustomerSavedPlanInput)) input:CustomerSavedPlanInput){return this.planning.create(r.identity,input);}
 @Get() @Header('Cache-Control','no-store') @page() @ApiOkResponse({type:CustomerSavedPlanPage})
 list(@Req() r:Request,@Query(strict(CustomerSavedPlanListQuery)) query:CustomerSavedPlanListQuery){return this.planning.list(r.identity.subject,query);}
 @Get(':id') @resource() @Header('Cache-Control','no-store') @ApiOkResponse({type:CustomerSavedPlanView})
 get(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.get(r.identity.subject,id);}
 @Get(':id/recommendations') @resource() @Header('Cache-Control','no-store') @ApiOkResponse({type:CustomerPlanRecommendationPage})
 recommendations(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.recommend(r.identity.subject,id);}
 @Post(':id/archive') @resource() @ApiCreatedResponse({type:CustomerSavedPlanView})
 archive(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.archive(r.identity,id);}
 @Put(':id') @resource() @ApiBody({type:CustomerSavedPlanEditInput}) @ApiOkResponse({type:CustomerSavedPlanView})
 update(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body(strict(CustomerSavedPlanEditInput)) input:CustomerSavedPlanEditInput){
  return this.planning.update(r.identity,id,input);
 }
 @Post(':id/feedback') @resource() @ApiBody({type:CustomerPlanFeedbackInput}) @ApiCreatedResponse({type:CustomerPlanFeedbackView})
 feedback(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body(strict(CustomerPlanFeedbackInput)) input:CustomerPlanFeedbackInput){
  return this.planning.feedback(r.identity,id,input);
 }
 @Get(':id/feedback') @resource() @Header('Cache-Control','no-store') @ApiOkResponse({type:CustomerPlanFeedbackView})
 feedbackDetail(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){
  return this.planning.feedbackDetail(r.identity.subject,id);
 }

 @Post(':id/booking-holds') @resource() @ApiBody({type:CustomerPlanBookingInput}) @ApiCreatedResponse({type:CustomerPlanBookingHoldView})
 bookingHold(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body(strict(CustomerPlanBookingInput)) input:CustomerPlanBookingInput){
  return this.planning.bookingHold(r.identity,id,input);
 }

}