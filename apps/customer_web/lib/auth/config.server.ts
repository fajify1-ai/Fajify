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
