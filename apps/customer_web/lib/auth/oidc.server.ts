import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

import type { ServerSession } from "./session.server";

export interface OidcTransaction {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly browserBindingDigest: string;
  readonly issuer: string;
  readonly redirectUri: string;
  readonly expiresAt: number;
}

/** consume must atomically remove a transaction; a replay must return null.
 * The future login adapter must create cryptographically random state, nonce,
 * PKCE verifier and HttpOnly browser binding through the selected OIDC SDK.
 */
export interface OidcTransactionStore {
  consume(state: string): Promise<OidcTransaction | null>;
}

export interface OidcSdkAdapter {
  /** Maintained SDK must exchange the code with S256 PKCE and verify signed
   * ID-token signature, issuer, audience, expiry and nonce. Then apply approved
   * active-account/customer policy. Never return tokens to browser JavaScript.
   */
  exchangeAndVerify(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
    issuer: string;
    redirectUri: string;
  }): Promise<ServerSession>;
}

export class AuthenticationUnavailable extends Error {
  constructor() {
    super("BLOCKED BY PHASE 1: customer identity integration is not enabled");
  }
}

export class PendingOidcAdapter implements OidcSdkAdapter {
  async exchangeAndVerify(): Promise<ServerSession> {
    throw new AuthenticationUnavailable();
  }
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class InvalidOidcCallback extends Error {
  constructor() { super("Invalid or expired authentication callback"); }
}

/** Preliminary callback checks, NOT a replacement for SDK token verification.
 * This is unmounted until Phase 1 approves the web client and exact callback.
 */
export class OidcCallbackService {
  constructor(
    private readonly redirectUri: URL,
    private readonly issuer: URL,
    private readonly transactions: OidcTransactionStore,
    private readonly sdk: OidcSdkAdapter,
    private readonly clock: () => number = Date.now,
  ) {}

  async complete(url: URL, browserBinding?: string): Promise<ServerSession> {
    const invalid = () => { throw new InvalidOidcCallback(); };
    if (
      this.redirectUri.protocol !== "https:" ||
      this.issuer.protocol !== "https:" ||
      url.origin !== this.redirectUri.origin ||
      url.pathname !== this.redirectUri.pathname ||
      url.username || url.password || url.hash ||
      url.searchParams.has("error") ||
      !browserBinding || !/^[A-Za-z0-9_-]{43}$/.test(browserBinding)
    ) return invalid();

    for (const key of ["state", "code", "iss"]) {
      if (url.searchParams.getAll(key).length !== 1) return invalid();
    }
    const state = url.searchParams.get("state")!;
    const code = url.searchParams.get("code")!;
    const issuer = url.searchParams.get("iss")!;
    if (
      !/^[A-Za-z0-9_-]{43,128}$/.test(state) ||
      !code || code.length > 4096 ||
      issuer !== this.issuer.href
    ) return invalid();

    const transaction = await this.transactions.consume(state);
    if (
      !transaction ||
      !Number.isFinite(transaction.expiresAt) ||
      transaction.expiresAt <= this.clock() ||
      !equal(transaction.state, state) ||
      !equal(
        transaction.browserBindingDigest,
        createHash("sha256").update(browserBinding).digest("hex"),
      ) ||
      transaction.issuer !== this.issuer.href ||
      transaction.redirectUri !== this.redirectUri.href ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(transaction.codeVerifier) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(transaction.nonce)
    ) return invalid();

    return this.sdk.exchangeAndVerify({
      code,
      codeVerifier: transaction.codeVerifier,
      nonce: transaction.nonce,
      issuer: transaction.issuer,
      redirectUri: transaction.redirectUri,
    });
  }
}
