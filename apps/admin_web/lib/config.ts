import 'server-only';

export const clientId = 'faji-admin-web';
export const callbackPath = '/auth/callback';
export const operatorHome = '/operations';
export const elevationSeconds = 300;

function httpsUrl(value: string | undefined) {
  const url = new URL(value ?? '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('HTTPS configuration required');
  }
  return url;
}

export function config() {
  const origin = httpsUrl(process.env.FAJI_ADMIN_WEB_ORIGIN);
  const api = httpsUrl(process.env.FAJI_ADMIN_API_ORIGIN);
  const issuer = httpsUrl(process.env.FAJI_ADMIN_OIDC_ISSUER);
  if (origin.pathname !== '/' || api.pathname !== '/' || issuer.pathname.endsWith('/')) {
    throw new Error('Invalid admin URL configuration');
  }
  return {
    origin: origin.origin,
    api: api.origin,
    issuer,
    audience: process.env.FAJI_ADMIN_API_AUDIENCE || 'faji-api',
    acr: process.env.FAJI_ADMIN_OIDC_ACR || 'faji-mfa',
  };
}

export function sameOrigin(request: Request) {
  try {
    return request.headers.get('origin') === config().origin;
  } catch {
    return false;
  }
}
