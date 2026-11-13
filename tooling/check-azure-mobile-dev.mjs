import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(
  new URL('../apps/customer_mobile/azure-dev.json', import.meta.url), 'utf8',
));

function requireSetting(key) {
  const value = config[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing build setting: ${key}`);
  }
  return value;
}

async function getJson(url) {
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

try {
  const api = new URL(requireSetting('FAJI_CUSTOMER_API_ORIGIN'));
  const issuer = new URL(requireSetting('FAJI_CUSTOMER_OIDC_ISSUER'));
  if (api.protocol !== 'https:' || api.href !== api.origin + '/' ||
      issuer.protocol !== 'https:' || issuer.origin !== api.origin ||
      issuer.pathname !== '/realms/faji' || issuer.href !== issuer.origin + issuer.pathname ||
      requireSetting('API_BASE_URL') !== api.origin ||
      requireSetting('OIDC_ISSUER') !== issuer.href) {
    throw new Error('Customer and Business must use the same Azure HTTPS API and realm.');
  }
  for (const [key, expected] of Object.entries({
    FAJI_CUSTOMER_NATIVE_AUTH_ENABLED: 'true',
    FAJI_CUSTOMER_OIDC_CLIENT_ID: 'faji-customer-mobile',
    FAJI_CUSTOMER_OIDC_REDIRECT_URI: 'com.faji.customer:/oauth/callback',
    FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI: 'com.faji.customer:/oauth/callback',
    APP_ENV: 'development',
    USE_MOCK_SERVICES: 'false',
    OIDC_CLIENT_ID: 'faji-business-mobile',
    OIDC_REDIRECT_URI: 'com.faji.business:/oauth/callback',
  })) {
    if (requireSetting(key) !== expected) throw new Error(`Unexpected build setting: ${key}`);
  }
  const scopes = requireSetting('FAJI_CUSTOMER_OIDC_SCOPES').trim().split(/\s+/);
  if (!scopes.includes('openid') || !scopes.includes('email')) {
    throw new Error('Customer scopes must include openid and email.');
  }
  const [ready, discovery] = await Promise.all([
    getJson(new URL('/api/v1/health/ready', api)),
    getJson(issuer.href + '/.well-known/openid-configuration'),
  ]);
  if (ready.status !== 'ready' || ready.database !== 'ok') {
    throw new Error('Azure API or database is not ready.');
  }
  if (discovery.issuer !== issuer.href) throw new Error('Keycloak issuer mismatch.');
  console.log('Azure API ready, Keycloak issuer matches, and both app configurations are present.');
} catch (error) {
  console.error(`Azure preflight failed: ${error.message}`);
  process.exitCode = 1;
}
