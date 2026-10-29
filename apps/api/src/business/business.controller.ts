import {Body,Controller,Get,Inject,Param,Patch,Post,Req,UseGuards,ParseUUIDPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsArray,ArrayMaxSize,ArrayMinSize,IsBoolean,IsEmail,IsIn,IsInt,IsISO8601,IsOptional,IsString,IsUUID,Length,Matches,Max,Min,ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {ResourceGuard,RequireResource} from '../auth/resource.guard';
import {BusinessService} from './business.service';
import type {VerifiedIdentity} from '../auth/identity.types';
class BranchInput{
 @ApiProperty() @IsString() @Length(2,120) name!:string;
 @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @Length(1,2000) address?:string;
 @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/) timezone?:string;
}
class ItemInput{
 @ApiProperty() @IsString() @Length(2,160) name!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @Length(0,4000) description?:string;
 @ApiProperty() @IsIn(['product','service','package','event']) kind!:string;
 @ApiProperty() @IsInt() @Min(0) @Max(9007199254740991) priceMinor!:number;
 @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?:string;
 @ApiPropertyOptional() @IsOptional() @IsBoolean() published?:boolean;
}
class SlotInput{
 @ApiProperty() @IsUUID() catalogueId!:string;
 @ApiProperty() @IsISO8601({strict:true}) startsAt:string;
 @ApiProperty() @IsISO8601({strict:true}) endsAt:string;
 @ApiProperty() @IsInt() @Min(1) @Max(1000000) capacity!:number;
}
class ReservationInput{
 @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey?:string;
 @ApiProperty() @IsUUID() availabilityId!:string;
 @ApiProperty() @IsString() @Length(1,255) customerSubject!:string;
 @ApiProperty() @IsInt() @Min(1) @Max(10000) guests!:number;
}
class OrderLine{
 @ApiProperty() @IsUUID() catalogueId!:string;
 @ApiProperty() @IsInt() @Min(1) @Max(10000) quantity!:number;
}
class OrderInput{
 @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey?:string;
 @ApiProperty() @IsString() @Length(1,255) customerSubject!:string;
 @ApiProperty({type:()=>[OrderLine]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>OrderLine) items!:OrderLine[];
}
class OrderTransition { @ApiProperty({enum:['accepted','preparing','ready','fulfilled','cancelled']}) @IsIn(['accepted','preparing','ready','fulfilled','cancelled']) status!:'accepted'|'preparing'|'ready'|'fulfilled'|'cancelled'; }
class ReservationTransition { @ApiProperty({enum:['checked_in','completed','cancelled']}) @IsIn(['checked_in','completed','cancelled']) status!:'checked_in'|'completed'|'cancelled'; }
type Request={identity:VerifiedIdentity};
@ApiTags('merchant-operations') @ApiBearerAuth('keycloak')
@Controller({path:'businesses/:businessId',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,ResourceGuard)
export class BusinessController{
 constructor(@Inject(BusinessService)private readonly service:BusinessService){}
 @Post('branches') @RequireResource('business','businessId','owner','manager')
 branch(@Req()r:Request,@Param('businessId')b:string,@Body()i:BranchInput){return this.service.createBranch(r.identity.subject,b,i);}
 @Get('branches') @RequireResource('business','businessId','owner','manager','staff')
 branches(@Req()r:Request,@Param('businessId')b:string){return this.service.branches(r.identity.subject,b);}
 @Post('branches/:branchId/catalogue') @RequireResource('business','businessId','owner','manager')
 item(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:ItemInput){return this.service.createItem(r.identity.subject,b,v,i);}
 @Get('branches/:branchId/catalogue') @RequireResource('business','businessId','owner','manager','staff')
 items(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string){return this.service.items(r.identity.subject,b,v);}
 @Post('branches/:branchId/availability') @RequireResource('business','businessId','owner','manager')
 slot(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:SlotInput){return this.service.createSlot(r.identity.subject,b,v,i);}
 @Get('branches/:branchId/availability') @RequireResource('business','businessId','owner','manager','staff')
 slots(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string){return this.service.slots(r.identity.subject,b,v);}
 @Post('branches/:branchId/reservations') @RequireResource('business','businessId','owner','manager','staff')
 reserve(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:ReservationInput){return this.service.reserve(r.identity.subject,b,v,i);}
 @Get('branches/:branchId/reservations') @RequireResource('business','businessId','owner','manager','staff')
 reservations(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string){return this.service.reservations(r.identity.subject,b,v);}
 @Patch('branches/:branchId/reservations/:id/status') @RequireResource('business','businessId','owner','manager','staff')
 reservationStatus(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('id',new ParseUUIDPipe())id:string,@Body()i:ReservationTransition){return this.service.reservationStatus(r.identity.subject,b,v,id,i.status);}
 @Post('branches/:branchId/orders') @RequireResource('business','businessId','owner','manager','staff')
 placeOrder(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Body()i:OrderInput){return this.service.placeOrder(r.identity.subject,b,v,i);}
 @Get('branches/:branchId/orders') @RequireResource('business','businessId','owner','manager','staff')
 orders(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string){return this.service.orders(r.identity.subject,b,v);}
 @Patch('branches/:branchId/orders/:id/status') @RequireResource('business','businessId','owner','manager','staff')
 orderStatus(@Req()r:Request,@Param('businessId')b:string,@Param('branchId',new ParseUUIDPipe())v:string,@Param('id',new ParseUUIDPipe())id:string,@Body()i:OrderTransition){return this.service.orderStatus(r.identity.subject,b,v,id,i.status);}
}
