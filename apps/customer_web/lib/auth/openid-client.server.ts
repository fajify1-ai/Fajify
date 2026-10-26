import "server-only";
import { createHash, randomBytes } from "node:crypto";
import * as oidc from "openid-client";

import type { WebOidcSettings } from "./config.server";
import { CustomerIdentityClient } from "./identity-api.server";
import { AuthenticationUnavailable, type OidcCallbackService, type OidcSdkAdapter, type OidcTransaction } from "./oidc.server";
import type { ServerSession, SessionRevoker, SessionValidator, SessionService } from "./session.server";

/** Secrets stay in an approved encrypted server vault, never in cookies or
 * Server Components. Implementations must redact records from logs/traces.
 */
export interface ProviderCredentials {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly idToken: string;
  readonly expiresAt: number;
  readonly subject: string;
  readonly configurationBinding: string;
}

export interface ProviderCredentialStore {
  create(id: string, credentials: ProviderCredentials, sessionExpiresAt: number): Promise<void>;
  /** Must serialize across ALL application instances, including logout. On
   * success atomically replace/delete with next. No process-local fallback.
   * Never retry a token exchange after the callback has executed.
   */
  use<T>(id: string, operation: (current: ProviderCredentials | null) => Promise<{
    next: ProviderCredentials | null; result: T;
  }>): Promise<T>;
}

export interface WritableOidcTransactionStore {
  create(transaction: OidcTransaction): Promise<void>;
}

export const OIDC_BINDING_COOKIE = "__Host-faji-oidc-binding";

/** Maintained SDK adapter. The caller must supply real durable stores. This
 * module does not mount routes or enable the blocked customer composition.
 */
export class OpenIdClientAdapter implements OidcSdkAdapter, SessionValidator, SessionRevoker {
  private readonly binding: string;
  constructor(
    private readonly settings: WebOidcSettings,
    private readonly configuration: oidc.Configuration,
    private readonly vault: ProviderCredentialStore,
    private readonly accounts = new CustomerIdentityClient(settings.apiOrigin),
    private readonly clock: () => number = Date.now,
  ) {
    if (configuration.serverMetadata().issuer !== settings.auth.issuer.href ||
      configuration.clientMetadata().client_id !== settings.auth.clientId) {
      throw new AuthenticationUnavailable();
    }
    // Includes JWS signature checks; do not merely decode ID-token claims.
    oidc.enableNonRepudiationChecks(configuration);
    this.binding = createHash("sha256").update(JSON.stringify([
      settings.auth.issuer.href, settings.auth.clientId, settings.apiOrigin.href,
      settings.auth.redirectUri.href, settings.auth.postLogoutRedirectUri.href,
      settings.scopes,
    ])).digest("hex");
  }

  static async discover(settings: WebOidcSettings, vault: ProviderCredentialStore): Promise<OpenIdClientAdapter> {
    try {
      const configuration = await oidc.discovery(settings.auth.issuer,
        settings.auth.clientId, settings.auth.clientSecret);
      return new OpenIdClientAdapter(settings, configuration, vault);
    } catch { throw new AuthenticationUnavailable(); }
  }

  async begin(transactions: WritableOidcTransactionStore): Promise<{ redirect: URL; cookie: string }> {
    try {
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const codeVerifier = oidc.randomPKCECodeVerifier();
      const binding = randomBytes(32).toString("base64url");
      const expiresAt = this.clock() + this.settings.transactionLifetimeMs;
      const redirect = oidc.buildAuthorizationUrl(this.configuration, {
        redirect_uri: this.settings.auth.redirectUri.href, scope: this.settings.scopes,
        state, nonce, code_challenge_method: "S256",
        code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
      });
      await transactions.create({ state, nonce, codeVerifier,
        browserBindingDigest: createHash("sha256").update(binding).digest("hex"),
        issuer: this.settings.auth.issuer.href,
        redirectUri: this.settings.auth.redirectUri.href, expiresAt });
      return { redirect, cookie: `${OIDC_BINDING_COOKIE}=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}` };
    } catch { throw new AuthenticationUnavailable(); }
  }

