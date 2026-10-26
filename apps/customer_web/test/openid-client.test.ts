import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, createHash } from "node:crypto";
import * as oidc from "openid-client";
import { loadWebOidcSettings } from "../lib/auth/config.server";
import { CustomerIdentityClient } from "../lib/auth/identity-api.server";
import { OpenIdClientAdapter, completeOidcLogin, type ProviderCredentials, type ProviderCredentialStore } from "../lib/auth/openid-client.server";
import { OidcCallbackService, InvalidOidcCallback, AuthenticationUnavailable, type OidcTransaction } from "../lib/auth/oidc.server";
import { SessionService, type ServerSession, type SessionStore } from "../lib/auth/session.server";

const env = () => ({
  FAJI_CUSTOMER_WEB_AUTH_ENABLED: "true",
  FAJI_CUSTOMER_OIDC_ISSUER: "https://identity.example.invalid/realms/fixture",
  FAJI_CUSTOMER_OIDC_CLIENT_ID: "fixture-web-client",
  FAJI_CUSTOMER_OIDC_CLIENT_SECRET: "fixture-only-not-a-secret",
  FAJI_CUSTOMER_OIDC_REDIRECT_URI: "https://customer.example.invalid/callback",
  FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI: "https://customer.example.invalid/",
  FAJI_CUSTOMER_API_ORIGIN: "https://api.example.invalid",
  FAJI_CUSTOMER_OIDC_SCOPES: "openid email profile",
  FAJI_CUSTOMER_SESSION_MAX_AGE_SECONDS: "3600",
  FAJI_CUSTOMER_TRANSACTION_MAX_AGE_SECONDS: "300",
});

// Test-only server vault. Production requires encrypted persistent storage and
// equivalent cross-instance serialization, never this in-memory implementation.
class Vault implements ProviderCredentialStore {
  readonly records = new Map<string, ProviderCredentials>();
  private readonly pending = new Map<string, Promise<void>>();
  async create(id: string, record: ProviderCredentials) { this.records.set(id, record); }
  async use<T>(id: string, operation: (current: ProviderCredentials | null) => Promise<{
    next: ProviderCredentials | null; result: T;
  }>): Promise<T> {
    const previous = this.pending.get(id) ?? Promise.resolve();
    const work = previous.then(async () => {
      const { next, result } = await operation(this.records.get(id) ?? null);
      if (next) this.records.set(id, next); else this.records.delete(id);
      return result;
    });
    const tail = work.then(() => {}, () => {});
    this.pending.set(id, tail);
    return work.finally(() => { if (this.pending.get(id) === tail) this.pending.delete(id); });
  }
}

const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...key.publicKey.export({ format: "jwk" }), kid: "fixture-key", use: "sig", alg: "RS256" };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

