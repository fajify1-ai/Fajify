import {Module,UnauthorizedException} from '@nestjs/common';
import { IDENTITY_VERIFIER,IdentityVerifier } from './identity.types';
import {IdentityGuard} from './identity.guard';
/** Milestone 1: deny closed. Milestone 2 replaces provider with JWKS-verified OIDC implementation. */
const disabledVerifier: IdentityVerifier={async verifyAccessToken(){throw new UnauthorizedException('Identity integration pending');}};
@Module({providers:[{provide:IDENTITY_VERIFIER,useValue:disabledVerifier},IdentityGuard],exports:[IDENTITY_VERIFIER,IdentityGuard]})
export class IdentityModule {}
