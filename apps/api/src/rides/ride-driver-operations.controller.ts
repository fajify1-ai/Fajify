import {BadRequestException,Body,Controller,Inject,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiBody,ApiOkResponse} from '@nestjs/swagger';
import {z} from 'zod';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RolesGuard,RequireRoles} from '../auth/roles.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideDriverOperations} from './ride-driver-operations.service';
type Request={identity:VerifiedIdentity};
const doc=z.object({kind:z.enum(['licence','identification','insurance','vehicle_registration']),privateObjectKey:z.string().min(40).max(250),expiresAt:z.string().datetime({offset:true})}).strict();
const review=z.object({approve:z.boolean()}).strict();
const active=z.object({available:z.boolean()}).strict();
const suspension=z.object({suspend:z.boolean()}).strict();
const bank=z.object({recipientReference:z.string().regex(/^[A-Za-z0-9_-]{8,160}$/)}).strict();
function parse<T>(schema:z.ZodType<T>,body:unknown):T{
 const r=schema.safeParse(body);if(!r.success)throw new BadRequestException('Invalid driver operation request');return r.data;
}
@ApiTags('ride-driver-operations') @ApiBearerAuth('keycloak')
@Controller({path:'drivers',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,RolesGuard)
export class RideDriverOperationsController {
 constructor(@Inject(RideDriverOperations)private readonly ops:RideDriverOperations){}
 @Post('me/documents') @RequireRoles('driver')
 @ApiBody({schema:{type:'object',required:['kind','privateObjectKey','expiresAt'],properties:{kind:{type:'string',enum:['licence','identification','insurance','vehicle_registration']},privateObjectKey:{type:'string'},expiresAt:{type:'string',format:'date-time'}}}})
 @ApiOkResponse({description:'Submitted for independent review; upload existence must be validated operationally'})
 document(@Req() r:Request,@Body() body:unknown){
  const x=parse(doc,body);return this.ops.document(r.identity.subject,x.kind,x.privateObjectKey,new Date(x.expiresAt));
 }
 @Post('me/availability') @RequireRoles('driver')
 @ApiBody({schema:{type:'object',required:['available'],properties:{available:{type:'boolean'}}}})
 availability(@Req() r:Request,@Body() body:unknown){const x=parse(active,body);return this.ops.availability(r.identity.subject,x.available);}
 @Post('me/payout-recipient') @RequireRoles('driver')
 @ApiBody({schema:{type:'object',required:['recipientReference'],properties:{recipientReference:{type:'string'}}}})
 payout(@Req() r:Request,@Body() body:unknown){return this.ops.bankReference(r.identity.subject,parse(bank,body).recipientReference);}
 @Post('documents/:id/review') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['approve'],properties:{approve:{type:'boolean'}}}})
 reviewDocument(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  return this.ops.reviewDocument(r.identity.subject,id,parse(review,body).approve);
 }
 @Post('vehicles/:id/review') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['approve'],properties:{approve:{type:'boolean'}}}})
 reviewVehicle(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  return this.ops.reviewVehicle(r.identity.subject,id,parse(review,body).approve);
 }
 @Post(':id/suspension') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['suspend'],properties:{suspend:{type:'boolean'}}}})
 suspend(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  return this.ops.suspend(r.identity.subject,id,parse(suspension,body).suspend);
 }
 @Post(':id/payout-recipient/verify') @RequireRoles('platform-admin') @UseGuards(PrivilegedGuard)
 @ApiBody({schema:{type:'object',required:['recipientReference'],properties:{recipientReference:{type:'string'}}}})
 verifyPayout(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
  return this.ops.verifyBankReference(r.identity.subject,id,parse(bank,body).recipientReference);
 }
}
