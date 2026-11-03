import {BadRequestException,Body,Controller,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideRequestsService} from './ride-requests.service';
import {RideService} from './ride.service';
const schema=z.object({driverId:z.string().uuid(),areaId:z.string().uuid(),validForSeconds:z.number().int().min(5).max(120)}).strict();
@ApiTags('ride-dispatch') @ApiBearerAuth('keycloak')
@UseGuards(IdentityGuard,AccountGuard,RolesGuard)
@RequireRoles('dispatcher')
@Controller({path:'dispatch',version:'1'})
export class RideDispatchController {
 constructor(@Inject(RideRequestsService)private readonly requests:RideRequestsService,@Inject(RideService)private readonly rides:RideService){}
 @Post('rides/:id/offers')
 async offer(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) rideId:string,@Body() body:unknown){
  const p=schema.safeParse(body);
  if(!p.success)throw new BadRequestException('Invalid dispatch offer');
  await this.requests.offerByDispatcher(req.identity.subject,p.data.areaId);
  return this.rides.offer(rideId,p.data.driverId,req.identity.subject,new Date(Date.now()+p.data.validForSeconds*1000));
 }
}
