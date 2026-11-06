import {BadRequestException,CanActivate,Controller,ExecutionContext,Get,Header,HttpCode,Inject,Injectable,Param,ParseUUIDPipe,Post,Put,Query,Req,UseGuards,Body} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiParam,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {CustomerBookingRideInput,CustomerBookingRidePage,CustomerBookingRideView} from './customer-booking-ride.dto';
import {CustomerBookingRideService} from './customer-booking-ride.service';

@Injectable()
export class BookingRideEmptyBodyGuard implements CanActivate {
 canActivate(ctx:ExecutionContext){
  const body=ctx.switchToHttp().getRequest<{body?:unknown}>().body;
  if(body!==undefined&&body!==null&&(typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))
   throw new BadRequestException('Unlink accepts no request body');
  return true;
 }
}
@ApiTags('customer-booking-ride') @ApiBearerAuth('keycloak')
@Controller({path:'customer/integrations/booking-rides',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class CustomerBookingRideController {
 constructor(@Inject(CustomerBookingRideService)private readonly service:CustomerBookingRideService){}
 @Post() @HttpCode(200) @ApiBody({type:CustomerBookingRideInput}) @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CustomerBookingRideView})
 bind(@Req()req:{identity:VerifiedIdentity},@Body(validated(CustomerBookingRideInput))body:CustomerBookingRideInput){
  return this.service.bind(req.identity,body);
 }
 @Get() @pagination() @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CustomerBookingRidePage})
 list(@Req()req:{identity:VerifiedIdentity},@Query(validated(PageQuery))q:PageQuery){
  return this.service.list(req.identity.subject,q);
 }
 @Put(':id/unlink') @UseGuards(BookingRideEmptyBodyGuard)
 @ApiBody({required:false,schema:{type:'object',additionalProperties:false}})
 @ApiParam({name:'id',schema:{type:'string',format:'uuid'}}) @Header('Cache-Control','no-store')
 @ApiOkResponse({type:CustomerBookingRideView})
 unlink(@Req()req:{identity:VerifiedIdentity},@Param('id',new ParseUUIDPipe())id:string){
  return this.service.unlink(req.identity,id);
 }
}