  private async credentials(tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers,
    expectedSubject?: string, previous?: ProviderCredentials): Promise<ProviderCredentials> {
    const claims = tokens.claims();
    const subject = expectedSubject ?? claims?.sub;
    const refreshToken = tokens.refresh_token ?? previous?.refreshToken;
    const idToken = tokens.id_token ?? previous?.idToken;
    if (!subject || (claims?.sub && claims.sub !== subject) || !refreshToken || !idToken ||
      tokens.token_type.toLowerCase() !== "bearer" || !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in! <= 0) throw new AuthenticationUnavailable();
    const user = await oidc.fetchUserInfo(this.configuration, tokens.access_token, subject);
    if (user.email_verified !== true) throw new AuthenticationUnavailable();
    await this.accounts.load(tokens.access_token, subject);
    return { accessToken: tokens.access_token, refreshToken, idToken, subject,
      configurationBinding: this.binding,
      expiresAt: this.clock() + tokens.expires_in! * 1000 };
  }

  async exchangeAndVerify(input: Parameters<OidcSdkAdapter["exchangeAndVerify"]>[0]): Promise<ServerSession> {
    try {
      if (input.issuer !== this.settings.auth.issuer.href ||
        input.redirectUri !== this.settings.auth.redirectUri.href) throw new AuthenticationUnavailable();
      // State/browser binding and one-time consumption are checked by the
      // existing OidcCallbackService. SDK additionally verifies PKCE and nonce.
      const callback = new URL(input.redirectUri);
      callback.searchParams.set("code", input.code);
      callback.searchParams.set("iss", input.issuer);
      const tokens = await oidc.authorizationCodeGrant(this.configuration, callback, {
        pkceCodeVerifier: input.codeVerifier, expectedNonce: input.nonce, idTokenExpected: true,
      });
      const credentials = await this.credentials(tokens);
      const providerSessionId = randomBytes(32).toString("base64url");
      const expiresAt = this.clock() + this.settings.sessionLifetimeMs;
      await this.vault.create(providerSessionId, credentials, expiresAt);
      return { providerSessionId, expiresAt, identity: {
        subject: credentials.subject, emailVerified: true, customerAccess: true,
      } };
    } catch { throw new AuthenticationUnavailable(); }
  }

  async validate(session: ServerSession): Promise<ServerSession | null> {
    if (!session.providerSessionId) return null;
    return this.vault.use(session.providerSessionId, async current => {
      try {
        if (!current || current.subject !== session.identity.subject ||
          current.configurationBinding !== this.binding || session.expiresAt <= this.clock()) {
          return { next: null, result: null };
        }
        let next = current;
        if (current.expiresAt <= this.clock() + 30_000) {
          const tokens = await oidc.refreshTokenGrant(this.configuration, current.refreshToken);
          next = await this.credentials(tokens, current.subject, current);
        } else {
          const user = await oidc.fetchUserInfo(this.configuration, current.accessToken, current.subject);
          if (user.email_verified !== true) throw new AuthenticationUnavailable();
          await this.accounts.load(current.accessToken, current.subject);
        }
        // Refresh never extends the approved browser session lifetime.
        return { next, result: session };
      } catch { return { next: null, result: null }; }
    });
  }

  async revoke(session: ServerSession): Promise<void> {
    if (!session.providerSessionId) return;
    const failed = await this.vault.use(session.providerSessionId, async current => {
      let failed = false;
      if (current) {
        if (current.configurationBinding !== this.binding) {
          return { next: null, result: true };
        }
        for (const [token, hint] of [[current.refreshToken, "refresh_token"], [current.accessToken, "access_token"]]) {
          try { await oidc.tokenRevocation(this.configuration, token!, { token_type_hint: hint! }); }
          catch { failed = true; }
        }
      }
      return { next: null, result: failed };
    });
    if (failed) throw new AuthenticationUnavailable();
  }
}

/** Clear a partially created provider session if durable browser-session
 * creation fails. Never return tokens or provider diagnostics to the browser.
 */
export async function completeOidcLogin(
  callback: OidcCallbackService, url: URL, binding: string | undefined,
  sessions: SessionService, revoker: SessionRevoker, previousId?: string,
): Promise<{ cookie: string; bindingCookie: string }> {
  const session = await callback.complete(url, binding);
  try {
    const result = await sessions.create(session, previousId);
    return { ...result,
      bindingCookie: `${OIDC_BINDING_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` };
  } catch {
    try { await revoker.revoke(session); } catch { /* Remain denied. */ }
    throw new AuthenticationUnavailable();
  }
}
