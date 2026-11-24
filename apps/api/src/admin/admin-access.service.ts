import {ConflictException,ForbiddenException,Inject,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {Pool,type QueryResult} from 'pg';
import {DATABASE_POOL} from '../tokens';
import type {VerifiedIdentity} from '../auth/identity.types';
import {AdminCommandService} from './admin-command.service';
import type {AdminScope} from './admin-scope.guard';
import type {AdminAccessInput,AdminAccessManagerView,ManagedAdminView} from './admin-access.dto';

function ownerEmail():string|null{
 const email=process.env.FAJI_PLATFORM_ADMIN_OWNER_EMAIL?.trim().toLowerCase();
 return email&&email.length<=254?email:null;
}

@Injectable()
export class PlatformAdminOwnerGuard {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool){}
 async canActivate(context:import('@nestjs/common').ExecutionContext):Promise<boolean>{
  const identity=context.switchToHttp().getRequest<{identity?:VerifiedIdentity}>().identity;
  const email=ownerEmail();
  if(!email)throw new ServiceUnavailableException('Platform admin manager is not configured');
  if(!identity?.subject)throw new ForbiddenException('Platform admin manager access required');
  let result:QueryResult;
  try{
   result=await this.pool.query(
   `SELECT 1 FROM auth_user u
    JOIN platform_admin_owner owner ON owner.singleton=true AND owner.identity_subject=u.id
    JOIN application_roles r ON r.identity_subject=u.id AND r.role='platform-admin'
    JOIN account_access a ON a.identity_subject=u.id AND a.suspended=false AND a.revoked_after IS NULL
    JOIN user_profiles p ON p.identity_subject=u.id AND p.suspended=false
    WHERE u.id=$1 AND lower(u.email)=$2 AND u.email_verified=true`,
    [identity.subject,email]);
  }catch{throw new ServiceUnavailableException('Admin manager identity could not be verified');}
  if(result.rowCount!==1)throw new ForbiddenException('Platform admin manager access required');
  return true;
 }
}

@Injectable()
export class AdminAccessService {
 constructor(
  @Inject(DATABASE_POOL)private readonly pool:Pool,
  @Inject(AdminCommandService)private readonly commands:AdminCommandService
 ){}

 async manager(identity:VerifiedIdentity):Promise<AdminAccessManagerView>{
  const email=ownerEmail();
  if(!email)return {canManageAdmins:false,managerSubject:null};
  let result:QueryResult;
  try{
   result=await this.pool.query(
   `SELECT 1 FROM auth_user u
    JOIN platform_admin_owner owner ON owner.singleton=true AND owner.identity_subject=u.id
    JOIN application_roles r ON r.identity_subject=u.id AND r.role='platform-admin'
    JOIN account_access a ON a.identity_subject=u.id AND a.suspended=false AND a.revoked_after IS NULL
    JOIN user_profiles p ON p.identity_subject=u.id AND p.suspended=false
    WHERE u.id=$1 AND lower(u.email)=$2 AND u.email_verified=true`,
    [identity.subject,email]);
  }catch{throw new ServiceUnavailableException('Admin manager identity could not be verified');}
  const canManageAdmins=result.rowCount===1;
  return {canManageAdmins,managerSubject:canManageAdmins?identity.subject:null};
 }

 async admins():Promise<ManagedAdminView[]>{
  const result=await this.pool.query<{
   subject:string;email:string;email_verified:boolean;suspended:boolean;scopes:AdminScope[]|null;
  }>(`
   SELECT u.id AS subject,u.email,u.email_verified,
     (a.suspended OR p.suspended OR a.revoked_after IS NOT NULL) AS suspended,
     coalesce(array_agg(g.scope ORDER BY g.scope) FILTER(WHERE g.active=true),ARRAY[]::varchar[]) AS scopes
   FROM application_roles r
   JOIN auth_user u ON u.id=r.identity_subject
   JOIN account_access a ON a.identity_subject=u.id
   JOIN user_profiles p ON p.identity_subject=u.id
   LEFT JOIN admin_scope_grants g ON g.identity_subject=u.id
   WHERE r.role='platform-admin'
   GROUP BY u.id,u.email,u.email_verified,a.suspended,p.suspended,a.revoked_after
   ORDER BY lower(u.email),u.id`);
  return result.rows.map(row=>({
   subject:row.subject,email:row.email,emailVerified:row.email_verified,suspended:row.suspended,scopes:row.scopes??[]
  }));
 }

 async setAccess(actor:VerifiedIdentity,input:AdminAccessInput):Promise<{changed:boolean}>{
  const email=input.email.trim().toLowerCase();
  const target=await this.pool.query<{id:string;email_verified:boolean}>(
   'SELECT id,email_verified FROM auth_user WHERE lower(email)=$1',[email]);
  if(target.rowCount!==1)throw new NotFoundException('No account exists for that email');
  const subject=target.rows[0].id;
  if(subject===actor.subject)throw new ConflictException('The grant manager cannot change their own admin access');
  if(input.platformAdmin&&!target.rows[0].email_verified)
   throw new ConflictException('The account email must be verified before admin access can be granted');
  if(!input.platformAdmin&&input.scopes.length)
   throw new ConflictException('Scopes must be empty when platform admin access is removed');
  try{
   return await this.commands.execute(
    {
     actor:actor.subject,requestKey:input.requestKey,operation:'admin.access.set',
     resourceType:'admin_identity',resourceId:subject,
     payload:{platformAdmin:input.platformAdmin,scopes:[...input.scopes].sort()},
     reason:input.reason.trim()
    },
    async client=>{
     const result=await client.query<{changed:boolean}>(
      'SELECT faji_admin_set_access($1,$2,$3,$4::varchar[],$5) AS changed',
      [actor.subject,subject,input.platformAdmin,input.scopes,input.reason.trim()]);
     return {changed:result.rows[0].changed};
    }
   );
  }catch(error){
   if(error instanceof ConflictException||error instanceof NotFoundException||error instanceof ForbiddenException)throw error;
   const code=typeof error==='object'&&error!==null&&'code'in error?String(error.code):'';
   if(code==='P0001')throw new ConflictException('Admin access cannot be granted to an unverified, inactive, or invalid account');
   throw error;
  }
 }
}
