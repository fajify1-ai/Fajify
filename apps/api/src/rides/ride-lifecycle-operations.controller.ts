import {BadRequestException,Body,Controller,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideLifecycleOperations} from './ride-lifecycle-operations.service';
import {RideAreasService} from './ride-areas.service';
const reassignSchema=z.object({areaId:z.string().uuid()}).strict();
type Request={identity:VerifiedIdentity};
@ApiTags('ride-operations') @ApiBearerAuth('keycloak')
@Controller({path:'',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,RolesGuard)
export class RideLifecycleOperationsController {
 constructor(@Inject(RideLifecycleOperations)private readonly service:RideLifecycleOperations,
             @Inject(RideAreasService)private readonly areas:RideAreasService){}
 @Post('customer/rides/:id/cancellation') @RequireRoles('customer')
 @ApiOkResponse({description:'Cancel owned ride before arrival; verified payments require refund review'})
 cancel(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){
  return this.service.customerCancel(r.identity.subject,id);
 }
 @Post('dispatch/rides/:id/reassignment') @RequireRoles('dispatcher')
 @ApiBody({schema:{type:'object',required:['areaId'],properties:{areaId:{type:'string',format:'uuid'}}}})
 @ApiOkResponse({description:'Fenced requeue of a ride before driver arrival; requires active area membership'})
 async reassign(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  const x=reassignSchema.safeParse(body);if(!x.success)throw new BadRequestException('Invalid dispatch area');
  await this.areas.requireDispatcher(r.identity.subject,x.data.areaId);
  return this.service.reassign(r.identity.subject,id,x.data.areaId);
 }
}
