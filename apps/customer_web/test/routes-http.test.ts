import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { access } from "node:fs/promises";
import { once } from "node:events";

/** Run after next build. A separate real HTTP server is deliberately disabled;
 * configured protocol/SDK/storage behavior is covered by the existing suites. */
test("built Next.js routes fail closed over HTTP and keep the public shell available", { timeout: 45000 }, async () => {
  await access(new URL("../.next/BUILD_ID", import.meta.url));
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  if (!address || typeof address === "string") throw new Error("No isolated HTTP port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FAJI_CUSTOMER_WEB_AUTH_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1" },
  });
  // Drain output without printing deployment diagnostics or environment values.
  child.stdout.resume(); child.stderr.resume();
  const stopped = once(child, "exit");
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error("Isolated Next.js server exited before readiness");
      try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).status === 200; } catch { /* Wait for startup. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Built public shell responds on isolated loopback server");
    for (const [path, method] of [["login", "POST"], ["register", "POST"], ["recover", "POST"],
      ["verify-email", "POST"], ["callback", "GET"], ["logout", "POST"], ["session", "GET"]]) {
      const response = await fetch(`${origin}/api/auth/${path}`, { method, redirect: "manual",
        headers: { origin, cookie: "__Host-faji-customer-session=forged" }, signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("location"), null);
      assert.deepEqual(await response.json(), { code: "authentication_unavailable" });
      if (path === "callback" || path === "logout") {
        const cookies = response.headers.getSetCookie();
        assert.equal(cookies.length, path === "callback" ? 1 : 2);
        assert.ok(cookies.every(cookie => cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("Max-Age=0")));
      }
    }
    for (const [path, method] of [["login", "GET"], ["callback", "POST"], ["logout", "GET"], ["session", "POST"]]) {
      assert.equal((await fetch(`${origin}/api/auth/${path}`, { method, signal: AbortSignal.timeout(3000) })).status, 405);
    }
  } finally {
    if (child.exitCode === null) child.kill();
    await stopped;
  }
});
