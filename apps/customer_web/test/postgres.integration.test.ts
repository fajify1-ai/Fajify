import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { EncryptedAuthRecord } from "../lib/auth/encrypted-record.server";
import { PostgresAuthRecords, postgresAuthStores } from "../lib/auth/postgres-stores.server";
import { SessionService } from "../lib/auth/session.server";
import { withCustomerSession } from "../lib/auth/http.server";

const marker = process.env.FAJI_AUTH_TEST_CLUSTER ?? "";
const port = Number(process.env.FAJI_AUTH_TEST_PORT);
const password = process.env.FAJI_AUTH_TEST_PASSWORD;
const enabled = /^faji_auth_test_[a-f0-9]{32}$/.test(marker) && Number.isInteger(port) && port > 1024 && port <= 65535 && !!password;
const id = () => randomBytes(32).toString("base64url");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

test("real isolated PostgreSQL authentication storage", { skip: !enabled, timeout: 60000 }, async t => {
  const bootstrap = { host: "127.0.0.1", port, user: "faji_auth_test_admin", password, database: "postgres", connectionTimeoutMillis: 3000 };
  const admin = new Pool(bootstrap);
  const pools: Pool[] = [];
  const secrets: string[] = [password!];
  const key = randomBytes(32);
  const nextKey = randomBytes(32);
  secrets.push(key.toString("base64"), nextKey.toString("base64"));
  const databaseName = "faji_customer_auth_isolated";
  try {
    // No DDL until the server proves it is the fresh runner-owned cluster.
    assert.equal((await admin.query("SHOW cluster_name")).rows[0].cluster_name, marker);
    await admin.query(`CREATE DATABASE ${databaseName}`);
    const owner = new Pool({ ...bootstrap, database: databaseName });
    pools.push(owner);
    await owner.query(await readFile(new URL("../lib/auth/storage-schema.sql", import.meta.url), "utf8"));
    const runtimePassword = randomBytes(32).toString("hex");
    secrets.push(runtimePassword);
    // Hex generated locally; no external text interpolated into DDL.
    await owner.query(`CREATE ROLE faji_auth_runtime LOGIN PASSWORD '${runtimePassword}'`);
    await owner.query("REVOKE ALL ON SCHEMA public FROM PUBLIC");
    await owner.query("GRANT CONNECT ON DATABASE faji_customer_auth_isolated TO faji_auth_runtime");
    await owner.query("GRANT USAGE ON SCHEMA customer_web_auth TO faji_auth_runtime");
    await owner.query("GRANT SELECT, INSERT, UPDATE, DELETE ON customer_web_auth.records TO faji_auth_runtime");
    const connection = { ...bootstrap, database: databaseName, user: "faji_auth_runtime", password: runtimePassword,
      options: "-c default_transaction_isolation=repeatable\\ read -c lock_timeout=5000 -c statement_timeout=10000" };
    const a = new Pool(connection), b = new Pool(connection);
    pools.push(a, b);
    const codec = new EncryptedAuthRecord("test", new Map([["test", key]]));
    let now = Date.now();
    const make = (pool: Pool, cipher = codec) => postgresAuthStores(new PostgresAuthRecords(pool, cipher, () => now));
    const stores = make(a), other = make(b);
    const service = new SessionService(stores.sessions, { async revoke() {} }, () => now);
    const session = () => ({ identity: { subject: "customer-a", emailVerified: true, customerAccess: true }, expiresAt: now + 60000 });
    const cookieId = (cookie: string) => cookie.split(";")[0].split("=")[1];
    const credentials = () => {
      const value = { accessToken: id(), refreshToken: id(), idToken: id(), expiresAt: now + 30000,
        subject: "customer-a", configurationBinding: "test-binding" };
      secrets.push(value.accessToken, value.refreshToken, value.idToken);
      return value;
    };

    await t.test("schema applied and runtime role has DML without schema creation", async () => {
      assert.equal((await a.query("SELECT current_database() AS name")).rows[0].name, databaseName);
      await assert.rejects(a.query("CREATE TABLE customer_web_auth.not_allowed (id int)"), { code: "42501" });
      assert.match((await owner.query("SELECT version() AS version")).rows[0].version, /PostgreSQL 18/);
      assert.notEqual((await a.query("SELECT pg_backend_pid() AS pid")).rows[0].pid,
        (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
    });

    await t.test("session create/read/replacement/delete/expiry use real persistent records", async () => {
      const first = cookieId((await service.create(session())).cookie);
      assert.equal((await service.read(first))?.identity.subject, "customer-a");
      assert.equal((await other.sessions.get(hash(first)))?.identity.subject, "customer-a");
      const second = cookieId((await service.create(session(), first)).cookie);
      assert.equal(await service.read(first), null);
      assert.ok(await service.read(second));
      await service.logout(second);
      assert.equal(await service.read(second), null);
      const expired = cookieId((await service.create(session())).cookie);
      now += 60001;
      assert.equal(await service.read(expired), null);
    });

    await t.test("provider records are encrypted at rest and key rotation survives across pools", async () => {
      const ref = id(), value = credentials();
      await stores.credentials.create(ref, value, now + 60000);
      const raw = JSON.stringify((await owner.query("SELECT * FROM customer_web_auth.records")).rows);
      assert.ok(!secrets.some(secret => raw.includes(secret)), "No fixture secrets in stored rows");
      const rotated = make(b, new EncryptedAuthRecord("next", new Map([["test", key], ["next", nextKey]])));
      await rotated.credentials.use(ref, async current => {
        assert.ok(current?.refreshToken === value.refreshToken);
        return { next: current, result: undefined };
      });
      const payload = (await owner.query("SELECT payload FROM customer_web_auth.records WHERE kind='credential' AND id_digest=$1", [hash(ref)])).rows[0].payload;
      assert.ok(payload.startsWith("1.next."));
      const onlyNew = make(a, new EncryptedAuthRecord("next", new Map([["next", nextKey]])));
      await onlyNew.credentials.use(ref, async current => {
        assert.ok(current?.accessToken === value.accessToken);
        return { next: null, result: undefined };
      });
    });

    await t.test("concurrent OIDC consumers on independent connections yield exactly one transaction", async () => {
      const state = id();
      await stores.transactions.create({ state, nonce: id(), codeVerifier: id(), browserBindingDigest: hash(id()),
        issuer: "https://issuer.example.invalid", redirectUri: "https://web.example.invalid/callback", expiresAt: now + 60000 });
      const results = await Promise.all([stores.transactions.consume(state), other.transactions.consume(state)]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal(await stores.transactions.consume(state), null);
    });

    await t.test("refresh then logout serializes across independent connections and cannot resurrect credentials", async () => {
      const ref = id(), value = credentials();
      await stores.credentials.create(ref, value, now + 60000);
      let unlock!: () => void, entered!: () => void;
      const held = new Promise<void>(resolve => { unlock = resolve; });
      const started = new Promise<void>(resolve => { entered = resolve; });
      secrets.push("rotated-test-token");
      const refresh = stores.credentials.use(ref, async current => {
        entered(); await held;
        assert.ok(current?.refreshToken === value.refreshToken);
        return { next: { ...current!, refreshToken: "rotated-test-token" }, result: undefined };
      });
      await started;
      let logoutEntered = false;
      const logout = other.credentials.use(ref, async current => {
        logoutEntered = true;
        assert.ok(current?.refreshToken === "rotated-test-token");
        return { next: null, result: undefined };
      });
      try {
        // Observe a real PostgreSQL advisory-lock waiter, not a timing-only guess.
        let waiting = false;
        for (let n = 0; n < 100 && !waiting; n++) {
          waiting = Number((await owner.query("SELECT count(*) AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted")).rows[0].n) > 0;
          if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
        }
        assert.ok(waiting, "Second connection waits for PostgreSQL advisory lock");
        assert.equal(logoutEntered, false);
      } finally { unlock(); await Promise.all([refresh, logout]); }
      await stores.credentials.use(ref, async current => {
        assert.equal(current, null); return { next: null, result: undefined };
      });
      await assert.rejects(other.credentials.use(ref, async () => ({ next: value, result: undefined })), { message: "Authentication storage unavailable" });
    });

    await t.test("rollback preserves previous credentials after failed operation", async () => {
      const ref = id(), value = credentials();
      await stores.credentials.create(ref, value, now + 60000);
      await assert.rejects(stores.credentials.use(ref, async () => { throw new Error(value.refreshToken); }), { message: "Authentication storage unavailable" });
      await other.credentials.use(ref, async current => {
        assert.ok(current?.refreshToken === value.refreshToken); return { next: null, result: undefined };
      });
    });

    await t.test("logout before refresh leaves no credentials for a later connection to refresh", async () => {
      const ref = id(), value = credentials();
      await stores.credentials.create(ref, value, now + 60000);
      await stores.credentials.use(ref, async current => {
        assert.ok(current); return { next: null, result: undefined };
      });
      let exchanges = 0;
      await other.credentials.use(ref, async current => {
        if (current) exchanges++;
        return { next: null, result: undefined };
      });
      assert.equal(exchanges, 0);
    });

    await t.test("real database authentication failures are redacted without leaking driver messages", async () => {
      const rejected = new Pool({ ...connection, password: randomBytes(32).toString("hex") });
      pools.push(rejected);
      const denied = make(rejected);
      await assert.rejects(denied.sessions.get(hash(id())), { message: "Authentication storage unavailable" });
    });

    await t.test("record swapping and expiry tampering deny access with generic HTTP errors", async () => {
      const first = cookieId((await service.create(session())).cookie);
      const second = cookieId((await service.create(session())).cookie);
      await owner.query("UPDATE customer_web_auth.records SET payload=(SELECT payload FROM customer_web_auth.records WHERE kind='session' AND id_digest=$1) WHERE kind='session' AND id_digest=$2", [hash(hash(first)), hash(hash(second))]);
      const response = await withCustomerSession(second, service, async () => { throw new Error("must not reach protected data"); });
      assert.equal(response.status, 503);
      assert.equal(await response.text(), "");
      await owner.query("UPDATE customer_web_auth.records SET expires_at_ms=expires_at_ms+1 WHERE kind='session' AND id_digest=$1", [hash(hash(first))]);
      await assert.rejects(service.read(first), { message: "Authentication storage unavailable" });
    });

    await t.test("sessions restore after creator process exits and a new application process starts", async () => {
      const run = (request: Record<string, unknown>) => new Promise<Record<string, unknown>>((resolve, reject) => {
        const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "test/helpers/postgres-process.ts"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true, timeout: 15000 });
        let output = "", error = "";
        child.stdout.on("data", chunk => { output += chunk; });
        child.stderr.on("data", chunk => { error += chunk; });
        child.on("error", () => reject(new Error("Persistence worker could not start")));
        child.on("close", code => {
          if (code !== 0 || error) reject(new Error("Persistence worker failed"));
          else { try { resolve(JSON.parse(output)); } catch { reject(new Error("Invalid worker response")); } }
        });
        child.stdin.end(JSON.stringify({ ...request, database: connection, key: key.toString("base64") }));
      });
      const created = await run({ action: "create" });
      assert.equal(typeof created.id, "string");
      const restored = await run({ action: "read", id: created.id });
      assert.equal(restored.restored, true);
    });

    await t.test("PostgreSQL server logs contain no generated passwords, keys or provider tokens", async () => {
      const log = await readFile(process.env.FAJI_AUTH_TEST_LOG!, "utf8");
      assert.ok(!secrets.some(secret => log.includes(secret)), "No sensitive fixture values in PostgreSQL log");
    });
  } finally {
    await Promise.all(pools.map(pool => pool.end()));
    await admin.end();
  }
});
