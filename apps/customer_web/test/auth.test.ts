import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { loadAuthConfiguration } from "../lib/auth/config.server";
import {
  SESSION_COOKIE_NAME, SessionService, type ServerSession, type SessionStore,
} from "../lib/auth/session.server";
import {
  AuthenticationUnavailable, InvalidOidcCallback, OidcCallbackService,
  PendingOidcAdapter, type OidcTransaction, type OidcSdkAdapter,
} from "../lib/auth/oidc.server";
import { logoutCustomer, withCustomerSession } from "../lib/auth/http.server";
import { CustomerIdentityClient, CustomerIdentityFailure } from "../lib/auth/identity-api.server";

test("identity API binds the verified subject and disables redirects and caching", async () => {
  let calls = 0;
  const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), async (url, init) => {
    calls++;
    assert.equal(String(url), "https://api.example.invalid/api/v1/auth/me");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fixture-token");
    assert.ok(init?.signal);
    return Response.json({ subject: "fixture-subject", roles: ["customer"] });
  });
  const identity = await api.load("fixture-token", "fixture-subject");
  assert.deepEqual(identity, { subject: "fixture-subject", roles: ["customer"] });
  assert.ok(Object.isFrozen(identity.roles));
  await api.load("fixture-token", "fixture-subject");
  assert.equal(calls, 2);
});

test("identity API refuses insecure origins and invalid credentials before requests", async () => {
  for (const url of ["http://api.example.invalid", "https://user:password@api.example.invalid", "https://api.example.invalid/path", "https://api.example.invalid?q=1", "https://api.example.invalid#fragment"]) {
    assert.throws(() => new CustomerIdentityClient(new URL(url)));
  }
  const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), async () => {
    assert.fail("Invalid credentials must not reach transport");
  });
  for (const token of ["", "token\r\nInjected: value"]) {
    await assert.rejects(api.load(token, "fixture-subject"), (e: unknown) =>
      e instanceof CustomerIdentityFailure && e.code === "session_invalid");
  }
  await assert.rejects(api.load("fixture-token", " "), CustomerIdentityFailure);
});

test("identity API denies rejected and malformed identities without leaking bodies", async () => {
  for (const [status, code] of [[401, "session_invalid"], [403, "access_denied"], [302, "unavailable"], [503, "unavailable"]] as const) {
    const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), async () =>
      new Response("private response", { status }));
    await assert.rejects(api.load("fixture-token", "fixture-subject"), (e: unknown) =>
      e instanceof CustomerIdentityFailure && e.code === code && !e.message.includes("private"));
  }
  for (const value of [null, [], {}, { subject: "other", roles: ["customer"] },
    { subject: "fixture-subject", roles: "customer" },
    { subject: "fixture-subject", roles: ["customer", 42] },
    { subject: "fixture-subject", roles: ["customer", ""] }]) {
    const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), async () => Response.json(value));
    await assert.rejects(api.load("fixture-token", "fixture-subject"), CustomerIdentityFailure);
  }
});

test("identity API rejects non-customer roles, oversized bodies and transport failures", async () => {
  for (const roles of [[], ["platform-admin"], ["Customer"]]) {
    const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), async () =>
      Response.json({ subject: "fixture-subject", roles }));
    await assert.rejects(api.load("fixture-token", "fixture-subject"), (e: unknown) =>
      e instanceof CustomerIdentityFailure && e.code === "access_denied");
  }
  for (const request of [
    async () => new Response("x".repeat(65537), { headers: { "content-type": "application/json" } }),
    async () => new Response("not JSON", { headers: { "content-type": "application/json" } }),
    async () => new Response("<html>private</html>"),
    async () => { throw new Error("fixture-token private diagnostics"); },
  ]) {
    const api = new CustomerIdentityClient(new URL("https://api.example.invalid"), request);
    await assert.rejects(api.load("fixture-token", "fixture-subject"), (e: unknown) =>
      e instanceof CustomerIdentityFailure && e.code === "unavailable" && !e.message.includes("fixture-token"));
  }
});

// Explicit test doubles. Never imported by application/runtime composition.
class TestSessionStore implements SessionStore {
  readonly records = new Map<string, ServerSession>();
  async get(key: string) { return this.records.get(key) ?? null; }
  async put(key: string, session: ServerSession) { this.records.set(key, session); }
  async delete(key: string) { this.records.delete(key); }
}

const now = Date.UTC(2026, 0, 1);
const session = (overrides: Partial<ServerSession> = {}): ServerSession => ({
  identity: { subject: "fixture-subject", emailVerified: true, customerAccess: true },
  expiresAt: now + 60_000,
  ...overrides,
});
function fixture(revoke: () => Promise<void> = async () => {}) {
  const store = new TestSessionStore();
  return {
    store,
    sessions: new SessionService(store, { revoke }, () => now),
  };
}
function cookieId(cookie: string) {
  return cookie.split(";")[0].split("=")[1];
}

