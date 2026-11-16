import {CanActivate,ExecutionContext,ForbiddenException,Injectable,Optional,Inject} from '@nestjs/common';
import type {VerifiedIdentity} from './identity.types';

/** Privileged actions require an operator-granted admin role and a fresh password sign-in. */
@Injectable()
export class PrivilegedGuard implements CanActivate {
 constructor(@Optional() @Inject('FAJI_AUTH_CLOCK') private readonly now:()=>number=()=>Math.floor(Date.now()/1000)){}
 canActivate(context:ExecutionContext):boolean {
  const identity=context.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  const now=this.now();
  if(!identity||!identity.roles.includes('platform-admin')||
     !identity.authTime||!Number.isInteger(identity.authTime)||identity.authTime>now||
     now-identity.authTime>300)throw new ForbiddenException('Privileged authentication required');
  return true;
 }
}
