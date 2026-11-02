import {applyDecorators, Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOkResponse, ApiCreatedResponse, ApiTags, ApiParam, ApiQuery} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerService} from './customer.service';
import {MarketplaceService} from './marketplace.service';
import {OfferingDetail} from './marketplace.dto';
import {CustomerWriteGuard} from './customer-write.guard';
import {CustomerOrderInput, CustomerReservationInput, DiscoveryQuery, OfferingPage, OrderDetail, OrderPage, PageQuery, ReservationPage, ReservationView, SlotPage} from './customer.dto';

const body=<T extends object>(type:new()=>T)=>new ValidationPipe({expectedType:type,whitelist:true,forbidNonWhitelisted:true,transform:true});
const pagination=()=>applyDecorators(
 ApiQuery({name:'limit',required:false,schema:{type:'integer',minimum:1,maximum:50,default:20}}),
 ApiQuery({name:'offset',required:false,schema:{type:'integer',minimum:0,maximum:10000,default:0}}),
);
const resourceId=()=>ApiParam({name:'id',schema:{type:'string',format:'uuid'}});
type AuthenticatedRequest={identity:VerifiedIdentity};

@ApiTags('customer-discovery')
@Controller({path:'discovery',version:'1'})
export class DiscoveryController {
 constructor(@Inject(CustomerService) private readonly service:CustomerService,@Inject(MarketplaceService) private readonly marketplace:MarketplaceService){}
 @Get('offerings') @ApiOkResponse({type:OfferingPage}) @pagination()
 @ApiQuery({name:'q',required:false,schema:{type:'string',minLength:1,maxLength:120}})
 @ApiQuery({name:'location',required:false,description:'Literal branch address match; no radius search.',schema:{type:'string',minLength:1,maxLength:120}})
 @ApiQuery({name:'category',required:false,enum:['product','service','package','event']})
 @ApiQuery({name:'branchId',required:false,schema:{type:'string',format:'uuid'}})
 discover(@Query(body(DiscoveryQuery)) query:DiscoveryQuery){return this.service.discover(query);}
 @Get('offerings/:id') @ApiOkResponse({type:OfferingDetail}) @resourceId()
 detail(@Param('id',new ParseUUIDPipe()) id:string){return this.marketplace.offering(id);}
 @Get('offerings/:id/availability') @ApiOkResponse({type:SlotPage}) @resourceId() @pagination()
 slots(@Param('id',new ParseUUIDPipe()) id:string,@Query(body(PageQuery)) query:PageQuery){return this.service.slots(id,query);}
}

@ApiTags('customer-workflows') @ApiBearerAuth('keycloak')
@Controller({path:'customer',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class CustomerController {
 constructor(@Inject(CustomerService) private readonly service:CustomerService){}
 @Post('reservations') @ApiBody({type:CustomerReservationInput}) @ApiCreatedResponse({type:ReservationView})
 reserve(@Req() r:AuthenticatedRequest,@Body(body(CustomerReservationInput)) input:CustomerReservationInput){return this.service.reserve(r.identity,input);}
 @Get('reservations') @ApiOkResponse({type:ReservationPage}) @pagination()
 reservations(@Req() r:AuthenticatedRequest,@Query(body(PageQuery)) query:PageQuery){return this.service.reservations(r.identity.subject,query);}
 @Get('reservations/:id') @ApiOkResponse({type:ReservationView}) @resourceId()
 reservation(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.reservationDetail(r.identity.subject,id);}
 @Post('reservations/:id/cancellation') @ApiCreatedResponse({type:ReservationView}) @resourceId()
 cancelReservation(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.cancelReservation(r.identity,id);}
 @Post('orders') @ApiBody({type:CustomerOrderInput}) @ApiCreatedResponse({type:OrderDetail})
 order(@Req() r:AuthenticatedRequest,@Body(body(CustomerOrderInput)) input:CustomerOrderInput){return this.service.placeOrder(r.identity,input);}
 @Get('orders') @ApiOkResponse({type:OrderPage}) @pagination()
 orders(@Req() r:AuthenticatedRequest,@Query(body(PageQuery)) query:PageQuery){return this.service.orders(r.identity.subject,query);}
 @Get('orders/:id') @ApiOkResponse({type:OrderDetail}) @resourceId()
 orderDetail(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.orderDetail(r.identity.subject,id);}
 @Post('orders/:id/cancellation') @ApiCreatedResponse({type:OrderDetail}) @resourceId()
 cancelOrder(@Req() r:AuthenticatedRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.cancelOrder(r.identity,id);}
}
