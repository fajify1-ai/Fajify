import {Module,UnauthorizedException} from '@nestjs/common';
import { IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
import {IdentityGuard} from './identity.guard';
import {KeycloakAccessTokenVerifier} from './keycloak.verifier';

/** Fail closed until Keycloak configuration is present. No bearer-token bypass. */
const disabledVerifier:IdentityVerifier={async verifyAccessToken(){throw new UnauthorizedException('Identity provider unavailable');}};
@Module({providers:[{provide:IDENTITY_VERIFIER,useFactory:():IdentityVerifier=>{
 const issuer=process.env.KEYCLOAK_ISSUER;
 const audience=process.env.KEYCLOAK_AUDIENCE;
 return issuer&&audience?new KeycloakAccessTokenVerifier(issuer,audience):disabledVerifier;
}},IdentityGuard],exports:[IDENTITY_VERIFIER,IdentityGuard]})
export class IdentityModule {}
