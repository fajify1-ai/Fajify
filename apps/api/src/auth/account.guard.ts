import {CanActivate,ExecutionContext,Injectable,UnauthorizedException} from '@nestjs/common';
import {AccessService} from './access.service';
import type {VerifiedIdentity} from './identity.types';
@Injectable()
export class AccountGuard implements CanActivate {
 constructor(private readonly access:AccessService){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const identity=ctx.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  if(!identity)throw new UnauthorizedException();
  try{
   const state=await this.access.state(identity.subject);
   if(state.suspended||state.revokedAfter && state.revokedAfter.getTime()/1000>=identity.issuedAt)return false;
   return true;
  }catch{return false;}
 }
}
