import { CanActivate,ExecutionContext,Inject,Injectable,UnauthorizedException } from '@nestjs/common';
import { extractBearerToken,IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
@Injectable()
export class IdentityGuard implements CanActivate {
 constructor(@Inject(IDENTITY_VERIFIER) private readonly verifier: IdentityVerifier){}
 async canActivate(ctx: ExecutionContext){
  const req=ctx.switchToHttp().getRequest<{headers:{authorization?:string},identity?:unknown}>();
  const token=extractBearerToken(req.headers.authorization);
  if(!token) throw new UnauthorizedException();
  try { req.identity=await this.verifier.verifyAccessToken(token);return true; }
  catch {throw new UnauthorizedException();}
 }
}
