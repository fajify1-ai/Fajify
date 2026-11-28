import {AdminScopeGuard,RequireAdminScope} from '../admin/admin-scope.guard';
import {Body,Controller,Get,Param,Post,Req,UseGuards,Inject} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsIn,IsString,Length,IsOptional,IsInt,Min,ValidateIf} from 'class-validator';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {PrivilegedGuard} from './privileged.guard';
import {AdminRateGuard} from './admin-rate.guard';
import {BusinessApprovalService} from './business-approval.service';
import {ResourceGuard,RequireResource} from './resource.guard';
import type {VerifiedIdentity} from './identity.types';

class ApplyInput {@ApiProperty({type:String,minLength:2,maxLength:120}) @IsString() @Length(2,120) displayName!:string; @ApiPropertyOptional({type:Number,minimum:1,description:'Revision of the complete saved eight-step application. Legacy name-only applications remain supported.'}) @IsOptional() @IsInt() @Min(1) draftRevision?:number;}
class ReviewInput {@IsIn(['approved','rejected']) decision!:'approved'|'rejected'; @ValidateIf(input=>input.decision==='rejected') @IsString() @Length(8,500) reason?:string;}

@ApiTags('business-onboarding')
@ApiBearerAuth('session')
@Controller({path:'business/onboarding',version:'1'})
export class BusinessApprovalController{
 constructor(@Inject(BusinessApprovalService) private readonly business:BusinessApprovalService){}
 @Post()
 @ApiBody({type:ApplyInput})
 @UseGuards(IdentityGuard,AccountGuard)
 apply(@Req() req:{identity:VerifiedIdentity},@Body() body:ApplyInput){
  return this.business.apply(req.identity.subject,body.displayName,body.draftRevision);
 }
 @Get(':id')
 @UseGuards(IdentityGuard,AccountGuard)
 own(@Req() req:{identity:VerifiedIdentity},@Param('id') id:string){
  return this.business.getOwn(req.identity.subject,id);
 }
 /** Owners can enter pending and rejected workspaces; other roles still require approval. */
 @Get(':id/workspace')
 @UseGuards(IdentityGuard,AccountGuard,ResourceGuard)
 @RequireResource('business','id','owner','manager','staff')
 workspace(@Req() req:{identity:VerifiedIdentity},@Param('id') id:string){
  return this.business.getOwnWorkspace(req.identity.subject,id);
 }
 @RequireAdminScope('governance.write')
 @Post(':id/review')
 @UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard,AdminScopeGuard)
 review(@Req() req:{identity:VerifiedIdentity},@Param('id') id:string,@Body() body:ReviewInput){
  return this.business.review(req.identity.subject,id,body.decision,body.reason);
 }
}
