import {Module} from '@nestjs/common';
import { IDENTITY_VERIFIER } from './identity.types';
import {IdentityGuard} from './identity.guard';
import {BetterAuthService} from './better-auth.service';
import {RolesGuard} from './roles.guard';
import {AccessService} from './access.service';
import {AccountGuard} from './account.guard';
import {ResourceGuard} from './resource.guard';
import {SessionController} from './session.controller';
import {PrivilegedGuard} from './privileged.guard';
import {AdminRateGuard} from './admin-rate.guard';
import {AdminAccessController} from './admin-access.controller';
import {OnboardingController} from './onboarding.controller';
import {BusinessApprovalController} from './business-approval.controller';
import {BusinessApprovalService} from './business-approval.service';
@Module({controllers:[SessionController,AdminAccessController,OnboardingController,BusinessApprovalController],providers:[BetterAuthService,{provide:IDENTITY_VERIFIER,useExisting:BetterAuthService},IdentityGuard,RolesGuard,AccessService,BusinessApprovalService,AccountGuard,ResourceGuard,PrivilegedGuard,AdminRateGuard],
 exports:[BetterAuthService,IDENTITY_VERIFIER,IdentityGuard,RolesGuard,AccessService,AccountGuard,ResourceGuard,PrivilegedGuard,AdminRateGuard]})
export class IdentityModule {}
