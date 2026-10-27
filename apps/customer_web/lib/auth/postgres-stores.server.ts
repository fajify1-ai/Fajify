import "server-only";
import { createHash } from "node:crypto";
import { EncryptedAuthRecord } from "./encrypted-record.server";
import type { OidcTransaction, OidcTransactionStore } from "./oidc.server";
import type { ProviderCredentials, ProviderCredentialStore, WritableOidcTransactionStore } from "./openid-client.server";
import type { ServerSession, SessionStore } from "./session.server";

/** Compatible with a dedicated pg Pool. No connection, schema migration, secret
 * or process-local fallback is created by this module. Never log parameters. */
export interface AuthSqlClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(error?: Error): void;
}
export interface AuthSqlPool { connect(): Promise<AuthSqlClient> }
type Kind = "session" | "transaction" | "credential";
type Stored = { value: unknown; expiresAt: number };

export class PostgresAuthRecords {
  constructor(private readonly pool: AuthSqlPool, private readonly cipher: EncryptedAuthRecord,
    private readonly clock: () => number = Date.now) {}

  /** One connection and transaction per operation. Lock covers missing rows as
   * well as existing rows and all instances. No callback/commit retries. */
  async use<T>(kind: Kind, id: string, operation: (current: Stored | null) => Promise<{
    next: Stored | null; result: T;
  }>): Promise<T> {
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(id)) throw new Error("Invalid authentication record identifier");
    const digest = createHash("sha256").update(id).digest("hex");
    const context = `${kind}:${digest}`;
    const lock = createHash("sha256").update(context).digest().readBigInt64BE().toString();
    let client: AuthSqlClient;
    try { client = await this.pool.connect(); }
    catch { throw new Error("Authentication storage unavailable"); }
    let failure: Error | undefined;
    try {
      // The read after a waiting lock must see the preceding holder's commit,
      // even if the pool/database defaults to REPEATABLE READ.
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [lock]);
      const { rows } = await client.query(
        "SELECT payload, expires_at_ms FROM customer_web_auth.records WHERE kind = $1 AND id_digest = $2", [kind, digest]);
      let current: Stored | null = null;
      const row = rows[0];
      if (row && Number(row.expires_at_ms) > this.clock()) {
        // Bind expiry to ciphertext too: changing a plaintext TTL cannot revive a record.
        const decoded = this.cipher.open(String(row.payload), context) as Stored;
        if (!decoded || !Number.isSafeInteger(decoded.expiresAt) || decoded.expiresAt !== Number(row.expires_at_ms)) {
          throw new Error("Invalid authentication record expiry");
        }
        current = decoded;
      }
      const outcome = await operation(current);
      if (outcome.next) {
        if (!Number.isSafeInteger(outcome.next.expiresAt) || outcome.next.expiresAt <= this.clock()) {
          throw new Error("Invalid authentication record expiry");
        }
        await client.query("INSERT INTO customer_web_auth.records (kind, id_digest, payload, expires_at_ms) VALUES ($1, $2, $3, $4) ON CONFLICT (kind, id_digest) DO UPDATE SET payload = EXCLUDED.payload, expires_at_ms = EXCLUDED.expires_at_ms",
          [kind, digest, this.cipher.seal(outcome.next, context), outcome.next.expiresAt]);
      } else {
        await client.query("DELETE FROM customer_web_auth.records WHERE kind = $1 AND id_digest = $2", [kind, digest]);
      }
      await client.query("COMMIT");
      return outcome.result;
    } catch {
      failure = new Error("Authentication storage unavailable");
      try { await client.query("ROLLBACK"); } catch { /* Discard connection below. */ }
      throw failure;
    } finally { client.release(failure); }
  }
}

export function postgresAuthStores(records: PostgresAuthRecords): {
  sessions: SessionStore;
  transactions: OidcTransactionStore & WritableOidcTransactionStore;
  credentials: ProviderCredentialStore;
} {
  const create = (kind: Kind, id: string, value: unknown, expiresAt: number) =>
    records.use(kind, id, async current => {
      if (current) throw new Error("Authentication record already exists");
      return { next: { value, expiresAt }, result: undefined };
    });
  return {
    sessions: {
      get: digest => records.use("session", digest, async current => ({ next: current, result: current?.value as ServerSession | undefined ?? null })),
      put: (digest, session) => create("session", digest, session, session.expiresAt),
      delete: digest => records.use("session", digest, async () => ({ next: null, result: undefined })),
    },
    transactions: {
      create: transaction => create("transaction", transaction.state, transaction, transaction.expiresAt),
      consume: state => records.use("transaction", state, async current => ({ next: null, result: current?.value as OidcTransaction | undefined ?? null })),
    },
    credentials: {
      create: (id, credentials, expiry) => create("credential", id, credentials, expiry),
      use: (id, operation) => records.use("credential", id, async current => {
        const outcome = await operation(current?.value as ProviderCredentials | undefined ?? null);
        if (outcome.next && !current) throw new Error("Cannot resurrect provider credentials");
        return { next: outcome.next ? { value: outcome.next, expiresAt: current!.expiresAt } : null, result: outcome.result };
      }),
    },
  };
}
