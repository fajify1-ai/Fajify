import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideFareService} from './ride-fare.service';
import {RideRequestsService} from './ride-requests.service';

const coordinate=z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180)}).strict();
const quoteInput=z.object({pickup:coordinate,destination:coordinate,category:z.string().min(1).max(32)}).strict();
const rideInput=quoteInput.extend({quoteId:z.string().uuid(),idempotencyKey:z.string().min(16).max(120)}).strict();
function parse<T>(schema:z.ZodType<T>,input:unknown):T{
 const checked=schema.safeParse(input);
 if(!checked.success)throw new BadRequestException('Invalid ride request fields');
 return checked.data;
}
@ApiTags('rides-customer') @ApiBearerAuth('keycloak')
@UseGuards(IdentityGuard,AccountGuard,RolesGuard,CustomerWriteGuard)
@RequireRoles('customer')
@Controller({path:'customer/rides',version:'1'})
export class CustomerRidesController {
 constructor(@Inject(RideFareService)private readonly fares:RideFareService,@Inject(RideRequestsService)private readonly rides:RideRequestsService){}
 @Post('quotes')
 @ApiBody({schema:{type:'object',required:['pickup','destination','category'],properties:{pickup:{type:'object'},destination:{type:'object'},category:{type:'string'}}}})
 @ApiOkResponse({schema:{type:'object',properties:{id:{type:'string',format:'uuid'},amountMinor:{type:'string'},currency:{type:'string'},expiresAt:{type:'string',format:'date-time'},pricingVersion:{type:'string'},distanceBasis:{type:'string'}}}})
 quote(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown){return this.fares.quote(req.identity.subject,parse(quoteInput,body));}
 @Post() @ApiBody({schema:{type:'object',required:['pickup','destination','category','quoteId','idempotencyKey'],properties:{pickup:{type:'object'},destination:{type:'object'},category:{type:'string'},quoteId:{type:'string',format:'uuid'},idempotencyKey:{type:'string'}}}})
 @ApiOkResponse({schema:{type:'object',properties:{id:{type:'string',format:'uuid'},replayed:{type:'boolean'}}}})
 create(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown){return this.rides.create(req.identity.subject,parse(rideInput,body));}
 @Get() @ApiOkResponse({description:'Current customer ride history'})
 history(@Req() req:{identity:VerifiedIdentity},@Query('limit') max?:string,@Query('offset') start?:string){
  const limit=max===undefined?20:Number(max),offset=start===undefined?0:Number(start);
  if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000)
   throw new BadRequestException('Invalid pagination');
  return this.rides.history(req.identity.subject,limit,offset);
 }
 @Get(':id') @ApiOkResponse({description:'Owned ride only'})
 get(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){return this.rides.get(req.identity.subject,id);}
}
