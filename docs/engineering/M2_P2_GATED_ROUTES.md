# Gated customer authentication routes — 2026-10-27

Baseline: `dd306b9`, branch `feat/m2-p2-customer-auth`.

## Delivered

Seven dynamic Node.js Next.js routes now reuse the existing journey, callback,
session, logout, SDK and encrypted PostgreSQL services:

| Route | Method | Behavior when configured |
| --- | --- | --- |
| `/api/auth/login` | POST | Existing sign-in browser journey |
| `/api/auth/register` | POST | Existing provider registration journey |
| `/api/auth/recover` | POST | Existing guided provider recovery journey |
| `/api/auth/verify-email` | POST | Existing provider verification journey |
| `/api/auth/callback` | GET | Existing state/binding/PKCE/nonce/token verification; rotate session and return to public root |
| `/api/auth/logout` | POST | Exact-Origin check, existing local invalidation/provider token revocation, clear session/binding cookies |
| `/api/auth/session` | GET | Existing server validation; returns only `{authenticated:true}`, never identity/provider credentials |

These are customer-web routes, not new NestJS endpoints. Unsupported methods
receive Next.js 405 responses. Initiation and logout require exact approved Origin
when a runtime is available. Callback target is the configured customer origin's
existing `/` page; browser `next`/`returnTo` inputs cannot change it.

All seven return generic 503/no-store responses while deployment is unconfigured.
Disabled callback expires the binding cookie. Disabled logout expires local cookies
but does NOT claim successful provider revocation. Invalid active sessions return
401 and expire the session cookie; storage failures return generic 503. Duplicate
security cookie names are rejected as ambiguous. Private responses use no-store;
journey/callback responses also suppress referrers. Secure/HttpOnly/host-only cookies
and the existing SameSite policy are retained.

## Runtime and configuration gate

`apps/customer_web/lib/auth/deployment.server.ts` supplies one server runtime/pool
per process, shared by routes and Server Components. No runtime is created unless:

- Existing `FAJI_CUSTOMER_WEB_AUTH_ENABLED` is explicitly true and every OIDC/API/
  scope/session/transaction setting validates. It remains false in the template.
- The configured callback's exact path is `/api/auth/callback`. Phase 1 must approve
  the actual HTTPS origin plus that path; a different callback fails closed.
- A dedicated database URL, active encryption key/key ring and bounded operational
  pool/timeouts validate. All names are listed as blank server-only fields in
  `apps/customer_web/.env.example`; no production values were added.

The existing pg version 8.23.1 moved from dev to runtime dependencies, with no
version changes. Production database TLS always verifies certificates; URL query
options cannot disable/override it. Optional CA PEM is server-only. Encryption keys
must be canonical base64, exactly 32 bytes, and include the active key ID.
No migration/schema/role is created at application startup; use the existing
storage deployment artifact under owner-approved provisioning. Failed SDK startup
closes its pool; startup remains unavailable until process restart after repair.
Idle pool errors are contained without logging connection values. Store errors
retain the existing generic redaction.

The route factory takes a trusted injected runtime for testing, never request data.
Production has no test-store fallback. Supplying deployment settings is a deliberate
operator action after approval; this milestone did not enable either platform.

## Verification

- **58 web tests passed**: 50 existing tests plus eight route/deployment tests.
  Existing journey tests and route tests now share one fixture helper; no copied
  authentication implementation or repeated fixture block.
- **Production build passed**, listing all seven routes as dynamic handlers.
- **Real HTTP smoke test passed** against a temporary loopback `next start` server
  with authentication explicitly disabled. All seven routes returned generic 503;
  callback/logout cookies expired securely; unsupported methods returned 405; the
  existing public root returned 200. The test server was stopped afterward.
- **TypeScript passed** including the route and real-HTTP test files.
- **80 Flutter tests passed**; Flutter static analysis reported no issues.
- **56 backend non-database tests passed**, plus backend typecheck, lint and build.
  Existing coverage includes revoked/suspended users, resource membership isolation,
  verified subject binding, admin denial and signed-token verification.
