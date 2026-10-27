import {Body,Controller,Get,Param,Post,Req,UseGuards,Inject} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsIn,IsString,Length} from 'class-validator';
import {IdentityGuard} from './identity.guard';
import {AccountGuard} from './account.guard';
import {PrivilegedGuard} from './privileged.guard';
import {AdminRateGuard} from './admin-rate.guard';
import {BusinessApprovalService} from './business-approval.service';
import type {VerifiedIdentity} from './identity.types';

class ApplyInput {@IsString() @Length(2,120) displayName!:string;}
class ReviewInput {@IsIn(['approved','rejected']) decision!:'approved'|'rejected';}

@ApiTags('business-onboarding')
@ApiBearerAuth('keycloak')
@Controller({path:'business/onboarding',version:'1'})
export class BusinessApprovalController{
 constructor(@Inject(BusinessApprovalService) private readonly business:BusinessApprovalService){}
 @Post()
 @UseGuards(IdentityGuard,AccountGuard)
 apply(@Req() req:{identity:VerifiedIdentity},@Body() body:ApplyInput){
  return this.business.apply(req.identity.subject,body.displayName);
 }
 @Get(':id')
 @UseGuards(IdentityGuard,AccountGuard)
 own(@Req() req:{identity:VerifiedIdentity},@Param('id') id:string){
  return this.business.getOwn(req.identity.subject,id);
 }
 @Post(':id/review')
 @UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminRateGuard)
 review(@Req() req:{identity:VerifiedIdentity},@Param('id') id:string,@Body() body:ReviewInput){
  return this.business.review(req.identity.subject,id,body.decision);
 }
}
