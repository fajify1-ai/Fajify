import {CanActivate,ExecutionContext,ForbiddenException,Injectable,SetMetadata} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {VerifiedIdentity} from './identity.types';

export const REQUIRED_ROLES='faji:required-roles';
/** Declare coarse role requirements; tenant ownership is separately verified against PostgreSQL. */
export const RequireRoles=(...roles:string[])=>SetMetadata(REQUIRED_ROLES,roles);

@Injectable()
export class RolesGuard implements CanActivate {
 constructor(private readonly reflector:Reflector){}
 canActivate(ctx:ExecutionContext):boolean{
  const required=this.reflector.getAllAndOverride<readonly string[]>(REQUIRED_ROLES,[ctx.getHandler(),ctx.getClass()]);
  if(!required||required.length===0)return true;
  const identity=ctx.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  if(!identity||!required.some(role=>identity.roles.includes(role)))throw new ForbiddenException();
  return true;
 }
}
