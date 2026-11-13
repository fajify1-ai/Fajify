import 'server-only';
import { randomBytes } from 'node:crypto';

export const sessionCookie = '__Host-faji-admin-session';
export const transactionCookie = '__Host-faji-admin-oidc';
export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } as const;
export const transactionSeconds = 300;

type Transaction = { state: string; nonce: string; verifier: string; expires: number };
type Session = { accessToken: string; expires: number };

class ExpiringStore<T extends { expires: number }> {
  private readonly records = new Map<string, T>();

  create(value: T) {
    for (const [id, record] of this.records) {
      if (record.expires <= Date.now()) this.records.delete(id);
    }
    if (this.records.size >= 512) throw new Error('Admin session store is full');
    const id = randomBytes(32).toString('base64url');
    this.records.set(id, value);
    return id;
  }

  get(id: string | undefined) {
    if (!id) return undefined;
    const record = this.records.get(id);
    if (record && record.expires > Date.now()) return record;
    this.records.delete(id);
  }

  remove(id: string | undefined) {
    if (id) this.records.delete(id);
  }

  take(id: string | undefined) {
    const value = this.get(id);
    this.remove(id);
    return value;
  }
}

// Next can bundle route handlers separately. Keep one store per Node process.
const runtime = globalThis as typeof globalThis & {
  fajiAdminStores?: { sessions: ExpiringStore<Session>; transactions: ExpiringStore<Transaction> };
};
export const { sessions, transactions } = runtime.fajiAdminStores ??= {
  sessions: new ExpiringStore<Session>(),
  transactions: new ExpiringStore<Transaction>(),
};
