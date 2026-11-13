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

  async create(value: T) {
    for (const [id, record] of this.records) {
      if (record.expires <= Date.now()) this.records.delete(id);
    }
    if (this.records.size >= 512) throw new Error('Admin session store is full');
    const id = randomBytes(32).toString('base64url');
    this.records.set(id, value);
    return id;
  }

  async get(id: string | undefined) {
    if (!id) return undefined;
    const record = this.records.get(id);
    if (record && record.expires > Date.now()) return record;
    this.records.delete(id);
  }

  async remove(id: string | undefined) {
    if (id) this.records.delete(id);
  }

  async take(id: string | undefined) {
    if (!id) return undefined;
    const value = this.records.get(id);
    this.records.delete(id);
    return value && value.expires > Date.now() ? value : undefined;
  }
}

type Store<T> = {
  create(value: T): Promise<string>;
  get(id: string | undefined): Promise<T | undefined>;
  take(id: string | undefined): Promise<T | undefined>;
  remove(id: string | undefined): Promise<void>;
};

export function redisStore<T extends { expires: number }>(
  namespace: string, kind: string, endpoint: URL, token: string,
): Store<T> {
  async function command(parts: (string | number)[]) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify(parts),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Admin session storage unavailable');
    const result = await response.json();
    if (result.error || !Object.hasOwn(result, 'result')) throw new Error('Admin session storage unavailable');
    return result.result as unknown;
  }
  const key = (id: string) => `fajify-admin:${namespace}:${kind}:${id}`;
  const valid = (id: string | undefined): id is string => Boolean(id && /^[A-Za-z0-9_-]{43}$/.test(id));
  async function read(operation: 'GET' | 'GETDEL', id: string | undefined) {
    if (!valid(id)) return undefined;
    const record = await command([operation, key(id)]);
    if (typeof record !== 'string') return undefined;
    const value = JSON.parse(record) as T;
    return value.expires > Date.now() ? value : undefined;
  }
  return {
    async create(value) {
      const id = randomBytes(32).toString('base64url');
      const ttl = value.expires - Date.now();
      if (ttl <= 0 || await command(['SET', key(id), JSON.stringify(value), 'PX', ttl, 'NX']) !== 'OK') {
        throw new Error('Admin session could not be created');
      }
      return id;
    },
    get: id => read('GET', id),
    take: id => read('GETDEL', id),
    async remove(id) {
      if (valid(id)) await command(['DEL', key(id)]);
    },
  };
}

function store<T extends { expires: number }>(kind: string, memory: Store<T>): Store<T> {
  function current() {
    const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token, FAJI_ADMIN_WEB_ORIGIN: origin } = process.env;
    if (!url && !token && process.env.VERCEL !== '1') return memory;
    if (!url || !token || !origin) throw new Error('Shared admin session storage is required');
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
        endpoint.pathname !== '/' || endpoint.search || endpoint.hash) throw new Error('Invalid Redis endpoint');
    return redisStore<T>(new URL(origin).origin, kind, endpoint, token);
  }
  return {
    create: async value => current().create(value),
    get: async id => id ? current().get(id) : undefined,
    take: async id => id ? current().take(id) : undefined,
    remove: async id => { if (id) await current().remove(id); },
  };
}

// Next can bundle route handlers separately. Keep one store per Node process.
const runtime = globalThis as typeof globalThis & {
  fajiAdminStores?: { sessions: ExpiringStore<Session>; transactions: ExpiringStore<Transaction> };
};
const memory = runtime.fajiAdminStores ??= {
  sessions: new ExpiringStore<Session>(),
  transactions: new ExpiringStore<Transaction>(),
};

export const sessions = store('session', memory.sessions);
export const transactions = store('transaction', memory.transactions);
