import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
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
@UseGuards(IdentityGuard,AccountGuard)
@Controller({path:'customer/rides',version:'1'})
export class CustomerRidesController {
 constructor(@Inject(RideFareService)private readonly fares:RideFareService,@Inject(RideRequestsService)private readonly rides:RideRequestsService){}
 @Post('quotes')
 quote(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown){return this.fares.quote(req.identity.subject,parse(quoteInput,body));}
 @Post()
 create(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown){return this.rides.create(req.identity.subject,parse(rideInput,body));}
 @Get(':id')
 get(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string){return this.rides.get(req.identity.subject,id);}
}
