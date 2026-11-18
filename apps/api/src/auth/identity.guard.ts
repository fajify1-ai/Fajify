import { CanActivate,ExecutionContext,Inject,Injectable,UnauthorizedException } from '@nestjs/common';
import { extractBearerToken,IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
import {normalizeAuthenticationOrigins} from './auth-origins';
@Injectable()
export class IdentityGuard implements CanActivate {
 constructor(@Inject(IDENTITY_VERIFIER) private readonly verifier: IdentityVerifier){}
 async canActivate(ctx: ExecutionContext){
  const req=ctx.switchToHttp().getRequest<{method?:string;headers:{authorization?:string;cookie?:string;origin?:string},identity?:unknown}>();
  const token=extractBearerToken(req.headers.authorization);
  if((req.headers.authorization&&!token)||(!token&&!req.headers.cookie))throw new UnauthorizedException();
  if(!token&&req.method&&!['GET','HEAD','OPTIONS'].includes(req.method)&&!normalizeAuthenticationOrigins(process.env.FAJI_WEB_ORIGINS??'').includes(req.headers.origin??''))throw new UnauthorizedException('Trusted origin required');
  const headers=new Headers(req.headers as Record<string,string>);if(token){headers.delete('cookie');headers.set('authorization',`Bearer ${token}`);}
  try { req.identity=await (this.verifier.verifyHeaders ? this.verifier.verifyHeaders(headers) : this.verifier.verifyAccessToken(token??''));return true; }
  catch {throw new UnauthorizedException();}
 }
}
