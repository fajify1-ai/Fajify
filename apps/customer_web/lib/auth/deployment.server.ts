import "server-only";
import { Pool } from "pg";
import { loadWebOidcSettings } from "./config.server";
import { createCustomerWebRuntime } from "./runtime.server";
import type { CustomerWebJourneyRuntime } from "./journey-http.server";

export const CUSTOMER_CALLBACK_PATH = "/api/auth/callback";

/** Server-only deployment values. Reject URL query options so they cannot
 * override certificate verification. No DB connection is made while parsing. */
export function loadCustomerStorageSettings(env: Readonly<Record<string, string | undefined>>) {
  try {
    const databaseUrl = new URL(env.FAJI_CUSTOMER_AUTH_DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || !databaseUrl.hostname ||
      !databaseUrl.username || !databaseUrl.password || databaseUrl.pathname.length < 2 ||
      databaseUrl.search || databaseUrl.hash) return null;
    const activeKeyId = env.FAJI_CUSTOMER_AUTH_ACTIVE_KEY_ID ?? "";
    const parsed: unknown = JSON.parse(env.FAJI_CUSTOMER_AUTH_KEYS_JSON ?? "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const keys = new Map<string, Uint8Array>();
    for (const [id, value] of Object.entries(parsed)) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || typeof value !== "string") return null;
      const key = Buffer.from(value, "base64");
      if (key.length !== 32 || key.toString("base64") !== value) return null;
      keys.set(id, key);
    }
    if (!keys.has(activeKeyId)) return null;
    const integer = (name: string) => {
      const raw = env[name] ?? "";
      const value = Number(raw);
      if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(value)) throw new Error();
      return value;
    };
    const max = integer("FAJI_CUSTOMER_AUTH_DB_MAX_CONNECTIONS");
    const connectionTimeoutMillis = integer("FAJI_CUSTOMER_AUTH_DB_CONNECT_TIMEOUT_MS");
    const statementTimeout = integer("FAJI_CUSTOMER_AUTH_DB_STATEMENT_TIMEOUT_MS");
    const lockTimeout = integer("FAJI_CUSTOMER_AUTH_DB_LOCK_TIMEOUT_MS");
    if (max > 100 || connectionTimeoutMillis > 60000 || statementTimeout > 60000 ||
      lockTimeout > statementTimeout) return null;
    return { databaseUrl: databaseUrl.href, activeKeyId, keys, max,
      connectionTimeoutMillis, statementTimeout, lockTimeout,
      ca: env.FAJI_CUSTOMER_AUTH_DB_CA_PEM || undefined };
  } catch { return null; }
}

let pending: Promise<CustomerWebJourneyRuntime | null> | undefined;

/** One pool/runtime per Node process, shared by routes and Server Components.
 * Failed startup is closed for this process; restart after fixing deployment.
 * Nothing is initialized until every required setting and callback path validates. */
export function getCustomerWebRuntime(): Promise<CustomerWebJourneyRuntime | null> {
  const settings = loadWebOidcSettings(process.env);
  if (!settings || settings.auth.redirectUri.pathname !== CUSTOMER_CALLBACK_PATH) return Promise.resolve(null);
  const storage = loadCustomerStorageSettings(process.env);
  if (!storage) return Promise.resolve(null);
  pending ??= (async () => {
    const pool = new Pool({ connectionString: storage.databaseUrl, max: storage.max,
      connectionTimeoutMillis: storage.connectionTimeoutMillis,
      statement_timeout: storage.statementTimeout, lock_timeout: storage.lockTimeout,
      ssl: { rejectUnauthorized: true, ...(storage.ca ? { ca: storage.ca } : {}) } });
    // Idle-client failures must not crash the process or log connection secrets.
    pool.on("error", () => {});
    const runtime = await createCustomerWebRuntime(process.env, { pool,
      activeKeyId: storage.activeKeyId, keys: storage.keys });
    if (!runtime) await pool.end();
    return runtime;
  })().catch(() => null);
  return pending;
}