- The four backend database tests were not executed: no disposable PostGIS target
  was supplied; local PostgreSQL 18 lacks the checked PostGIS extension and the
  existing Phase 1 Linux/PG16 runner is branch-restricted. Its guard was not bypassed.
- Existing isolated customer-web PostgreSQL suite rerun: **11 scenarios passed**,
  no failures/skips (12 TAP tests including the parent). Cluster stopped afterward;
  run artifacts are at `C:\Users\omola\AppData\Local\Temp\faji-auth-pg-781ee360f4ec4c6883481d01ba64cbf3`.
  Original evidence is in `M2_P2_POSTGRES_VERIFICATION.md`.

Route tests exercise shared runtime dispatch, CSRF, actual exported routes while
disabled, callback-cookie binding/state tampering, secure cookie rotation, duplicate/
forged/revoked session denial, fixed navigation, redaction and deployment parsing.
Existing SDK/session tests cover expiry, token revocation and subject continuity;
existing real-database tests cover refresh/logout races and persistence. Those
implementations and tests were reused rather than rebuilt.

No live Keycloak, SMTP or deployed API was contacted. No live cross-customer resource
access claim is inferred from unit tests or the metadata-only session route.
Production operators must redact callback query strings and credentials from proxy,
database and telemetry logs; application handlers do not echo provider diagnostics.

## Android and Phase 1 handoff

Exact inspected toolchain requirements and Windows installation/debug commands:
[M2_P2_ANDROID_VERIFICATION.md](M2_P2_ANDROID_VERIFICATION.md).

Concise non-secret deployment handoff checklist:
[M2_P2_LIVE_CONFIGURATION_CHECKLIST.md](M2_P2_LIVE_CONFIGURATION_CHECKLIST.md).

Android SDK/platform-tools/build-tools/NDK are unavailable here, and doctor lists no
Android device/emulator. Debug APK and native OIDC/secure-store verification remain
blocked. No Android source, signing, release or machine-specific configuration was
changed. Installation instructions were provided; no SDK installation was performed.

## Reusable Components

Reused OpenIdClientAdapter, OidcCallbackService, SessionService, PostgresAuthRecords,
postgresAuthStores, EncryptedAuthRecord, existing HTTP/CSRF handlers and configuration
validation. Added only thin route modules, one deployment boundary and one route
factory. Shared test fixture extracted from existing journey tests. No new UI;
AuthStatusView, AuthPrimaryButton, AuthFormLayout, AuthErrorMessage, loading/state/
navigation components and existing Fajify branding remain unchanged. Firebase runtime
removal is preserved.

## Eight acceptance tasks

| Task | Status | Remaining acceptance |
| --- | --- | --- |
| 1. Flutter OIDC + PKCE | PARTIALLY IMPLEMENTED | Approved settings and native device/browser handoff |
| 2. Registration/login/email verification | PARTIALLY IMPLEMENTED | Live Keycloak/SMTP/account approval |
| 3. Secure recovery | PARTIALLY IMPLEMENTED | Live reset/expired links/old-password rejection |
| 4. Secure session lifecycle | PARTIALLY IMPLEMENTED | Local store/lifecycle tested; production TLS, live provider revocation and native-device evidence pending |
| 5. Profile /auth/me | PARTIALLY IMPLEMENTED | Subject/roles supported; live API and additional display-profile contract pending |
| 6. Navigation/customer roles | PARTIALLY IMPLEMENTED | Guards tested; live cross-customer account/resource acceptance pending |
| 7. Next.js server sessions | PARTIALLY IMPLEMENTED | Routes mounted and gated; approved settings/provisioning and live browser acceptance pending |
| 8. Tests/Android/integration evidence | PARTIALLY IMPLEMENTED | Local checks pass; Android SDK/device and live integration blocked |
