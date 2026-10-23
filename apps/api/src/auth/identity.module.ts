import {Module,UnauthorizedException} from '@nestjs/common';
import { IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
import {IdentityGuard} from './identity.guard';
import {KeycloakAccessTokenVerifier} from './keycloak.verifier';
import {RolesGuard} from './roles.guard';
import {AccessService} from './access.service';
import {AccountGuard} from './account.guard';
import {ResourceGuard} from './resource.guard';
import {SessionController} from './session.controller';
const disabledVerifier:IdentityVerifier={async verifyAccessToken(){throw new UnauthorizedException('Identity provider unavailable');}};
@Module({controllers:[SessionController],providers:[{provide:IDENTITY_VERIFIER,useFactory:():IdentityVerifier=>{
 const issuer=process.env.KEYCLOAK_ISSUER;
 const audience=process.env.KEYCLOAK_AUDIENCE;
 return issuer&&audience?new KeycloakAccessTokenVerifier(issuer,audience):disabledVerifier;
}},IdentityGuard,RolesGuard,AccessService,AccountGuard,ResourceGuard],
 exports:[IDENTITY_VERIFIER,IdentityGuard,RolesGuard,AccessService,AccountGuard,ResourceGuard]})
export class IdentityModule {}
