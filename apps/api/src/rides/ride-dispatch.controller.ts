import {BadRequestException,Body,Controller,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideAreasService} from './ride-areas.service';
import {RideService} from './ride.service';
const schema=z.object({driverId:z.string().uuid(),areaId:z.string().uuid(),validForSeconds:z.number().int().min(5).max(120)}).strict();
const matching=z.object({areaId:z.string().uuid(),offerCount:z.number().int().min(1).max(5),validForSeconds:z.number().int().min(5).max(120)}).strict();
@ApiTags('ride-dispatch') @ApiBearerAuth('keycloak')
@UseGuards(IdentityGuard,AccountGuard,RolesGuard)
@RequireRoles('dispatcher')
@Controller({path:'dispatch',version:'1'})
export class RideDispatchController {
 constructor(@Inject(RideRequestsService)private readonly areas:RideAreasService,@Inject(RideService)private readonly rides:RideService){}
 @Post('rides/:id/match')
 async match(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) rideId:string,@Body() body:unknown){
  const p=matching.safeParse(body);
  if(!p.success)throw new BadRequestException('Invalid dispatch matching request');
  await this.areas.requireDispatcher(req.identity.subject,p.data.areaId);
  const nearby=await this.areas.candidates(req.identity.subject,p.data.areaId,rideId,p.data.offerCount);
  const offers:{driverId:string;offerId:string}[]=[];
  for(const candidate of nearby.candidates){
   try{
    const offer=await this.rides.offer(rideId,candidate.driverId,req.identity.subject,
      new Date(Date.now()+p.data.validForSeconds*1000),p.data.areaId);
    offers.push({driverId:candidate.driverId,offerId:offer.id});
   }catch(error){
    // An offer candidate may disappear or be claimed concurrently.
    if(!(error instanceof Error))throw error;
    if(!['ConflictException','ForbiddenException'].includes(error.constructor.name))throw error;
   }
  }
  return {rideId,areaId:p.data.areaId,offers};
 }
 @Post('rides/:id/offers')
 async offer(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) rideId:string,@Body() body:unknown){
  const p=schema.safeParse(body);
  if(!p.success)throw new BadRequestException('Invalid dispatch offer');
  await this.areas.requireDispatcher(req.identity.subject,p.data.areaId);
  return this.rides.offer(rideId,p.data.driverId,req.identity.subject,new Date(Date.now()+p.data.validForSeconds*1000),p.data.areaId);
 }
}
