import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createCustomerAuthRoutes } from "../lib/auth/routes.server";
import { CUSTOMER_CALLBACK_PATH, loadCustomerStorageSettings } from "../lib/auth/deployment.server";
import { customerJourneyFixture } from "./helpers/customer-runtime";
import { POST as login } from "../app/api/auth/login/route";
import { POST as registration } from "../app/api/auth/register/route";
import { POST as recovery } from "../app/api/auth/recover/route";
import { POST as verification } from "../app/api/auth/verify-email/route";
import { GET as callback } from "../app/api/auth/callback/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { GET as session } from "../app/api/auth/session/route";

const origin = "https://customer.example.invalid";
const request = (path: string, method = "POST", cookie?: string, trusted = true) =>
  new Request(`${origin}${path}`, { method, headers: { ...(trusted ? { origin } : {}), ...(cookie ? { cookie } : {}) } });

test("actual Next.js route exports fail closed on an unconfigured deployment", async () => {
  // Prove both disabled and enabled-but-incomplete deployments stay closed.
  // Never use caller-supplied credentials to initiate discovery in this test.
  const names = ["FAJI_CUSTOMER_WEB_AUTH_ENABLED", "FAJI_CUSTOMER_OIDC_ISSUER", "FAJI_CUSTOMER_AUTH_KEYS_JSON"];
  const previous = new Map(names.map(name => [name, process.env[name]]));
  process.env.FAJI_CUSTOMER_OIDC_ISSUER = "";
  process.env.FAJI_CUSTOMER_AUTH_KEYS_JSON = "";
  try {
    for (const enabled of ["false", "true"]) {
      process.env.FAJI_CUSTOMER_WEB_AUTH_ENABLED = enabled;
      for (const [handler, path, method] of [
        [login, "/api/auth/login", "POST"], [registration, "/api/auth/register", "POST"],
        [recovery, "/api/auth/recover", "POST"], [verification, "/api/auth/verify-email", "POST"],
        [callback, CUSTOMER_CALLBACK_PATH, "GET"], [logout, "/api/auth/logout", "POST"],
        [session, "/api/auth/session", "GET"],
      ] as const) {
        const response = await handler(request(path, method, "__Host-faji-customer-session=forged"));
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), { code: "authentication_unavailable" });
        assert.equal(response.headers.get("location"), null);
      }
    }
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("mounted journeys use the shared runtime and reject CSRF before starting any journey", async () => {
  const f = customerJourneyFixture(CUSTOMER_CALLBACK_PATH);
  const routes = createCustomerAuthRoutes(async () => f.runtime);
  for (const [handler, journey] of [[routes.login, "signIn"], [routes.registration, "registration"],
    [routes.recovery, "recovery"], [routes.verification, "verifyEmail"]] as const) {
    assert.equal((await handler(request("/start", "POST", undefined, false))).status, 403);
    const response = await handler(request("/start"));
    assert.equal(response.status, 303);
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("intent-fixture"), journey);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly; Secure; SameSite=Lax/);
  }
  assert.equal(f.started, 4);
});

