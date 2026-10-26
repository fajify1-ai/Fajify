import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "__Host-faji-customer-session";

export interface VerifiedCustomerIdentity {
  readonly subject: string;
  readonly emailVerified: boolean;
  /** Verified provider/account authorization decision, never a cookie claim. */
  readonly customerAccess: boolean;
}

/** Internal frontend record, NOT the Phase 1 /auth/me response contract. */
export interface ServerSession {
  readonly identity: VerifiedCustomerIdentity;
  readonly expiresAt: number;
}

/** A shared persistent TTL store is required before enabling live sessions.
 * Implementations must not log keys or records. No production in-memory fallback.
 */
export interface SessionStore {
  get(digest: string): Promise<ServerSession | null>;
  put(digest: string, session: ServerSession): Promise<void>;
  delete(digest: string): Promise<void>;
}

export interface SessionRevoker {
  revoke(session: ServerSession): Promise<void>;
}

export function sessionCookie(value: string, expiresAt: number): string {
  return [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/", "HttpOnly", "Secure", "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ].join("; ");
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

const validId = (id: string | undefined): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{43}$/.test(id);
const digest = (id: string) =>
  createHash("sha256").update(id).digest("hex");

function authorized(session: ServerSession, now: number): boolean {
  return Boolean(
    typeof session.identity.subject === "string" &&
    session.identity.subject.trim().length > 0 &&
    session.identity.emailVerified === true &&
    session.identity.customerAccess === true &&
    Number.isFinite(session.expiresAt) &&
    session.expiresAt > now,
  );
}

export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly revoker: SessionRevoker,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Call only after a maintained OIDC SDK AND account policy have verified
   * identity. Session lifetime must come from approved provider/server policy.
   */
  async create(
    session: ServerSession,
    previousId?: string,
  ): Promise<{ cookie: string }> {
    if (!authorized(session, this.clock())) {
      throw new Error("Session is not authorized");
    }
    // Invalidate an existing browser session before issuing a fresh opaque ID.
    if (validId(previousId)) await this.store.delete(digest(previousId));
    const id = randomBytes(32).toString("base64url");
    await this.store.put(digest(id), session);
    return { cookie: sessionCookie(id, session.expiresAt) };
  }

  async read(id: string | undefined): Promise<ServerSession | null> {
    if (!validId(id)) return null;
    const key = digest(id);
    const session = await this.store.get(key);
    if (!session) return null;
    if (!authorized(session, this.clock())) {
      await this.store.delete(key);
      return null;
    }
    return session;
  }

  /** Local invalidation happens before remote revocation. A remote failure
   * propagates: callers clear the cookie but must not claim provider logout.
   */
  async logout(id: string | undefined): Promise<void> {
    if (!validId(id)) return;
    const key = digest(id);
    const session = await this.store.get(key);
    await this.store.delete(key);
    if (session) await this.revoker.revoke(session);
  }
}
