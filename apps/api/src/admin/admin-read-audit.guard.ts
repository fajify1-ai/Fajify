import {CanActivate,ExecutionContext,Inject,Injectable,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';

/** Audit a *request* to read privileged M8 data, not its eventual outcome.
 * Run after identity, account, MFA, scope and shared rate guards.
 * The static Nest controller/handler identifier excludes path/query/PII.
 */
@Injectable()
export class AdminReadAuditGuard implements CanActivate {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const req=ctx.switchToHttp().getRequest<{method?:string;identity?:VerifiedIdentity}>();
  if(req.method!=='GET')return true;
  if(!req.identity?.subject)throw new UnauthorizedException();
  const resourceId=(ctx.getClass().name+':'+ctx.getHandler().name).slice(0,255);
  try{
   await this.pool.query(
    "INSERT INTO admin_action_events(actor_subject,operation,resource_type,resource_id,outcome) VALUES($1,'admin.read_requested','admin_endpoint',$2,'applied')",
    [req.identity.subject,resourceId]);
   return true;
  }catch{throw new ServiceUnavailableException('Administrative audit unavailable');}
 }
}
