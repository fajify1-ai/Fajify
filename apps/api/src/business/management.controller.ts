import {Body,Controller,Get,Inject,Param,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsEmail,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Max,Min} from 'class-validator';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {ResourceGuard,RequireResource} from '../auth/resource.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {ManagementService} from './management.service';
type Request={identity:VerifiedIdentity};
class Grant{
 @IsString() @Length(1,255) subject!:string;
 @IsIn(['manager','staff']) role!:'manager'|'staff';
 @IsOptional() @IsUUID() branchId?:string;
}
class BranchUpdate{
 @IsOptional() @IsString() @Length(2,120) name?:string;
 @IsOptional() @IsBoolean() active?:boolean;
 @IsOptional() @IsEmail() contactEmail?:string;
}
class CatalogueUpdate{
 @IsOptional() @IsString() @Length(2,160) name?:string;
 @IsOptional() @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) priceMinor?:number;
 @IsOptional() @IsBoolean() published?:boolean;
 @IsOptional() @IsBoolean() active?:boolean;
}
class SlotUpdate{@IsBoolean() active!:boolean;}
@ApiTags('merchant-administration') @ApiBearerAuth('keycloak')
@Controller({path:'businesses/:businessId',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,ResourceGuard)
export class ManagementController{
 constructor(@Inject(ManagementService)private readonly service:ManagementService){}
 @Get('overview') @RequireResource('business','businessId','owner','manager')
 overview(@Req()r:Request,@Param('businessId')b:string){return this.service.overview(r.identity.subject,b);}
 @Get('staff') @RequireResource('business','businessId','owner','manager')
 staff(@Req()r:Request,@Param('businessId')b:string){return this.service.staff(r.identity.subject,b);}
 @Post('staff/grants') @RequireResource('business','businessId','owner')
 grant(@Req()r:Request,@Param('businessId')b:string,@Body()i:Grant){return this.service.grant(r.identity.subject,b,i.subject,i.role,i.branchId);}
 @Post('staff/revocations') @RequireResource('business','businessId','owner')
 revoke(@Req()r:Request,@Param('businessId')b:string,@Body()i:Grant){return this.service.revoke(r.identity.subject,b,i.subject,i.role,i.branchId);}
 @Patch('branches/:branchId') @RequireResource('business','businessId','owner','manager')
 branch(@Req()r:Request,@Param('businessId')b:string,@Param('branchId')v:string,@Body()i:BranchUpdate){return this.service.setBranch(r.identity.subject,b,v,i);}
 @Patch('branches/:branchId/catalogue/:itemId') @RequireResource('business','businessId','owner','manager')
 catalogue(@Req()r:Request,@Param('businessId')b:string,@Param('branchId')v:string,@Param('itemId')id:string,@Body()i:CatalogueUpdate){return this.service.setCatalogue(r.identity.subject,b,v,id,i);}
 @Patch('branches/:branchId/availability/:slotId') @RequireResource('business','businessId','owner','manager')
 slot(@Req()r:Request,@Param('businessId')b:string,@Param('branchId')v:string,@Param('slotId')id:string,@Body()i:SlotUpdate){return this.service.setSlot(r.identity.subject,b,v,id,i);}
}
