export interface VerifiedIdentity {
 subject:string; issuer:string; audience:string[]; expiresAt:number;issuedAt:number;
 roles:readonly string[];
 /** Authorized OIDC client ID (azp) present in the signed access token. */
 authorizedParty?:string;
 /** Authenticator assurance details supplied by the signed Keycloak access token. */
 authContext?:string;
 authTime?:number;
 /** Signed Keycloak session identifier, used for per-session API revocation. */
 sessionId?:string;
}
export interface IdentityVerifier {verifyAccessToken(token:string):Promise<VerifiedIdentity>;}
export const IDENTITY_VERIFIER=Symbol('IDENTITY_VERIFIER');
export function extractBearerToken(header:string|undefined):string|null {
 if(!header||!/^Bearer [A-Za-z0-9._~+/-]+=*$/i.test(header))return null;
 return header.slice(7);
}
/** Server-side resource scoping; Keycloak roles never imply tenant ownership. */
export function requireResourceMembership(
 identity:VerifiedIdentity,
 memberships:ReadonlySet<string>,
 resourceScope:string
):boolean {
 return Boolean(identity.subject)&&memberships.has(resourceScope);
}