test("configuration has no invented defaults and rejects insecure URLs", () => {
  assert.equal(loadAuthConfiguration({}).status, "blocked");
  const env = {
    FAJI_CUSTOMER_OIDC_ISSUER: "https://identity.example.invalid/realms/test",
    FAJI_CUSTOMER_OIDC_CLIENT_ID: "fixture-only",
    FAJI_CUSTOMER_OIDC_CLIENT_SECRET: "fixture-only-not-a-secret",
    FAJI_CUSTOMER_OIDC_REDIRECT_URI: "https://customer.example.invalid/callback",
    FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI: "https://customer.example.invalid/",
  };
  assert.equal(loadAuthConfiguration(env).status, "configured");
  for (const value of [
    "http://customer.example.invalid/callback",
    "https://user:password@customer.example.invalid/callback",
    "https://customer.example.invalid/callback#fragment",
    "https://customer.example.invalid/callback?unexpected=value",
  ]) {
    assert.equal(loadAuthConfiguration({
      ...env, FAJI_CUSTOMER_OIDC_REDIRECT_URI: value,
    }).status, "blocked");
  }
});

test("cookie is opaque, secure and HttpOnly; server store uses a digest", async () => {
  const { sessions, store } = fixture();
  const { cookie } = await sessions.create(session());
  const id = cookieId(cookie);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=[A-Za-z0-9_-]{43};`));
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Expires="]) {
    assert.ok(cookie.includes(flag));
  }
  assert.ok(!cookie.includes("fixture-subject"));
  assert.ok(!cookie.includes("Domain="));
  assert.ok(!store.records.has(id));
  assert.deepEqual(await sessions.read(id), session());
});

test("forged and malformed cookies never authorize", async () => {
  const { sessions } = fixture();
  for (const value of [undefined, "", "forged.jwt.token", "../bad", "a".repeat(43)]) {
    assert.equal(await sessions.read(value), null);
  }
});

test("session creation rejects expired, unverified and unauthorized identities", async () => {
  const { sessions } = fixture();
  for (const record of [
    session({ expiresAt: now }),
    session({ expiresAt: Number.NaN }),
    session({ identity: { subject: "", emailVerified: true, customerAccess: true } }),
    session({ identity: { subject: "test", emailVerified: false, customerAccess: true } }),
    session({ identity: { subject: "test", emailVerified: true, customerAccess: false } }),
  ]) await assert.rejects(sessions.create(record), /not authorized/);
});

test("expired stored sessions are removed and cannot be restored", async () => {
  const { sessions, store } = fixture();
  const id = cookieId((await sessions.create(session())).cookie);
  const key = [...store.records.keys()][0];
  store.records.set(key, session({ expiresAt: now }));
  assert.equal(await sessions.read(id), null);
  assert.equal(store.records.size, 0);
});

test("new sign-in rotates the opaque ID and invalidates the previous ID", async () => {
  const { sessions } = fixture();
  const previous = cookieId((await sessions.create(session())).cookie);
  const next = cookieId((await sessions.create(session(), previous)).cookie);
  assert.notEqual(next, previous);
  assert.equal(await sessions.read(previous), null);
  assert.ok(await sessions.read(next));
});

test("logout deletes the local session even when provider revocation fails", async () => {
  const { sessions } = fixture(async () => { throw new Error("fixture remote failure"); });
  const id = cookieId((await sessions.create(session())).cookie);
  await assert.rejects(sessions.logout(id), /fixture remote failure/);
  assert.equal(await sessions.read(id), null);
});

test("protected handler is not called for an invalid session", async () => {
  const { sessions } = fixture();
  let calls = 0;
  const response = await withCustomerSession("forged", sessions, async () => {
    calls++;
    return new Response("protected");
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  assert.equal(calls, 0);
});

test("protected handler fails closed on unavailable session storage", async () => {
  const store: SessionStore = {
    async get() { throw new Error("fixture database failure"); },
    async put() {}, async delete() {},
  };
  const sessions = new SessionService(store, { async revoke() {} }, () => now);
  const response = await withCustomerSession("a".repeat(43), sessions, async () => {
    throw new Error("must not execute");
  });
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
});

test("protected handler receives only a server-side verified session", async () => {
  const { sessions } = fixture();
  const id = cookieId((await sessions.create(session())).cookie);
  const response = await withCustomerSession(id, sessions, async (record) => {
    assert.equal(record.identity.subject, "fixture-subject");
    return new Response("authorized");
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("logout requires POST and a trusted HTTPS Origin", async () => {
  const { sessions } = fixture();
  const origin = "https://customer.example.invalid";
  const id = cookieId((await sessions.create(session())).cookie);
  const get = await logoutCustomer(new Request(origin), id, sessions, origin);
  assert.equal(get.status, 405);
  const crossSite = await logoutCustomer(
    new Request(origin, { method: "POST", headers: { origin: "https://other.invalid" } }),
    id, sessions, origin,
  );
  assert.equal(crossSite.status, 403);
  assert.ok(await sessions.read(id));
  const response = await logoutCustomer(
    new Request(origin, { method: "POST", headers: { origin } }),
    id, sessions, origin,
  );
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  assert.equal(await sessions.read(id), null);
});

test("logout clears cookies but reports remote failure without leaking errors", async () => {
  const { sessions } = fixture(async () => { throw new Error("private provider detail"); });
  const id = cookieId((await sessions.create(session())).cookie);
  const origin = "https://customer.example.invalid";
  const response = await logoutCustomer(
    new Request(origin, { method: "POST", headers: { origin } }),
    id, sessions, origin,
  );
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
});

const issuer = new URL("https://identity.example.invalid/realms/test");
const redirect = new URL("https://customer.example.invalid/callback");
const state = "s".repeat(43);
const browserBinding = "b".repeat(43);
function transaction(): OidcTransaction {
  return {
    state, nonce: "n".repeat(43), codeVerifier: "v".repeat(43),
    browserBindingDigest: createHash("sha256").update(browserBinding).digest("hex"),
    issuer: issuer.href, redirectUri: redirect.href, expiresAt: now + 60_000,
  };
}
function callbackFixture(record: OidcTransaction | null = transaction()) {
  let remaining = record;
  const inputs: unknown[] = [];
  const sdk: OidcSdkAdapter = {
    async exchangeAndVerify(input) { inputs.push(input); return session(); },
  };
  return {
    inputs,
    callbacks: new OidcCallbackService(redirect, issuer, {
      async consume(receivedState) {
        if (receivedState !== remaining?.state) return null;
        const found = remaining;
        remaining = null;
        return found;
      },
    }, sdk, () => now),
  };
}
function callback() {
  const url = new URL(redirect);
  url.searchParams.set("state", state);
  url.searchParams.set("code", "fixture-code");
  url.searchParams.set("iss", issuer.href);
  return url;
}

test("callback passes stored nonce and PKCE verifier to the SDK exactly once", async () => {
  const { callbacks, inputs } = callbackFixture();
  assert.deepEqual(await callbacks.complete(callback(), browserBinding), session());
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0], {
    code: "fixture-code", codeVerifier: "v".repeat(43), nonce: "n".repeat(43),
    issuer: issuer.href, redirectUri: redirect.href,
  });
  await assert.rejects(callbacks.complete(callback(), browserBinding), InvalidOidcCallback);
  assert.equal(inputs.length, 1);
});

test("callback rejects wrong state, issuer, target, fragment and duplicate parameters", async () => {
  const variants: URL[] = [];
  for (const [key, value] of [
    ["state", "x".repeat(43)], ["iss", "https://other.invalid"], ["code", ""],
  ]) {
    const url = callback(); url.searchParams.set(key, value); variants.push(url);
  }
  const duplicate = callback(); duplicate.searchParams.append("state", state);
  const fragment = callback(); fragment.hash = "unexpected";
  const wrongTarget = callback(); wrongTarget.pathname = "/other";
  const providerError = callback(); providerError.searchParams.set("error", "access_denied");
  variants.push(duplicate, fragment, wrongTarget, providerError);
  for (const url of variants) {
    const { callbacks, inputs } = callbackFixture();
    await assert.rejects(callbacks.complete(url, browserBinding), InvalidOidcCallback);
    assert.equal(inputs.length, 0);
  }
});

test("callback rejects missing/mismatched browser binding and expired transactions", async () => {
  for (const binding of [undefined, "x".repeat(43)]) {
    const { callbacks, inputs } = callbackFixture();
    await assert.rejects(callbacks.complete(callback(), binding), InvalidOidcCallback);
    assert.equal(inputs.length, 0);
  }
  const { callbacks, inputs } = callbackFixture({ ...transaction(), expiresAt: now });
  await assert.rejects(callbacks.complete(callback(), browserBinding), InvalidOidcCallback);
  assert.equal(inputs.length, 0);
});

test("pending provider never grants access even after valid callback prechecks", async () => {
  const callbacks = new OidcCallbackService(redirect, issuer, {
    async consume() { return transaction(); },
  }, new PendingOidcAdapter(), () => now);
  await assert.rejects(callbacks.complete(callback(), browserBinding), AuthenticationUnavailable);
});
