import {CanActivate,ExecutionContext,ForbiddenException,Injectable,SetMetadata,BadRequestException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {AccessService,type ResourceType} from './access.service';
import type {VerifiedIdentity} from './identity.types';
export const RESOURCE_POLICY='faji:resource-policy';
export type ResourcePolicy={type:ResourceType;param:string;roles:readonly string[]};
export const RequireResource=(type:ResourceType,param:string,...roles:string[])=>SetMetadata(RESOURCE_POLICY,{type,param,roles} satisfies ResourcePolicy);
@Injectable()
export class ResourceGuard implements CanActivate {
 constructor(private readonly reflector:Reflector,private readonly access:AccessService){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const policy=this.reflector.getAllAndOverride<ResourcePolicy>(RESOURCE_POLICY,[ctx.getHandler(),ctx.getClass()]);
  if(!policy)return true;
  const request=ctx.switchToHttp().getRequest<{identity?:VerifiedIdentity;params?:Record<string,string>}>();
  if(!request.identity)throw new ForbiddenException();
  const id=request.params?.[policy.param];
  if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new BadRequestException('Invalid resource identifier');
  try{return await this.access.member(request.identity.subject,policy.type,id,policy.roles);}
  catch{return false;}
 }
}
