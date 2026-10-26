# M2-P2 customer website authentication foundations

Status: **IMPLEMENTED AND VERIFIED** for isolated primitives; **IMPLEMENTED,
INTEGRATION PENDING** for live server authentication. No working Keycloak sign-in
is claimed.

## Delivered boundaries

- `lib/auth/config.server.ts`: server-only configuration with no default issuer,
  client or redirect values. Blank/invalid configuration stays blocked.
- `session.server.ts`: opaque random session IDs in HttpOnly, Secure,
  SameSite=Lax, host-only cookies. The server store receives a SHA-256 digest of
  the ID and internal identity metadata. Invalid/expired/unauthorized records
  never grant access. Sign-in rotates the ID; logout invalidates locally before
  attempting provider revocation.
- `oidc.server.ts`: single-use, browser-bound callback transaction validation,
  exact target/issuer checks, duplicate-parameter rejection and PKCE/nonce
  handoff to a future maintained OIDC SDK. These prechecks do not verify tokens.
- `http.server.ts`: per-handler authorization and POST/exact-Origin logout.
  Storage failures deny access; provider logout failures clear the cookie and
  return an unavailable result, not a successful revocation claim.
- `customer.server.ts`: disabled production composition. Forged cookies cannot
  enable it. Future protected components/actions must call the server guard
  beside data access; a layout or cookie-presence check is insufficient.
- `identity-api.server.ts`: server-only client for the merged Phase 1
  `GET /api/v1/auth/me` contract. Requires an explicitly approved HTTPS API
  origin, the SDK-verified subject and its access token. Disables caching and
  redirects, bounds response size/time, binds subject and requires `customer`.
  It is not mounted or connected to an enabled provider/session store yet.
- `test/auth.test.ts`: explicit in-memory test doubles only, never used at
  runtime. All authentication modules use the `server-only` boundary marker.
- `openid-client.server.ts`: maintained openid-client 6.8.8 SDK adapter with
  discovery, PKCE/state/nonce, signed ID-token checks, UserInfo and active-account
  validation, refresh and provider token revocation. Provider credentials belong
  in a separately supplied encrypted durable vault; cookies remain opaque IDs.
  No production memory store is provided. Vault updates must serialize refresh
  and logout across every server instance.

Existing pages, branding and layout are unchanged. No auth routes have been
mounted because the web client and exact callback remain unapproved.

## BLOCKED BY PHASE 1

1. Approve and provision the customer web confidential OIDC client, issuer,
   HTTPS callback/logout URIs, scopes and active-account/customer role policy.
2. Wire the implemented OpenIdClientAdapter only after deployment approval.
   It generates state, nonce, S256 PKCE and HttpOnly browser binding, verifies
   signed ID tokens through the maintained SDK and checks UserInfo plus /auth/me.
3. Supply a shared persistent TTL session/transaction store with atomic
   transaction consumption. No production process-local fallback is provided.
4. Supply approved session/transaction lifetimes in server environment settings.
   Configure provider-token vault retention/encryption and reviewed browser SSO
   logout. Token revocation is implemented; browser SSO end-session routing is
   not mounted. Refresh does not extend the approved browser-session lifetime.
5. Supply a running test environment, securely provisioned synthetic accounts
   and accepted contracts for profile/enrollment/verification/recovery.

Phase 1 source `36f7ad798aabfb170873fd2d67985d99a6b55e70` was merged to
official main as `ab80a3e00fac4bd80f8735b4ba0846140455f56a` (PR #8), then
merged locally into this branch. The published `/auth/me` response is
`{subject, roles}`, not a full customer display profile. The realm template
contains a mobile customer client but no customer web client; its issuer and
redirect deployment settings still need approval. The latest PR acceptance
and older in-file historical status differ; no live acceptance is inferred
from the local merge. See the current M2_P2_SYNC_AND_IDENTITY.md report.

## Verification (2026-10-26)

Using Corepack pnpm 9.15.9 and Node 20.20.0:

- `pnpm --filter @faji/customer-web test`: **40 passed**.
- `pnpm --filter @faji/customer-web typecheck`: **passed**.
- `pnpm --filter @faji/customer-web build`: **passed**.
- No live identity provider, persistent session adapter, browser login or
  provider revocation was exercised.

The test script uses `--conditions=react-server` so Node can test server-only
modules. That flag is for the test process; do not apply it to browser builds.
Use Corepack shims on PATH when invoking Turborepo, since this workstation also
has a different default pnpm version.

Follow-up: integrate approved durable store adapters, mount reviewed
handlers, then verify login, callback replay/CSRF, server authorization,
expiry/refresh, logout and revocation end-to-end.

See [current adapter report](../../docs/engineering/M2_P2_OIDC_ADAPTERS.md).
See [customer journey report](../../docs/engineering/M2_P2_ACCOUNT_JOURNEYS.md)
for the newer registration, verification and provider-guided recovery milestone.
FAJI_CUSTOMER_WEB_AUTH_ENABLED defaults to false; issuer, client/secret,
callback/logout, API origin, scopes and session/transaction lifetime settings
have no live defaults. The public application composition remains disabled
until approved durable stores and deployment settings are wired.

When composing approved stores: discover OpenIdClientAdapter; create
SessionService with that adapter as BOTH revoker and validator; use adapter.begin
with durable transaction creation; use OidcCallbackService with atomic transaction
consumption and completeOidcLogin for callback/session creation. Route handlers
must append both returned Set-Cookie headers, never return session/provider token
records, and keep the existing per-handler guard and POST/exact-Origin logout.

`adapter.begin` accepts a closed journey type: signIn, registration, recovery or
verifyEmail. Registration uses prompt=create; verification uses the provider's
VERIFY_EMAIL action; recovery opens a fresh sign-in page where the user chooses
Forgot password. Neither requesting a journey nor returning from it proves that
an email was sent or a password changed. UserInfo and /auth/me still decide access.

`journey-http.server.ts` provides unmounted initiation/callback helpers. Pass null
runtime until approved settings and durable stores exist to return an explicit
503 unavailable response. Initiation requires POST and exact Origin. Callback
completion appends both cookies, rotates the previous session, clears browser
binding, uses an explicitly supplied same-origin return target and redacts errors.
Callback return query parameters never select the return URL. Cancelled provider
actions cannot issue a browser session. No app/api route or page is enabled here.
