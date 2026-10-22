export interface VerifiedIdentity {
 subject: string; issuer: string; audience: string[]; expiresAt: number;
 roles: readonly string[];
}
export interface IdentityVerifier { verifyAccessToken(token:string): Promise<VerifiedIdentity>; }
export const IDENTITY_VERIFIER=Symbol('IDENTITY_VERIFIER');
export function extractBearerToken(header: string | undefined):string | null {
 if(!header || !/^Bearer [A-Za-z0-9._~+/-]+=*$/i.test(header)) return null;
 return header.slice(7);
}
