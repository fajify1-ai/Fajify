# M2-P2 durable web storage — 2026-10-27

Continues `c082430` and `a594a78`. Live authentication remains disabled in
`apps/customer_web/lib/auth/customer.server.ts`. No UI, application routes,
backend policies, branding or production configuration were changed.

## Implementation and files

In `apps/customer_web/lib/auth/`:

- `encrypted-record.server.ts`: versioned AES-256-GCM encryption with random
  96-bit nonces and 128-bit tags. Record kind/identifier and key ID are authenticated
  as associated data. Retained keys permit staged key rotation. Keys must come
  from server secret management; there are no production defaults.
- `postgres-stores.server.ts`: existing session, one-time OIDC transaction and
  provider-credential interfaces implemented over an injected PostgreSQL pool.
  Tokens and PKCE records are encrypted; identifiers hashed; absolute expiry
  checked on reads and authenticated inside the ciphertext. Token rotation cannot
  extend browser-session lifetime. One connection and transaction-scoped advisory
  lock cover each operation, including missing rows and external provider calls.
  Explicit READ COMMITTED isolation ensures reads after waiting for a lock see
  the previous holder's commit. There are no callback/commit retries or local fallback.
- `runtime.server.ts`: composes existing SDK, callback and session services with
  all three stores. Missing configuration/storage stays unavailable without
  discovery/database access. This factory is not mounted by the public application.
- `storage-schema.sql`: unapplied deployment artifact for a dedicated customer-web
  database. It does not modify the shared API schema or run automatically.
- `session.server.ts`: replacement now retires the previous provider credentials
  as well as its browser record. Failed revocation denies replacement; the existing
  callback helper cleans up the newly issued provider credentials on failure.

`apps/customer_web/test/postgres-stores.test.ts` adds eight storage/composition
tests; `test/auth.test.ts` adds old-provider cleanup coverage. `package.json`
includes the new test file. No dependency versions changed.

## Verification and practical limits

- 49 customer-web tests pass (previously 40): encryption, tampering/record swapping,
  key rollover, one-time consumption, expiry, credential rotation/deletion,
  commit failure/no retries, disabled composition and replacement cleanup.
- All 80 Flutter regression tests pass; analysis reports no issues. Native AppAuth
  PKCE, secure storage and reusable account journeys remain unchanged.
- Web TypeScript checking and the production Next.js build pass. Initial sandbox
  test-worker spawning failed with EPERM; approved process access allowed execution.
  An intermediate test callback typing error was corrected before final checks.
- SQL tests use a labeled protocol fixture. They are NOT real PostgreSQL durability,
  rollback or multi-process locking evidence. PostgreSQL CLI and Docker are absent.
  A real pool/driver, isolated database and storage-owner approval remain necessary.
- Provider token exchange and a database commit cannot be atomic together. Ambiguous
  commit failure fails closed without automatic retries. Do not infer exactly-once
  external side effects. Recovery/replay tests against the real provider are required.
- Deployment owners must supply a dedicated TLS-verified pool, least-privilege DML
  role, pool/lock/query timeouts, secret-manager keys/retention, backups and bounded
  expired-record cleanup. The adapter itself creates no connection or migration.
- Flutter doctor cannot locate Android SDK; no Android device/emulator is listed.
  Only Windows/Chrome/Edge targets exist. Android build and native secure-storage/
  callback behavior remain unverified. Visual Studio Windows tooling is also absent.

## Backend and deployment dependencies

The published local controller `apps/api/src/auth/session.controller.ts` returns
only `subject` and `roles` from guarded `GET /api/v1/auth/me`. Both customer clients
already consume these fields and bind them to verified OIDC subject. There is no
supported name/phone/avatar/display-profile DTO to add. No fields/endpoints were
invented and no live backend was accessed.

Pending: approved issuer/API origin/scopes; customer-web confidential client,
callback/logout URLs and server secret management; database/driver and schema
deployment approval; SMTP and registration/recovery/account approval policies;
isolated active/pending/suspended accounts; real provider revocation and
cross-customer API evidence. Deployment settings remain explicitly pending.

## Reusable Components

No new UI or duplicate application auth state. Reused SessionStore,
ProviderCredentialStore, OidcTransactionStore, SessionService, OpenIdClientAdapter,
OidcCallbackService, configuration validation and HTTP/CSRF helpers. Encryption
and record storage are shared by all three stores. Flutter keeps AuthStatusView,
AuthPrimaryButton, AuthFormLayout, AuthErrorMessage, AuthLoadingIndicator, AuthScope
and CustomerAccessGate unchanged. Firebase runtime removal and Fajify design remain.

## Eight acceptance tasks

| Task | Status | Remaining |
| --- | --- | --- |
| 1. Flutter OIDC + PKCE | PARTIALLY IMPLEMENTED | Approved settings and native device handoff |
| 2. Registration, verification, login | PARTIALLY IMPLEMENTED | Live Keycloak/SMTP and active-account approval |
| 3. Secure recovery | PARTIALLY IMPLEMENTED | Live reset and old-password rejection evidence |
| 4. Secure session lifecycle | PARTIALLY IMPLEMENTED | Real database/provider/device verification |
| 5. Profile /auth/me | PARTIALLY IMPLEMENTED | Subject/roles supported; display-profile contract and live API pending |
| 6. Navigation/customer roles | PARTIALLY IMPLEMENTED | Live account and cross-customer API acceptance |
| 7. Next.js server sessions | PARTIALLY IMPLEMENTED | Real pool/database verification, approved config and route mounting |
| 8. Tests/Android/integration evidence | PARTIALLY IMPLEMENTED | Android SDK/device and live integration blocked |

Next: isolated PostgreSQL/driver verification of concurrent refresh/logout, replay
across processes, restart persistence, key rollover and ambiguous commit failures.
Mount reviewed HTTP routes only with approved callback paths and deployment
composition. Never enable production using fixture configuration.

Reference: [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html)
and [Node authenticated encryption](https://nodejs.org/api/crypto.html).