function fixture() {
  const settings = loadWebOidcSettings(env())!;
  const issuer = settings.auth.issuer.href;
  let nonce = "fixture-nonce";
  let wrongNonce = false, tampered = false, unverified = false, denied = false;
  let wrongAudience = false, wrongIssuer = false, expired = false, revokeFailure = false;
  let refreshes = 0, revocations = 0;
  let clock = Date.now();
  const vault = new Vault();
  function idToken() {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${encode({ alg: "RS256", kid: "fixture-key" })}.${encode({
      iss: wrongIssuer ? "https://other.example.invalid" : issuer,
      aud: wrongAudience ? "other-client" : settings.auth.clientId, sub: "fixture-subject",
      iat: timestamp, exp: expired ? timestamp - 600 : timestamp + 300,
      nonce: wrongNonce ? "other" : nonce,
    })}`;
    const signature = sign("RSA-SHA256", Buffer.from(payload), key.privateKey).toString("base64url");
    return `${payload}.${tampered ? "invalid-signature" : signature}`;
  }
  const configuration = new oidc.Configuration({
    issuer, authorization_endpoint: `${issuer}/authorize-fixture`, token_endpoint: `${issuer}/token-fixture`,
    jwks_uri: `${issuer}/jwks-fixture`, userinfo_endpoint: `${issuer}/userinfo-fixture`,
    revocation_endpoint: `${issuer}/revoke-fixture`,
    code_challenge_methods_supported: ["S256"], id_token_signing_alg_values_supported: ["RS256"],
  }, settings.auth.clientId, settings.auth.clientSecret);
  configuration[oidc.customFetch] = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("jwks-fixture")) return Response.json({ keys: [jwk] });
    if (path.endsWith("userinfo-fixture")) return Response.json({ sub: "fixture-subject", email_verified: !unverified });
    if (path.endsWith("revoke-fixture")) { revocations++; return new Response(null, { status: revokeFailure ? 503 : 200 }); }
    assert.ok(path.endsWith("token-fixture"));
    const body = new URLSearchParams(String(init?.body));
    if (body.get("grant_type") === "refresh_token") {
      refreshes++;
      assert.equal(body.get("refresh_token"), "fixture-refresh");
      return Response.json({ access_token: "fixture-refreshed-access", refresh_token: "fixture-rotated-refresh", token_type: "Bearer", expires_in: 300 });
    }
    assert.ok(body.get("code_verifier"));
    return Response.json({ access_token: "fixture-access", refresh_token: "fixture-refresh",
      id_token: idToken(), token_type: "Bearer", expires_in: 300 });
  };
  const accounts = new CustomerIdentityClient(settings.apiOrigin, async () => denied
    ? new Response(null, { status: 403 })
    : Response.json({ subject: "fixture-subject", roles: ["customer"] }));
  const adapter = new OpenIdClientAdapter(settings, configuration, vault, accounts, () => clock);
  const input = { code: "fixture-code", nonce, codeVerifier: "v".repeat(43), issuer,
    redirectUri: settings.auth.redirectUri.href };
  return { settings, vault, adapter, input,
    setNonce(value: string) { nonce = value; },
    rejectNonce() { wrongNonce = true; }, tamper() { tampered = true; },
    rejectAudience() { wrongAudience = true; }, rejectIssuer() { wrongIssuer = true; },
    expireToken() { expired = true; }, failRevoke() { revokeFailure = true; },
    deny() { denied = true; }, unverify() { unverified = true; },
    advance(milliseconds: number) { clock += milliseconds; },
    get refreshes() { return refreshes; }, get revocations() { return revocations; },
  };
}

test("web runtime settings stay disabled until every explicit setting is valid", () => {
  assert.equal(loadWebOidcSettings({}), null);
  assert.ok(loadWebOidcSettings(env()));
  for (const key of Object.keys(env())) {
    const values: Record<string, string> = env(); delete values[key];
    assert.equal(loadWebOidcSettings(values), null, key);
  }
  for (const values of [
    { FAJI_CUSTOMER_API_ORIGIN: "http://api.example.invalid" },
    { FAJI_CUSTOMER_OIDC_SCOPES: "openid" },
    { FAJI_CUSTOMER_SESSION_MAX_AGE_SECONDS: "0" },
    { FAJI_CUSTOMER_TRANSACTION_MAX_AGE_SECONDS: "NaN" },
  ]) assert.equal(loadWebOidcSettings({ ...env(), ...values }), null);
});

test("SDK initiation creates browser-bound random state, nonce and S256 PKCE", async () => {
  const f = fixture(); let stored: OidcTransaction | undefined;
  const start = await f.adapter.begin({ async create(transaction) { stored = transaction; } });
  assert.ok(stored);
  assert.equal(start.redirect.searchParams.get("code_challenge_method"), "S256");
  assert.equal(start.redirect.searchParams.get("code_challenge"),
    await oidc.calculatePKCECodeChallenge(stored.codeVerifier));
  assert.equal(start.redirect.searchParams.get("state"), stored.state);
  const binding = start.cookie.split(";")[0].split("=")[1];
  assert.equal(createHash("sha256").update(binding).digest("hex"), stored.browserBindingDigest);
  assert.match(start.cookie, /HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!start.cookie.includes(stored.codeVerifier));
});

test("real SDK verifies signed callback then stores credentials only in the server vault", async () => {
  const f = fixture(); let transaction: OidcTransaction | null = null;
  const start = await f.adapter.begin({ async create(value) { transaction = value; } });
  f.setNonce(transaction!.nonce);
  const callback = new URL(f.settings.auth.redirectUri);
  callback.searchParams.set("code", "fixture-code");
  callback.searchParams.set("state", transaction!.state);
  callback.searchParams.set("iss", f.settings.auth.issuer.href);
  const service = new OidcCallbackService(f.settings.auth.redirectUri, f.settings.auth.issuer,
    { async consume(state) { const result = transaction; transaction = null;
      if (result) assert.equal(state, result.state); return result; } }, f.adapter);
  const session = await service.complete(callback, start.cookie.split(";")[0].split("=")[1]);
  assert.equal(session.identity.subject, "fixture-subject");
  assert.equal(f.vault.records.size, 1);
  assert.ok(!JSON.stringify(session).includes("fixture-refresh"));
  assert.ok(!JSON.stringify(session).includes("fixture-access"));
  await assert.rejects(service.complete(callback, start.cookie.split(";")[0].split("=")[1]), InvalidOidcCallback);
});

test("SDK rejects invalid signed claims, forged signature, unverified email and denied account", async () => {
  for (const mode of ["nonce", "signature", "email", "account", "audience", "issuer", "expiry"] as const) {
    const f = fixture();
    if (mode === "nonce") f.rejectNonce();
    if (mode === "signature") f.tamper();
    if (mode === "email") f.unverify();
    if (mode === "account") f.deny();
    if (mode === "audience") f.rejectAudience();
    if (mode === "issuer") f.rejectIssuer();
    if (mode === "expiry") f.expireToken();
    await assert.rejects(f.adapter.exchangeAndVerify(f.input), AuthenticationUnavailable);
    assert.equal(f.vault.records.size, 0);
  }
});

test("serialized provider storage prevents concurrent refresh reuse and logout resurrection", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  f.advance(280_000);
  await Promise.all([f.adapter.validate(session), f.adapter.validate(session)]);
  assert.equal(f.refreshes, 1);
  await Promise.all([f.adapter.validate(session), f.adapter.revoke(session)]);
  assert.equal(f.vault.records.size, 0);
  assert.equal(await f.adapter.validate(session), null);
});

test("provider revocation failure still removes vault credentials", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  f.failRevoke();
  await assert.rejects(f.adapter.revoke(session), AuthenticationUnavailable);
  assert.equal(f.vault.records.size, 0);
  assert.equal(f.revocations, 2);
});

test("logout attempts durable local deletion even when reading the session fails", async () => {
  let deleted = false;
  const store: SessionStore = {
    async get() { throw new Error("fixture read failure"); },
    async put() {}, async delete() { deleted = true; },
  };
  const sessions = new SessionService(store, { async revoke() {} });
  await assert.rejects(sessions.logout("a".repeat(43)));
  assert.equal(deleted, true);
});

test("server lifecycle refresh rotates tokens without extending browser session", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  f.advance(280_000);
  assert.deepEqual(await f.adapter.validate(session), session);
  assert.equal(f.refreshes, 1);
  assert.equal(f.vault.records.get(session.providerSessionId!)!.refreshToken, "fixture-rotated-refresh");
});

test("server lifecycle rechecks account and revokes provider credentials on logout", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  await f.adapter.revoke(session);
  assert.equal(f.revocations, 2); assert.equal(f.vault.records.size, 0);
  assert.equal(await f.adapter.validate(session), null);
  const g = fixture(); const denied = await g.adapter.exchangeAndVerify(g.input);
  g.deny();
  assert.equal(await g.adapter.validate(denied), null);
  assert.equal(g.vault.records.size, 0);
});

test("SessionService removes browser session when provider revalidation fails", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  const records = new Map<string, ServerSession>();
  const store: SessionStore = {
    async get(key) { return records.get(key) ?? null; },
    async put(key, value) { records.set(key, value); },
    async delete(key) { records.delete(key); },
  };
  const sessions = new SessionService(store, f.adapter, Date.now, f.adapter);
  const { cookie } = await sessions.create(session);
  const id = cookie.split(";")[0].split("=")[1];
  f.unverify();
  assert.equal(await sessions.read(id), null); assert.equal(records.size, 0);
});

test("provider credentials are discarded on changed configuration or expired browser lifetime", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  const record = f.vault.records.get(session.providerSessionId!)!;
  f.vault.records.set(session.providerSessionId!, { ...record, configurationBinding: "other" });
  assert.equal(await f.adapter.validate(session), null);
  assert.equal(f.vault.records.size, 0);
  const g = fixture(); const expired = await g.adapter.exchangeAndVerify(g.input);
  g.advance(g.settings.sessionLifetimeMs + 1);
  assert.equal(await g.adapter.validate(expired), null);
  assert.equal(g.vault.records.size, 0);
});

test("provider-backed sessions require a validator and failed cookie-session creation revokes credentials", async () => {
  const f = fixture(); const session = await f.adapter.exchangeAndVerify(f.input);
  const store: SessionStore = {
    async get() { return null; }, async put() { throw new Error("fixture storage failure"); },
    async delete() {},
  };
  const insecure = new SessionService(store, f.adapter);
  await assert.rejects(insecure.create(session));
  const sessions = new SessionService(store, f.adapter, Date.now, f.adapter);
  const callback = { async complete() { return session; } } as unknown as OidcCallbackService;
  await assert.rejects(completeOidcLogin(callback, new URL(f.input.redirectUri), "fixture-binding", sessions, f.adapter), AuthenticationUnavailable);
  assert.equal(f.vault.records.size, 0); assert.equal(f.revocations, 2);
});
