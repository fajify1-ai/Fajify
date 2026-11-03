import "server-only";
import { loadWebOidcSettings } from "./config.server";
import { EncryptedAuthRecord } from "./encrypted-record.server";
import type { CustomerWebJourneyRuntime } from "./journey-http.server";
import { OidcCallbackService } from "./oidc.server";
import { OpenIdClientAdapter } from "./openid-client.server";
import { PostgresAuthRecords, postgresAuthStores, type AuthSqlPool } from "./postgres-stores.server";
import { SessionService } from "./session.server";

/** Deployment supplies a dedicated TLS-verified pool and secret-manager keys.
 * Deliberately not called by the application until deployment approval. */
export async function createCustomerWebRuntime(
  env: Readonly<Record<string, string | undefined>>,
  storage: { pool: AuthSqlPool; activeKeyId: string; keys: ReadonlyMap<string, Uint8Array> } | null,
  discover = OpenIdClientAdapter.discover,
): Promise<CustomerWebJourneyRuntime | null> {
  const settings = loadWebOidcSettings(env);
  if (!settings || !storage) return null;
  try {
    const cipher = new EncryptedAuthRecord(storage.activeKeyId, storage.keys);
    const stores = postgresAuthStores(new PostgresAuthRecords(storage.pool, cipher));
    const adapter = await discover(settings, stores.credentials);
    const sessions = new SessionService(stores.sessions, adapter, Date.now, adapter);
    const callback = new OidcCallbackService(settings.auth.redirectUri, settings.auth.issuer, stores.transactions, adapter);
    return { settings, adapter, sessions, callback, transactions: stores.transactions, revoker: adapter };
  } catch { return null; }
}
