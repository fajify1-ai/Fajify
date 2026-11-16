import { CanActivate,ExecutionContext,Inject,Injectable,UnauthorizedException } from '@nestjs/common';
import { extractBearerToken,IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
@Injectable()
export class IdentityGuard implements CanActivate {
 constructor(@Inject(IDENTITY_VERIFIER) private readonly verifier: IdentityVerifier){}
 async canActivate(ctx: ExecutionContext){
  const req=ctx.switchToHttp().getRequest<{headers:{authorization?:string;cookie?:string},identity?:unknown}>();
  const token=extractBearerToken(req.headers.authorization);
  if((req.headers.authorization&&!token)||(!token&&!req.headers.cookie))throw new UnauthorizedException();
  try { req.identity=await (this.verifier.verifyHeaders ? this.verifier.verifyHeaders(new Headers(req.headers as Record<string,string>)) : this.verifier.verifyAccessToken(token??''));return true; }
  catch {throw new UnauthorizedException();}
 }
}
