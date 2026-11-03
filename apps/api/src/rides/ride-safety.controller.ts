import {BadRequestException,Body,Controller,Get,Inject,Param,ParseUUIDPipe,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideSafetyService} from './ride-safety.service';
const reportSchema=z.object({kind:z.enum(['sos','accident','harassment','vehicle_issue','medical','other']),
 severity:z.enum(['normal','urgent','emergency']),requestKey:z.string().regex(/^[A-Za-z0-9_-]{16,120}$/)}).strict();
const resolveSchema=z.object({areaId:z.string().uuid(),status:z.enum(['investigating','resolved'])}).strict();
type Auth={identity:VerifiedIdentity};
@ApiTags('ride-safety') @ApiBearerAuth('keycloak')
@Controller({path:'ride-safety',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,RolesGuard)
export class RideSafetyController {
 constructor(@Inject(RideSafetyService)private readonly safety:RideSafetyService){}
 @Post('rides/:rideId/incidents') @RequireRoles('customer','driver')
 @ApiBody({schema:{type:'object',required:['kind','severity','requestKey'],properties:{kind:{type:'string'},severity:{type:'string'},requestKey:{type:'string'}}}})
 @ApiOkResponse({description:'Durable incident and escalation outbox entry, not proof of emergency responder notification'})
 report(@Req() r:Auth,@Param('rideId',ParseUUIDPipe) rideId:string,@Body() body:unknown){
  const x=reportSchema.safeParse(body);if(!x.success)throw new BadRequestException();
  return this.safety.report(r.identity.subject,rideId,x.data.kind,x.data.severity,x.data.requestKey);
 }
 @Get('incidents/:id') @RequireRoles('customer','driver')
 detail(@Req() r:Auth,@Param('id',ParseUUIDPipe) id:string){return this.safety.details(r.identity.subject,id);}
 @Patch('incidents/:id') @RequireRoles('dispatcher')
 @ApiBody({schema:{type:'object',required:['areaId','status'],properties:{areaId:{type:'string',format:'uuid'},status:{type:'string',enum:['investigating','resolved']}}}})
 decide(@Req() r:Auth,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  const x=resolveSchema.safeParse(body);if(!x.success)throw new BadRequestException();
  return this.safety.resolve(r.identity.subject,id,x.data.areaId,x.data.status);
 }
}
