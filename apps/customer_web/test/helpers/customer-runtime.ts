import { createHash } from "node:crypto";
import type { WebOidcSettings } from "../../lib/auth/config.server";
import type { CustomerWebJourneyRuntime } from "../../lib/auth/journey-http.server";
import { OidcCallbackService, type OidcTransaction } from "../../lib/auth/oidc.server";
import { SessionService, type ServerSession } from "../../lib/auth/session.server";

export function customerJourneyFixture(callbackPath = "/callback") {
  const settings: WebOidcSettings = {
    auth: { status: "configured", issuer: new URL("https://identity.example.invalid/realms/fixture"),
      clientId: "fixture-client", clientSecret: "fixture-only-not-a-secret",
      redirectUri: new URL(callbackPath, "https://customer.example.invalid"),
      postLogoutRedirectUri: new URL("https://customer.example.invalid/") },
    apiOrigin: new URL("https://api.example.invalid"), scopes: "openid email",
    sessionLifetimeMs: 600_000, transactionLifetimeMs: 300_000,
  };
  const records = new Map<string, ServerSession>();
  const session: ServerSession = { identity: { subject: "fixture-subject",
    emailVerified: true, customerAccess: true }, expiresAt: Date.now() + 600_000 };
  const binding = "b".repeat(43);
  const state = "s".repeat(43);
  let transaction: OidcTransaction | null = {
    state, nonce: "n".repeat(43), codeVerifier: "v".repeat(43),
    browserBindingDigest: createHash("sha256").update(binding).digest("hex"),
    issuer: settings.auth.issuer.href, redirectUri: settings.auth.redirectUri.href,
    expiresAt: Date.now() + 300_000,
  };
  let started = 0, exchanges = 0;
  let failed = false;
  const revoker = { async revoke() {} };
  const sessions = new SessionService({
    async get(key) { return records.get(key) ?? null; },
    async put(key, record) { records.set(key, record); },
    async delete(key) { records.delete(key); },
  }, revoker);
  const callback = new OidcCallbackService(settings.auth.redirectUri, settings.auth.issuer, {
    async consume() { const result = transaction; transaction = null; return result; },
  }, { async exchangeAndVerify() {
    exchanges++;
    if (failed) throw new Error("fixture-private-provider-diagnostics");
    return session;
  } });
  const runtime: CustomerWebJourneyRuntime = { settings, sessions, revoker, callback,
    transactions: { async create() {} },
    adapter: { async begin(_store, journey) {
      started++;
      if (failed) throw new Error("fixture-private-provider-diagnostics");
      const redirect = new URL("https://identity.example.invalid/authorize-fixture");
      redirect.searchParams.set("intent-fixture", journey ?? "signIn");
      return { redirect, cookie: "__Host-faji-oidc-binding=fixture-binding; Path=/; HttpOnly; Secure; SameSite=Lax" };
    } },
  };
  const callbackUrl = new URL(settings.auth.redirectUri);
  callbackUrl.searchParams.set("state", state); callbackUrl.searchParams.set("code", "fixture-code");
  callbackUrl.searchParams.set("iss", settings.auth.issuer.href);
  return { settings, runtime, sessions, session, records, binding, callbackUrl,
    success: new URL("https://customer.example.invalid/account-fixture"),
    fail() { failed = true; }, get started() { return started; }, get exchanges() { return exchanges; } };
}
