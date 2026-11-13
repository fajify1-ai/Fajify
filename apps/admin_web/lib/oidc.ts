import 'server-only';
import * as oidc from 'openid-client';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { callbackPath, clientId, config, elevationSeconds } from './config';
import { transactionSeconds, transactions } from './session';

let provider: { issuer: string; value: Promise<oidc.Configuration> } | undefined;
let keys: { url: string; value: ReturnType<typeof createRemoteJWKSet> } | undefined;

function configuration(issuer: URL) {
  if (provider?.issuer === issuer.href) return provider.value;
  const value = oidc.discovery(issuer, clientId, { id_token_signed_response_alg: 'RS256' }, oidc.None())
    .then((client) => {
      const metadata = client.serverMetadata();
      const endpoint = issuer.href + '/protocol/openid-connect/';
      if (metadata.issuer !== issuer.href || metadata.authorization_endpoint !== endpoint + 'auth' ||
          metadata.token_endpoint !== endpoint + 'token' || metadata.jwks_uri !== endpoint + 'certs') {
        throw new Error('Unexpected Keycloak metadata');
      }
      oidc.enableNonRepudiationChecks(client);
      return client;
    })
    .catch((error: unknown) => {
      if (provider?.value === value) provider = undefined;
      throw error;
    });
  provider = { issuer: issuer.href, value };
  return value;
}

export async function beginLogin() {
  const { issuer, origin, acr } = config();
  const client = await configuration(issuer);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const verifier = oidc.randomPKCECodeVerifier();
  const url = oidc.buildAuthorizationUrl(client, {
    redirect_uri: origin + callbackPath,
    scope: 'openid',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'login',
    max_age: '0',
    acr_values: acr,
  });
  return {
    url,
    transactionId: await transactions.create({ state, nonce, verifier, expires: Date.now() + transactionSeconds * 1000 }),
  };
}

function hasRole(value: unknown) {
  if (!value || typeof value !== 'object' || !('roles' in value)) return false;
  return Array.isArray(value.roles) && value.roles.includes('platform-admin');
}

export function elevationExpiry(payload: JWTPayload, subject: string, acr: string, audience: string, now: number) {
  const resources = payload.resource_access as Record<string, unknown> | undefined;
  const authTime = payload.auth_time;
  if (payload.sub !== subject || payload.azp !== clientId || payload.acr !== acr ||
      typeof authTime !== 'number' || !Number.isInteger(authTime) || authTime <= 0 || authTime > now ||
      typeof payload.exp !== 'number' ||
      (!hasRole(payload.realm_access) && !hasRole(resources?.[audience]))) return null;
  const expires = Math.min(payload.exp, authTime + elevationSeconds);
  return expires > now ? expires * 1000 : null;
}

export async function finishLogin(request: Request, transactionId: string | undefined) {
  const transaction = await transactions.take(transactionId);
  if (!transaction) throw new Error('Expired login transaction');
  const { issuer, origin, audience, acr } = config();
  const callback = new URL(origin + callbackPath);
  callback.search = new URL(request.url).search;
  const client = await configuration(issuer);
  const tokens = await oidc.authorizationCodeGrant(client, callback, {
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    pkceCodeVerifier: transaction.verifier,
    idTokenExpected: true,
  });
  const idClaims = tokens.claims();
  if (!idClaims?.sub || tokens.token_type.toLowerCase() !== 'bearer') throw new Error('Invalid login result');
  const jwks = issuer.href + '/protocol/openid-connect/certs';
  if (keys?.url !== jwks) keys = { url: jwks, value: createRemoteJWKSet(new URL(jwks)) };
  const { payload } = await jwtVerify(tokens.access_token, keys.value, {
    issuer: issuer.href,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'iat', 'exp'],
  });
  const expires = elevationExpiry(payload, idClaims.sub, acr, audience, Math.floor(Date.now() / 1000));
  if (expires === null) return null;
  return { accessToken: tokens.access_token, expires };
}

export function logoutUrl() {
  const { issuer, origin } = config();
  const url = new URL(issuer.href + '/protocol/openid-connect/logout');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('post_logout_redirect_uri', origin + '/');
  return url;
}
