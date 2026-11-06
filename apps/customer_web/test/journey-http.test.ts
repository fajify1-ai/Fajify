import { test } from "node:test";
import assert from "node:assert/strict";
import { beginCustomerJourney, completeCustomerJourney } from "../lib/auth/journey-http.server";
import { customerJourneyFixture as fixture } from "./helpers/customer-runtime";

test("unconfigured journeys are explicitly unavailable without creating authentication", async () => {
  const request = new Request("https://customer.example.invalid/start-fixture", { method: "POST" });
  const start = await beginCustomerJourney(request, null, "registration");
  assert.equal(start.status, 503);
  assert.deepEqual(await start.json(), { code: "authentication_unavailable" });
  const callback = await completeCustomerJourney(new Request("https://customer.example.invalid/callback"),
    null, undefined, new URL("https://customer.example.invalid/"));
  assert.equal(callback.status, 503);
  assert.match(callback.headers.get("set-cookie")!, /Max-Age=0/);
});

test("initiation requires POST and exact Origin before invoking provider/store", async () => {
  const f = fixture();
  const get = await beginCustomerJourney(new Request("https://customer.example.invalid/start-fixture"), f.runtime, "signIn");
  assert.equal(get.status, 405); assert.equal(get.headers.get("allow"), "POST");
  for (const origin of [undefined, "null", "https://other.example.invalid", "https://customer.example.invalid.evil.invalid"]) {
    const response = await beginCustomerJourney(new Request("https://customer.example.invalid/start-fixture", {
      method: "POST", headers: origin ? { origin } : {},
    }), f.runtime, "recovery");
    assert.equal(response.status, 403);
  }
  assert.equal(f.started, 0);
});

test("every valid journey redirects privately and uses secure browser binding", async () => {
  const f = fixture();
  for (const journey of ["signIn", "registration", "recovery", "verifyEmail"] as const) {
    const response = await beginCustomerJourney(new Request("https://customer.example.invalid/start-fixture", {
      method: "POST", headers: { origin: "https://customer.example.invalid" },
    }), f.runtime, journey);
    assert.equal(response.status, 303);
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("intent-fixture"), journey);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly; Secure; SameSite=Lax/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
});

test("verified callback rotates session, clears binding and ignores arbitrary return queries", async () => {
  const f = fixture();
  const previous = await f.sessions.create(f.session);
  const previousId = previous.cookie.split(";")[0].split("=")[1];
  f.callbackUrl.searchParams.set("next", "https://other.example.invalid");
  const response = await completeCustomerJourney(new Request(f.callbackUrl), f.runtime,
    f.binding, f.success, previousId);
  assert.equal(response.status, 303); assert.equal(response.headers.get("location"), f.success.href);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.some(cookie => cookie.startsWith("__Host-faji-customer-session=")));
  assert.ok(cookies.some(cookie => cookie.startsWith("__Host-faji-oidc-binding=;") && cookie.includes("Max-Age=0")));
  assert.equal(await f.sessions.read(previousId), null);
  assert.equal(await response.text(), "");
  assert.equal(f.records.size, 1);
});

test("invalid or cancelled callbacks never issue session cookies", async () => {
  for (const mode of ["binding", "state", "cancelled", "duplicate-action-status"]) {
    const f = fixture();
    if (mode === "state") f.callbackUrl.searchParams.set("state", "wrong");
    if (mode === "cancelled") f.callbackUrl.searchParams.set("kc_action_status", "cancelled");
    if (mode === "duplicate-action-status") {
      f.callbackUrl.searchParams.append("kc_action_status", "success");
      f.callbackUrl.searchParams.append("kc_action_status", "cancelled");
    }
    const response = await completeCustomerJourney(new Request(f.callbackUrl), f.runtime,
      mode === "binding" ? undefined : f.binding, f.success);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { code: "invalid_authentication_response" });
    assert.ok(!response.headers.get("set-cookie")!.includes("faji-customer-session"));
    assert.equal(f.exchanges, 0); assert.equal(f.records.size, 0);
  }
});

test("callback rejects unapproved return origins and wrong methods before exchange", async () => {
  const f = fixture();
  const post = await completeCustomerJourney(new Request(f.callbackUrl, { method: "POST" }), f.runtime,
    f.binding, f.success);
  assert.equal(post.status, 405);
  for (const url of ["http://customer.example.invalid/", "https://other.example.invalid/", "https://customer.example.invalid/?next=other", "https://user:password@customer.example.invalid/"]) {
    const response = await completeCustomerJourney(new Request(f.callbackUrl), f.runtime,
      f.binding, new URL(url));
    assert.equal(response.status, 503);
  }
  assert.equal(f.exchanges, 0);
});

test("provider/store failures return safe unavailable responses without diagnostics", async () => {
  const f = fixture(); f.fail();
  const start = await beginCustomerJourney(new Request("https://customer.example.invalid/start-fixture", {
    method: "POST", headers: { origin: "https://customer.example.invalid" },
  }), f.runtime, "verifyEmail");
  assert.equal(start.status, 503); assert.ok(!(await start.text()).includes("private"));
  const callback = await completeCustomerJourney(new Request(f.callbackUrl), f.runtime, f.binding, f.success);
  assert.equal(callback.status, 503); assert.ok(!(await callback.text()).includes("private"));
  assert.equal(f.records.size, 0);
});
