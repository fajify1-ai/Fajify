import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { EncryptedAuthRecord } from "../lib/auth/encrypted-record.server";
import { PostgresAuthRecords, postgresAuthStores, type AuthSqlPool } from "../lib/auth/postgres-stores.server";
import { createCustomerWebRuntime } from "../lib/auth/runtime.server";

const key = randomBytes(32);
const cipher = () => new EncryptedAuthRecord("current", new Map([["current", key]]));

test("authenticated encryption hides secrets and binds records to their customer and kind", () => {
  const codec = cipher();
  const value = { refreshToken: "sensitive-test-value" };
  const sealed = codec.seal(value, "credential:customer-a");
  assert.ok(!sealed.includes(value.refreshToken));
  assert.notEqual(sealed, codec.seal(value, "credential:customer-a"));
  assert.deepEqual(codec.open(sealed, "credential:customer-a"), value);
  for (const context of ["credential:customer-b", "session:customer-a"]) {
    assert.throws(() => codec.open(sealed, context), /Invalid encrypted/);
  }
  const parts = sealed.split(".");
  parts[4] = (parts[4][0] === "A" ? "B" : "A") + parts[4].slice(1);
  assert.throws(() => codec.open(parts.join("."), "credential:customer-a"), /Invalid encrypted/);
});

test("encryption key rotation reads retained keys but rejects retired keys and invalid configuration", () => {
  const previous = cipher().seal({ token: "fixture" }, "context");
  const replacement = randomBytes(32);
  const rotated = new EncryptedAuthRecord("next", new Map([["current", key], ["next", replacement]]));
  assert.deepEqual(rotated.open(previous, "context"), { token: "fixture" });
  assert.ok(rotated.seal({}, "context").startsWith("1.next."));
  assert.throws(() => new EncryptedAuthRecord("next", new Map([["next", replacement]])).open(previous, "context"));
  assert.throws(() => new EncryptedAuthRecord("missing", new Map()));
  assert.throws(() => new EncryptedAuthRecord("bad", new Map([["bad", randomBytes(16)]])));
});

/** SQL protocol fixture, NOT a PostgreSQL persistence/concurrency test. */
function fixture() {
  const rows = new Map<string, Record<string, unknown>>();
  const calls: { sql: string; values: unknown[] }[] = [];
  const releases: (Error | undefined)[] = [];
  let failCommit = false;
  const pool: AuthSqlPool = { connect: async () => ({
    query: async (sql, values = []) => {
      calls.push({ sql, values });
      const id = `${values[0]}:${values[1]}`;
      if (sql.startsWith("SELECT payload")) return { rows: rows.has(id) ? [rows.get(id)!] : [] };
      if (sql.startsWith("INSERT")) rows.set(id, { payload: values[2], expires_at_ms: values[3] });
      if (sql.startsWith("DELETE")) rows.delete(id);
      if (sql === "COMMIT" && failCommit) throw new Error("driver details must be redacted");
      return { rows: [] };
    },
    release: error => { releases.push(error); },
  }) };
  let now = 1000;
  const records = new PostgresAuthRecords(pool, cipher(), () => now);
  return { rows, calls, releases, records, stores: postgresAuthStores(records),
    expire: () => { now = 3000; }, fail: () => { failCommit = true; } };
}

test("durable transaction adapter consumes once, hashes identifiers and encrypts PKCE", async () => {
  const f = fixture();
  const transaction = { state: "s".repeat(43), nonce: "n".repeat(43), codeVerifier: "p".repeat(43),
    browserBindingDigest: "b".repeat(64), issuer: "https://issuer.example.invalid", redirectUri: "https://web.example.invalid/callback", expiresAt: 2000 };
  await f.stores.transactions.create(transaction);
  assert.ok(!JSON.stringify([...f.rows]).includes(transaction.codeVerifier));
  assert.ok(!JSON.stringify([...f.rows]).includes(transaction.state));
  assert.deepEqual(await f.stores.transactions.consume(transaction.state), transaction);
  assert.equal(await f.stores.transactions.consume(transaction.state), null);
  assert.equal(f.calls[0].sql, "BEGIN ISOLATION LEVEL READ COMMITTED");
  assert.match(f.calls[1].sql, /pg_advisory_xact_lock/);
  assert.equal(f.calls.at(-1)?.sql, "COMMIT");
  assert.ok(f.releases.every(value => value === undefined));
});

