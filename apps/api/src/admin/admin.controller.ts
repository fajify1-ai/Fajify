import {Controller,Get,Header,Inject,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {PrivilegedGuard} from '../auth/privileged.guard';
import {AdminRateGuard} from '../auth/admin-rate.guard';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {AdminAuditPage,AdminOverviewView} from './admin.dto';
import {AdminOperationsService} from './admin.service';
import {AdminScopeGuard,RequireAdminScope} from './admin-scope.guard';
import {AdminReadAuditGuard} from './admin-read-audit.guard';

/** M8-P1: privileged read-only operational foundation.
 * Admin scope is server enforced (Keycloak signed identity, active session,
 * platform-admin + faji-admin-web + recent MFA + PostgreSQL request budget).
 */
@ApiTags('admin-operations')
@ApiBearerAuth('keycloak')
@Controller({path:'admin/operations',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,PrivilegedGuard,AdminScopeGuard,AdminRateGuard,AdminReadAuditGuard)
export class AdminOperationsController {
 constructor(@Inject(AdminOperationsService) private readonly operations:AdminOperationsService){}
 @Get('overview') @RequireAdminScope('operations.read')
 @Header('Cache-Control','no-store')
 @ApiOkResponse({type:AdminOverviewView})
 overview():Promise<AdminOverviewView>{return this.operations.overview();}
 @Get('audit') @RequireAdminScope('audit.read')
 @Header('Cache-Control','no-store')
 @pagination()
 @ApiOkResponse({type:AdminAuditPage})
 audit(@Query(validated(PageQuery)) input:PageQuery):Promise<AdminAuditPage>{return this.operations.audit(input);}
}
