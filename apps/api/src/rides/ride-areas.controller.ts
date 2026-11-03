import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideAreasService} from './ride-areas.service';
const areaSchema=z.object({name:z.string().trim().min(3).max(120),geojson:z.string().min(20).max(20000)}).strict();
const toggleSchema=z.object({active:z.boolean()}).strict();
@ApiTags('ride-dispatch-areas') @ApiBearerAuth('keycloak')
@Controller({path:'dispatch/areas',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,RolesGuard,CustomerWriteGuard)
export class RideAreasController {
 constructor(@Inject(RideAreasService)private readonly areas:RideAreasService){}
 @Post() @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['name','geojson'],properties:{name:{type:'string'},geojson:{type:'string'}}}})
 @ApiOkResponse({description:'Inactive dispatch boundary pending activation'})
 create(@Req() req:{identity:VerifiedIdentity},@Body() body:unknown){
  const p=areaSchema.safeParse(body);if(!p.success)throw new BadRequestException('Invalid area');
  return this.areas.create(req.identity.subject,p.data.name,p.data.geojson);
 }
 @Patch(':id') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['active'],properties:{active:{type:'boolean'}}}})
 @ApiOkResponse({description:'Audited geofence activation/deactivation'})
 update(@Req() req:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  const p=toggleSchema.safeParse(body);if(!p.success)throw new BadRequestException('Invalid active state');
  return this.areas.setActive(req.identity.subject,id,p.data.active);
 }
 @Get(':areaId/rides') @RequireRoles('dispatcher')
 @ApiOkResponse({description:'Area-scoped active ride and incident overview'})
 monitor(@Req() req:{identity:VerifiedIdentity},@Param('areaId',ParseUUIDPipe) areaId:string,@Query('limit') raw?:string){
  const limit=raw===undefined?50:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Invalid monitor limit');
  return this.areas.monitor(req.identity.subject,areaId,limit);
 }
 @Get(':areaId/rides/:rideId/candidates') @RequireRoles('dispatcher')
 candidates(@Req() req:{identity:VerifiedIdentity},@Param('areaId',ParseUUIDPipe) areaId:string,@Param('rideId',ParseUUIDPipe) rideId:string,@Query('limit') raw?:string){
  const limit=raw===undefined?20:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>50)throw new BadRequestException('Invalid candidate limit');
  return this.areas.candidates(req.identity.subject,areaId,rideId,limit);
 }
}