test("mounted callback parses binding cookies, rotates the session and fixes return navigation", async () => {
  const f = customerJourneyFixture(CUSTOMER_CALLBACK_PATH);
  const routes = createCustomerAuthRoutes(async () => f.runtime);
  const old = (await f.sessions.create(f.session)).cookie.split(";")[0];
  f.callbackUrl.searchParams.set("returnTo", "https://other.example.invalid");
  const response = await routes.callback(new Request(f.callbackUrl, { headers: {
    cookie: `__Host-faji-oidc-binding=${f.binding}; ${old}`,
  } }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${origin}/`);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(await f.sessions.read(old.split("=")[1]), null);
  assert.equal(f.exchanges, 1);
  assert.equal(await response.text(), "");
});

test("duplicate binding cookies and tampered state cannot pass mounted callback", async () => {
  for (const duplicate of [false, true]) {
    const f = customerJourneyFixture(CUSTOMER_CALLBACK_PATH);
    const routes = createCustomerAuthRoutes(async () => f.runtime);
    if (!duplicate) f.callbackUrl.searchParams.set("state", "wrong");
    const binding = `__Host-faji-oidc-binding=${f.binding}`;
    const response = await routes.callback(new Request(f.callbackUrl, { headers: { cookie: duplicate ? `${binding}; ${binding}` : binding } }));
    assert.equal(response.status, 400);
    assert.equal(f.exchanges, 0);
    assert.equal(f.records.size, 0);
  }
});

test("session route denies forged/duplicate/revoked cookies and returns no identity or provider data", async () => {
  const f = customerJourneyFixture(CUSTOMER_CALLBACK_PATH);
  const routes = createCustomerAuthRoutes(async () => f.runtime);
  const cookie = (await f.sessions.create(f.session)).cookie.split(";")[0];
  const good = await routes.session(request("/api/auth/session?subject=another-customer", "GET", cookie));
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), { authenticated: true });
  for (const bad of ["__Host-faji-customer-session=forged", `${cookie}; ${cookie}`]) {
    assert.equal((await routes.session(request("/api/auth/session", "GET", bad))).status, 401);
  }
  await f.sessions.logout(cookie.split("=")[1]);
  assert.equal((await routes.session(request("/api/auth/session", "GET", cookie))).status, 401);
});

test("mounted logout rejects CSRF and clears both cookies only on allowed requests", async () => {
  const f = customerJourneyFixture(CUSTOMER_CALLBACK_PATH);
  const routes = createCustomerAuthRoutes(async () => f.runtime);
  const cookie = (await f.sessions.create(f.session)).cookie.split(";")[0];
  const csrf = await routes.logout(request("/api/auth/logout", "POST", cookie, false));
  assert.equal(csrf.status, 403);
  assert.equal(csrf.headers.get("set-cookie"), null);
  assert.ok(await f.sessions.read(cookie.split("=")[1]));
  const response = await routes.logout(request("/api/auth/logout", "POST", cookie));
  assert.equal(response.status, 204);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.ok(response.headers.getSetCookie().every(value => value.includes("Max-Age=0")));
  assert.equal(await f.sessions.read(cookie.split("=")[1]), null);
});

test("callback mount mismatch and runtime failures are redacted before provider access", async () => {
  const f = customerJourneyFixture(); // Old arbitrary callback path cannot activate these mounted routes.
  const mismatch = createCustomerAuthRoutes(async () => f.runtime);
  assert.equal((await mismatch.login(request("/api/auth/login"))).status, 503);
  assert.equal(f.started, 0);
  const unavailable = createCustomerAuthRoutes(async () => { throw new Error("private-connection-detail"); });
  const response = await unavailable.session(request("/api/auth/session", "GET"));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("private"));
});

test("deployment storage settings reject insecure overrides, missing keys and unbounded options", () => {
  const env = {
    FAJI_CUSTOMER_AUTH_DATABASE_URL: "postgresql://fixture:fixture@database.example.invalid/customer_fixture",
    FAJI_CUSTOMER_AUTH_ACTIVE_KEY_ID: "fixture",
    FAJI_CUSTOMER_AUTH_KEYS_JSON: JSON.stringify({ fixture: randomBytes(32).toString("base64") }),
    FAJI_CUSTOMER_AUTH_DB_MAX_CONNECTIONS: "2", FAJI_CUSTOMER_AUTH_DB_CONNECT_TIMEOUT_MS: "5000",
    FAJI_CUSTOMER_AUTH_DB_STATEMENT_TIMEOUT_MS: "10000", FAJI_CUSTOMER_AUTH_DB_LOCK_TIMEOUT_MS: "5000",
  };
  assert.ok(loadCustomerStorageSettings(env));
  assert.equal(loadCustomerStorageSettings({}), null);
  for (const change of [
    { FAJI_CUSTOMER_AUTH_DATABASE_URL: `${env.FAJI_CUSTOMER_AUTH_DATABASE_URL}?sslmode=disable` },
    { FAJI_CUSTOMER_AUTH_KEYS_JSON: "{}" }, { FAJI_CUSTOMER_AUTH_KEYS_JSON: "not-json" },
    { FAJI_CUSTOMER_AUTH_DB_MAX_CONNECTIONS: "101" }, { FAJI_CUSTOMER_AUTH_DB_LOCK_TIMEOUT_MS: "20000" },
  ]) assert.equal(loadCustomerStorageSettings({ ...env, ...change }), null);
});
