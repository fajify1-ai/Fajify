import {Body,Controller,Get,Inject,Param,Patch,Post,Req,UseGuards,ParseUUIDPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiProperty,ApiPropertyOptional,ApiBody} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsBoolean,IsEmail,IsIn,IsInt,IsOptional,IsString,IsUUID,Length,Max,Min,IsISO8601,IsArray,ArrayMaxSize,ValidateNested} from 'class-validator';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {ResourceGuard,RequireResource} from '../auth/resource.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {ManagementService} from './management.service';
type Request={identity:VerifiedIdentity};
class Grant{
 @ApiProperty({type:String}) @IsString() @Length(1,255) subject!:string;
 @ApiProperty({type:String}) @IsIn(['manager','staff']) role!:'manager'|'staff';
 @ApiPropertyOptional({type:String}) @IsOptional() @IsUUID() branchId?:string;
}
class BranchUpdate{
 @ApiPropertyOptional({type:String}) @IsOptional() @IsString() @Length(2,120) name?:string;
 @ApiPropertyOptional({type:Boolean}) @IsOptional() @IsBoolean() active?:boolean;
 @ApiPropertyOptional({type:String}) @IsOptional() @IsEmail() contactEmail?:string;
}
class CatalogueUpdate{
 @ApiPropertyOptional({type:String}) @IsOptional() @IsString() @Length(2,160) name?:string;
 @ApiPropertyOptional({type:Number}) @IsOptional() @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) priceMinor?:number;
 @ApiPropertyOptional({type:Boolean}) @IsOptional() @IsBoolean() published?:boolean;
 @ApiPropertyOptional({type:Boolean}) @IsOptional() @IsBoolean() active?:boolean;
}
class SlotUpdate { @ApiProperty({type:Boolean}) @IsBoolean() active!:boolean; }
class EventConfig { @ApiProperty({type:String}) @IsISO8601({strict:true}) startsAt!:string; @ApiProperty({type:String}) @IsISO8601({strict:true}) endsAt!:string; @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(1000000) maxGuests!:number; }
class PackageLine { @ApiProperty({type:String}) @IsUUID() catalogueId!:string; @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(10000) quantity!:number; }
class PackageConfig { @ApiProperty({type:()=>[PackageLine]}) @IsArray() @ArrayMaxSize(50) @ValidateNested({each:true}) @Type(()=>PackageLine) components!:PackageLine[]; }
class WeeklyHour { @ApiProperty({type:Number}) @IsInt() @Min(0) @Max(6) weekday!:number; @ApiProperty({type:Number}) @IsInt() @Min(0) @Max(1439) opensMinute!:number; @ApiProperty({type:Number}) @IsInt() @Min(1) @Max(1440) closesMinute!:number; }
class WeeklyHours { @ApiProperty({type:()=>[WeeklyHour]}) @IsArray() @ArrayMaxSize(70) @ValidateNested({each:true}) @Type(()=>WeeklyHour) slots!:WeeklyHour[]; }
@ApiTags('merchant-administration') @ApiBearerAuth('keycloak')
@Controller({path:'businesses/:businessId',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,ResourceGuard)
export class ManagementController{
 constructor(@Inject(ManagementService)private readonly service:ManagementService){}
 @Get('branches/:branchId/hours') @RequireResource('business','businessId','owner','manager')
 hours(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string){return this.service.hours(r.identity.subject,b,v);}
 @Patch('branches/:branchId/hours') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:WeeklyHours})
 setHours(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:WeeklyHours){return this.service.replaceHours(r.identity.subject,b,v,i.slots);}
 @Get('branches/:branchId/events/:itemId') @RequireResource('business','businessId','owner','manager')
 eventDetails(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('itemId',new ParseUUIDPipe())id:string){return this.service.event(r.identity.subject,b,v,id);}
 @Get('branches/:branchId/packages/:itemId') @RequireResource('business','businessId','owner','manager')
 packageDetails(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('itemId',new ParseUUIDPipe())id:string){return this.service.packageComponents(r.identity.subject,b,v,id);}
 @Patch('branches/:branchId/events/:itemId') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:EventConfig})
 event(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('itemId',new ParseUUIDPipe())id:string,@Body()i:EventConfig){return this.service.configureEvent(r.identity.subject,b,v,id,i);}
 @Patch('branches/:branchId/packages/:itemId') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:PackageConfig})
 packageConfig(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('itemId',new ParseUUIDPipe())id:string,@Body()i:PackageConfig){return this.service.replacePackage(r.identity.subject,b,v,id,i.components);}
 @Get('overview') @RequireResource('business','businessId','owner','manager')
 overview(@Req()r:Request,@Param('businessId')b:string){return this.service.overview(r.identity.subject,b);}
 @Get('staff') @RequireResource('business','businessId','owner','manager')
 staff(@Req()r:Request,@Param('businessId')b:string){return this.service.staff(r.identity.subject,b);}
 @Post('staff/grants') @RequireResource('business','businessId','owner')
 @ApiBody({type:Grant})
 grant(@Req()r:Request,@Param('businessId')b:string,@Body()i:Grant){return this.service.grant(r.identity.subject,b,i.subject,i.role,i.branchId);}
 @Post('staff/revocations') @RequireResource('business','businessId','owner')
 @ApiBody({type:Grant})
 revoke(@Req()r:Request,@Param('businessId')b:string,@Body()i:Grant){return this.service.revoke(r.identity.subject,b,i.subject,i.role,i.branchId);}
 @Patch('branches/:branchId') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:BranchUpdate})
 branch(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:BranchUpdate){return this.service.setBranch(r.identity.subject,b,v,i);}
 @Patch('branches/:branchId/catalogue/:itemId') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:CatalogueUpdate})
 catalogue(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('itemId',new ParseUUIDPipe())id:string,@Body()i:CatalogueUpdate){return this.service.setCatalogue(r.identity.subject,b,v,id,i);}
 @Patch('branches/:branchId/availability/:slotId') @RequireResource('business','businessId','owner','manager')
 @ApiBody({type:SlotUpdate})
 slot(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('slotId',new ParseUUIDPipe())id:string,@Body()i:SlotUpdate){return this.service.setSlot(r.identity.subject,b,v,id,i);}
}
