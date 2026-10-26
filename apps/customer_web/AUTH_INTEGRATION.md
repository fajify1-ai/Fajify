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

Existing pages, branding and layout are unchanged. No auth routes have been
mounted because the web client and exact callback remain unapproved.

## BLOCKED BY PHASE 1

1. Approve and provision the customer web confidential OIDC client, issuer,
   HTTPS callback/logout URIs, scopes and active-account/customer role policy.
2. Select and wire a maintained OIDC SDK. It must generate cryptographic state,
   nonce, S256 PKCE and HttpOnly browser binding; validate JWT signature, issuer,
   audience, expiry and nonce; then apply the approved account contract.
3. Supply a shared persistent TTL session/transaction store with atomic
   transaction consumption. No production process-local fallback is provided.
4. Agree token custody, refresh rotation, session lifetime, revocation and
   provider logout. Do not extend sessions merely by changing cookie expiry.
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

- `pnpm --filter @faji/customer-web test`: **20 passed**.
- `pnpm --filter @faji/customer-web typecheck`: **passed**.
- `pnpm --filter @faji/customer-web build`: **passed**.
- No live identity provider, persistent session adapter, browser login or
  provider revocation was exercised.

The test script uses `--conditions=react-server` so Node can test server-only
modules. That flag is for the test process; do not apply it to browser builds.
Use Corepack shims on PATH when invoking Turborepo, since this workstation also
has a different default pnpm version.

Follow-up: integrate the approved provider/store adapters, mount reviewed
handlers, then verify login, callback replay/CSRF, server authorization,
expiry/refresh, logout and revocation end-to-end.