test("session storage refuses duplicate identifiers and expired records", async () => {
  const f = fixture();
  const id = "a".repeat(64);
  const session = { identity: { subject: "customer", emailVerified: true, customerAccess: true }, expiresAt: 2000 };
  await f.stores.sessions.put(id, session);
  assert.deepEqual(await f.stores.sessions.get(id), session);
  await assert.rejects(f.stores.sessions.put(id, session), /storage unavailable/);
  f.expire();
  assert.equal(await f.stores.sessions.get(id), null);
  assert.equal(f.rows.size, 0);
});

test("credential rotation retains the original session expiry and logout deletes credentials", async () => {
  const f = fixture();
  const id = "c".repeat(43);
  const credentials = { accessToken: "access", refreshToken: "refresh", idToken: "id", expiresAt: 1500,
    subject: "customer-a", configurationBinding: "binding" };
  await f.stores.credentials.create(id, credentials, 2000);
  await f.stores.credentials.use(id, async current => {
    assert.deepEqual(current, credentials);
    return { next: { ...current!, refreshToken: "rotated" }, result: undefined };
  });
  assert.equal([...f.rows.values()][0].expires_at_ms, 2000);
  await f.stores.credentials.use(id, async current => {
    assert.equal(current?.refreshToken, "rotated");
    return { next: null, result: undefined };
  });
  await f.stores.credentials.use(id, async current => {
    assert.equal(current, null);
    return { next: null, result: undefined };
  });
  await assert.rejects(f.stores.credentials.use(id, async () => ({ next: credentials, result: undefined })));
});

test("tampered expiry or cross-record ciphertext fails closed before callbacks", async () => {
  const f = fixture();
  await f.records.use("credential", "a".repeat(43), async () => ({ next: { value: {}, expiresAt: 2000 }, result: undefined }));
  const row = [...f.rows.values()][0];
  row.expires_at_ms = 9000;
  let calls = 0;
  await assert.rejects(f.records.use("credential", "a".repeat(43), async current => {
    calls++; return { next: current, result: undefined };
  }));
  assert.equal(calls, 0);
});

test("commit failures roll back, discard the connection, redact errors and never retry external operations", async () => {
  const f = fixture();
  f.fail();
  let operations = 0;
  await assert.rejects(f.records.use("credential", "a".repeat(43), async () => {
    operations++; return { next: null, result: undefined };
  }), { message: "Authentication storage unavailable" });
  assert.equal(operations, 1);
  assert.equal(f.calls.at(-1)?.sql, "ROLLBACK");
  assert.ok(f.releases[0] instanceof Error);
});

test("runtime stays unavailable without approved configuration and storage, without discovery or database access", async () => {
  let calls = 0;
  const discover = async () => { calls++; throw new Error("must not discover"); };
  assert.equal(await createCustomerWebRuntime({}, null, discover), null);
  assert.equal(await createCustomerWebRuntime({ FAJI_CUSTOMER_WEB_AUTH_ENABLED: "true" }, null, discover), null);
  assert.equal(calls, 0);
});

test("pool connection failures redact driver details before reaching callers", async () => {
  const records = new PostgresAuthRecords({ async connect() { throw new Error("fixture-credential-in-driver-error"); } }, cipher());
  let calls = 0;
  await assert.rejects(records.use("credential", "a".repeat(43), async () => {
    calls++; return { next: null, result: undefined };
  }), { message: "Authentication storage unavailable" });
  assert.equal(calls, 0);
});
