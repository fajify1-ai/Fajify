import {CanActivate,ExecutionContext,HttpException,HttpStatus,Injectable} from '@nestjs/common';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';

/** Privileged API mutations are limited to 20 requests per actor per minute
 * using PostgreSQL transactions and an advisory lock (not process-local memory).
 */
@Injectable()
export class AdminRateGuard implements CanActivate {
 constructor(private readonly access:AccessService){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const identity=ctx.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  if(!identity)throw new HttpException('Unauthorized',HttpStatus.UNAUTHORIZED);
  try{
   const allowed=await this.access.allowPrivilegedRequest(identity.subject);
   if(!allowed)throw new HttpException('Administrative request limit exceeded',HttpStatus.TOO_MANY_REQUESTS);
   return true;
  }catch(error){
   if(error instanceof HttpException)throw error;
   throw new HttpException('Administrative authorization unavailable',HttpStatus.SERVICE_UNAVAILABLE);
  }
 }
}
