import {CustomerRegistrationController,CustomerRegistrationService,REGISTRATION_CONFIG,REGISTRATION_HTTP} from './customer-registration';
import {Module,UnauthorizedException} from '@nestjs/common';
import { IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
import {IdentityGuard} from './identity.guard';
import {KeycloakAccessTokenVerifier} from './keycloak.verifier';
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
const disabledVerifier:IdentityVerifier={async verifyAccessToken(){throw new UnauthorizedException('Identity provider unavailable');}};
@Module({controllers:[CustomerRegistrationController,SessionController,AdminAccessController,OnboardingController,BusinessApprovalController],providers:[CustomerRegistrationService,{provide:REGISTRATION_CONFIG,useFactory:()=>({enabled:process.env.FAJI_CUSTOMER_REGISTRATION_ENABLED==='true',issuer:process.env.KEYCLOAK_ISSUER,clientId:process.env.KEYCLOAK_REGISTRATION_CLIENT_ID,clientSecret:process.env.KEYCLOAK_REGISTRATION_CLIENT_SECRET})},{provide:REGISTRATION_HTTP,useValue:fetch},{provide:IDENTITY_VERIFIER,useFactory:():IdentityVerifier=>{
 const issuer=process.env.KEYCLOAK_ISSUER;
 const audience=process.env.KEYCLOAK_AUDIENCE;
 return issuer&&audience?new KeycloakAccessTokenVerifier(issuer,audience):disabledVerifier;
}},IdentityGuard,RolesGuard,AccessService,BusinessApprovalService,AccountGuard,ResourceGuard,PrivilegedGuard,AdminRateGuard],
 exports:[IDENTITY_VERIFIER,IdentityGuard,RolesGuard,AccessService,AccountGuard,ResourceGuard,PrivilegedGuard,AdminRateGuard]})
export class IdentityModule {}
