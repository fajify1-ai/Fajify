import {BadRequestException,Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, ValidationPipe} from '@nestjs/common';
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
 @Get('driver/offers') @ApiOkResponse({description:'Driver-owned active offer inbox'})
 offers(@Req() request:AuthRequest,@Query('limit') raw?:string){
  const limit=raw===undefined?20:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new BadRequestException('Invalid limit');
  return this.rides.driverOffers(request.identity.subject,limit);
 }
 @Get('driver/trips') @ApiOkResponse({description:'Driver-owned assigned trip history'})
 trips(@Req() request:AuthRequest,@Query('limit') raw?:string){
  const limit=raw===undefined?20:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new BadRequestException('Invalid limit');
  return this.rides.driverTrips(request.identity.subject,limit);
 }
 @Post('offers/:id/accept') @ApiOkResponse({description:'Concurrently fenced driver assignment'})
 accept(@Req() request:AuthRequest,@Param('id',ParseUUIDPipe) id:string){
  return this.rides.acceptOffer(id,request.identity.subject);
 }
 @Patch(':id/state') @ApiBody({schema:{type:'object',required:['to'],properties:{to:{type:'string',enum:['driver_arriving','driver_arrived','in_progress','completed']}}}})
 @ApiOkResponse({description:'Authoritative trip transition'})
 transition(@Req() request:AuthRequest,@Param('id',ParseUUIDPipe) id:string,@Body(strict) input:TripTransitionInput){
  return this.rides.transition(id,request.identity.subject,input.to);
 }
 @Post('driver/location/revoke') @ApiOkResponse({description:'Delete consented GPS and set driver offline'})
 revoke(@Req() request:AuthRequest){return this.rides.revokeLocation(request.identity.subject);}
 @Post('driver/location') @ApiBody({schema:{type:'object',required:['latitude','longitude','observedAt','sequence','consentGranted'],properties:{latitude:{type:'number'},longitude:{type:'number'},observedAt:{type:'string',format:'date-time'},sequence:{type:'integer'},consentGranted:{type:'boolean'}}}})
 @ApiOkResponse({description:'Fresh, sequenced and consented GPS update'})
 location(@Req() request:AuthRequest,@Body(strict) input:LocationInput){
  return this.rides.location(request.identity.subject,input.latitude,input.longitude,new Date(input.observedAt),input.sequence,input.consentGranted);
 }
}
