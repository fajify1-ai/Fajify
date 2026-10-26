import {CanActivate,ExecutionContext,ForbiddenException,Injectable,Optional,Inject} from '@nestjs/common';
import type {VerifiedIdentity} from './identity.types';

/** Require a validated elevated Keycloak ACR, with a fresh authentication event.
 * The Keycloak realm must map this ACR only to an enforced MFA authentication flow;
 * a token claim alone does not prove that a realm flow was configured correctly.
 */
@Injectable()
export class PrivilegedGuard implements CanActivate {
 constructor(@Optional() @Inject('FAJI_PRIVILEGED_ACR') private readonly requiredAcr=process.env.KEYCLOAK_PRIVILEGED_ACR??'faji-mfa',
             @Optional() @Inject('FAJI_AUTH_CLOCK') private readonly now:()=>number=()=>Math.floor(Date.now()/1000)){}
 canActivate(context:ExecutionContext):boolean {
  const identity=context.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  const now=this.now();
  if(!identity||!identity.roles.includes('platform-admin')||
     identity.authorizedParty!=='faji-admin-web'||
     identity.authContext!==this.requiredAcr||!identity.authTime||
     !Number.isInteger(identity.authTime)||identity.authTime>now||
     now-identity.authTime>300)throw new ForbiddenException('Privileged authentication required');
  return true;
 }
}
