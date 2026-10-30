import "server-only";

export type AuthConfiguration =
  | { status: "blocked"; reason: "missing_configuration" | "invalid_configuration" }
  | {
      status: "configured";
      issuer: URL;
      clientId: string;
      clientSecret: string;
      redirectUri: URL;
      postLogoutRedirectUri: URL;
    };

function secureUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.username || url.password ||
    url.hash || url.search
  ) throw new Error("Invalid authentication configuration");
  return url;
}

/** Server-only values. No invented defaults or NEXT_PUBLIC_ credentials. */
export function loadAuthConfiguration(
  env: Record<string, string | undefined>,
): AuthConfiguration {
  const issuer = env.FAJI_CUSTOMER_OIDC_ISSUER;
  const clientId = env.FAJI_CUSTOMER_OIDC_CLIENT_ID;
  const clientSecret = env.FAJI_CUSTOMER_OIDC_CLIENT_SECRET;
  const redirect = env.FAJI_CUSTOMER_OIDC_REDIRECT_URI;
  const logoutRedirect = env.FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI;
  if (![issuer, clientId, clientSecret, redirect, logoutRedirect].every(
    (value) => value?.trim(),
  )) return { status: "blocked", reason: "missing_configuration" };

  try {
    return {
      status: "configured",
      issuer: secureUrl(issuer!),
      clientId: clientId!,
      clientSecret: clientSecret!,
      redirectUri: secureUrl(redirect!),
      postLogoutRedirectUri: secureUrl(logoutRedirect!),
    };
  } catch {
    return { status: "blocked", reason: "invalid_configuration" };
  }
}

export interface WebOidcSettings {
  readonly auth: Extract<AuthConfiguration, { status: "configured" }>;
  readonly apiOrigin: URL;
  readonly scopes: string;
  readonly sessionLifetimeMs: number;
  readonly transactionLifetimeMs: number;
}

/** Enabling the SDK is separate from supplying secrets. No production defaults.
 * Durable store composition remains mandatory before routes can be mounted.
 */
export function loadWebOidcSettings(env: Record<string, string | undefined>): WebOidcSettings | null {
  if (env.FAJI_CUSTOMER_WEB_AUTH_ENABLED !== "true") return null;
  const auth = loadAuthConfiguration(env);
  if (auth.status !== "configured") return null;
  try {
    const apiOrigin = secureUrl(env.FAJI_CUSTOMER_API_ORIGIN ?? "");
    const scopes = env.FAJI_CUSTOMER_OIDC_SCOPES ?? "";
    const list = scopes.split(" ");
    const sessionSeconds = Number(env.FAJI_CUSTOMER_SESSION_MAX_AGE_SECONDS);
    const transactionSeconds = Number(env.FAJI_CUSTOMER_TRANSACTION_MAX_AGE_SECONDS);
    if (apiOrigin.pathname !== "/" ||
      !list.includes("openid") || !list.includes("email") ||
      list.some(scope => !/^[A-Za-z0-9._:-]+$/.test(scope)) ||
      auth.redirectUri.origin !== auth.postLogoutRedirectUri.origin ||
      !Number.isSafeInteger(sessionSeconds) || sessionSeconds <= 0 ||
      !Number.isSafeInteger(transactionSeconds) || transactionSeconds <= 0 ||
      !Number.isSafeInteger(sessionSeconds * 1000) ||
      !Number.isSafeInteger(transactionSeconds * 1000)) return null;
    return { auth, apiOrigin, scopes,
      sessionLifetimeMs: sessionSeconds * 1000,
      transactionLifetimeMs: transactionSeconds * 1000 };
  } catch { return null; }
}
