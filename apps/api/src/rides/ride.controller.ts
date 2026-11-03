import {Body, Controller, Inject, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards, ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsIn,IsInt,IsISO8601,IsLatitude,IsLongitude,Min} from 'class-validator';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideService} from './ride.service';

class LocationInput {
 @IsLatitude() latitude!:number;
 @IsLongitude() longitude!:number;
 @IsISO8601({strict:true}) observedAt!:string;
 @IsInt() @Min(0) sequence!:number;
 @IsBoolean() consentGranted!:boolean;
}
class TripTransitionInput {
 @IsIn(['driver_arriving','driver_arrived','in_progress','completed'])
 to!: 'driver_arriving'|'driver_arrived'|'in_progress'|'completed';
}
type AuthRequest={identity:VerifiedIdentity};
const strict = new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true});
@ApiTags('rides') @ApiBearerAuth('keycloak')
@UseGuards(IdentityGuard,AccountGuard,RolesGuard) @RequireRoles('driver')
@Controller({path:'rides',version:'1'})
export class RideController {
 constructor(@Inject(RideService)private readonly rides:RideService){}
 @Post('offers/:id/accept')
 accept(@Req() request:AuthRequest,@Param('id',ParseUUIDPipe) id:string){
  return this.rides.acceptOffer(id,request.identity.subject);
 }
 @Patch(':id/state')
 transition(@Req() request:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body(strict) input:TripTransitionInput){
  return this.rides.transition(id,request.identity.subject,input.to);
 }
 @Post('driver/location/revoke')
 revoke(@Req() request:AuthRequest){return this.rides.revokeLocation(request.identity.subject);}
 @Post('driver/location')
 location(@Req() request:AuthRequest,@Body(strict) input:LocationInput){
  return this.rides.location(request.identity.subject,input.latitude,input.longitude,new Date(input.observedAt),input.sequence,input.consentGranted);
 }
}
