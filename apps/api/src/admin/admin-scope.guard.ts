import {CanActivate,ExecutionContext,ForbiddenException,Inject,Injectable,ServiceUnavailableException,SetMetadata} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';

export type AdminScope='operations.read'|'audit.read'|'governance.read'|'governance.write'|
 'finance.read'|'support.read'|'support.write'|'integrations.read'|'reports.read'|'monitoring.read'|'incidents.write';
const ADMIN_SCOPE_KEY='faji:m8:required-admin-scope';
export const RequireAdminScope=(scope:AdminScope)=>SetMetadata(ADMIN_SCOPE_KEY,scope);
export const RequireAdminScopes=(...scopes:AdminScope[])=>SetMetadata(ADMIN_SCOPE_KEY,scopes);

/** A signed platform-admin role is necessary but insufficient.
 * An operator must provision the *individual* M8 scope in PostgreSQL.
 */
@Injectable()
export class AdminScopeGuard implements CanActivate {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const scope=Reflect.getMetadata(ADMIN_SCOPE_KEY,ctx.getHandler()) as AdminScope|AdminScope[]|undefined;
  const identity=ctx.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  if(!scope||!identity?.subject)throw new ForbiddenException('Administrative scope required');
  try{
   if(Array.isArray(scope)){
    if(!scope.length||new Set(scope).size!==scope.length)throw new ForbiddenException('Administrative scope required');
    const result=await this.pool.query<{scope:string}>(
     'SELECT scope FROM admin_scope_grants WHERE identity_subject=$1 AND scope=ANY($2::varchar[]) AND active=true',
     [identity.subject,scope]);
    if(new Set(result.rows.map(r=>r.scope)).size!==scope.length)throw new ForbiddenException('Administrative scope required');
   }else{
    const result=await this.pool.query(
     'SELECT 1 FROM admin_scope_grants WHERE identity_subject=$1 AND scope=$2 AND active=true LIMIT 1',
     [identity.subject,scope]);
    if(result.rowCount!==1)throw new ForbiddenException('Administrative scope required');
   }
   return true;
  }catch(error){
   if(error instanceof ForbiddenException)throw error;
   throw new ServiceUnavailableException('Administrative scope database unavailable');
  }
 }
}
