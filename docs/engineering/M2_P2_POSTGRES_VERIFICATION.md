# Customer authentication PostgreSQL verification — 2026-10-27

Baseline: `dc6dace`, branch `feat/m2-p2-customer-auth`.

## Isolation and setup

PostgreSQL 18.4 binaries were found at `C:\Program Files\PostgreSQL\18\bin`.
An existing `postgresql-x64-18` Windows service was running and was left untouched.
No shared/production connection URLs, credentials, databases or Phase 1 schemas
were accessed. Existing `.env` secrets were not read or copied.

`tooling/run-customer-auth-postgres.ps1` creates a fresh GUID-named cluster beneath
the current user's temporary directory, using `initdb`, SCRAM authentication and
a randomly generated bootstrap password. It binds only `127.0.0.1` on an available
ephemeral port. It accepts neither an existing data directory nor a database URL.
The bootstrap password file is removed after initialization (and on failure).
Temporary environment settings are restored in `finally`; only this cluster is
stopped with `pg_ctl`. No service is installed, stopped or reconfigured.

Before any DDL the integration suite verifies the server's unique `cluster_name`.
It creates `faji_customer_auth_isolated`, applies the existing `storage-schema.sql`
unchanged, and provisions a separate SCRAM runtime role with schema USAGE and table
SELECT/INSERT/UPDATE/DELETE. Tests verify that runtime DDL is denied. Connections
use explicit loopback host/port/database/user/password, connection and query/lock
timeouts. Independent pools have distinct PostgreSQL backend PIDs. Their default
isolation is deliberately REPEATABLE READ to exercise the adapter's explicit
READ COMMITTED transaction boundary.

Only test dev dependencies were added: `pg` and `@types/pg` 8.23.1, matching versions
already locked for the API. No existing dependency versions or backend files changed.

## Real database results

All **11 scenarios passed**, **0 failed**, **0 skipped**. Node reports 12 TAP tests
because it includes the enclosing parent test. This is actual PostgreSQL evidence,
not the earlier SQL protocol fixture.

1. Schema applied; runtime role can use DML and cannot create tables.
2. Existing SessionService creates, retrieves, replaces, expires and deletes sessions
   persisted in PostgreSQL; a second pool reads the same session. Expiry uses an
   injected application clock rather than a timing-sensitive sleep.
3. Provider tokens are absent from raw stored rows. Retained old keys decrypt
   existing records; rewriting uses the active new key; a new-key-only reader works.
4. Concurrent OIDC transaction consumers return exactly one transaction, and replay
   returns null, using independent connections and real commits.
5. A held refresh callback makes logout wait on an actual PostgreSQL advisory lock,
   observed through `pg_locks`. Logout then sees the rotated credentials and deletes
   them; a later operation cannot resurrect the missing record.
6. A failed credential operation rolls back; a second connection sees the original
   committed credentials. Callback errors are redacted.
7. Logout before refresh leaves no record from which to initiate a later exchange.
8. Real authentication failure from an incorrect generated database password returns
   only `Authentication storage unavailable` from the adapter.
9. Swapped ciphertext and tampered expiry deny access. The protected HTTP helper
   returns an empty generic 503 response and never calls protected application code.
10. One Node application process creates a session and exits. Another process with
    the retained encryption key restores the persisted session through SessionService.
    Keys and connection settings travel via private stdin, never command-line args.
11. PostgreSQL logs contain none of the generated database passwords, encryption keys
    or provider token fixtures. SQL/parameter logging is disabled in the isolated
    cluster. Authentication modules also contain no console/stdout/stderr logging.

The original adapters and schema were reused. Verification exposed one small error
boundary gap: pool.connect() errors were outside the adapter's redaction handler.
That connection boundary now returns the same generic error as transaction failures;
both an isolated unit test and real PostgreSQL authentication failure cover it.
No storage architecture was rebuilt.

The first run failed the restart scenario because the test worker used unsupported
top-level syntax in this package's execution mode. Wrapping its entry point fixed
the helper; the subsequent real restart and final complete suite passed.

## Evidence and reproduction

Committed TAP output: `docs/engineering/evidence/m2-p2-customer-auth-postgres-2026-10-27.txt`.
Final run artifacts (initdb/server logs, TAP and stopped cluster data) were retained at:

`C:\Users\omola\AppData\Local\Temp\faji-auth-pg-776c70aa366a45a08dcaaa7a1cb9e7fd`

The generated bootstrap password file is absent and the isolated server is stopped.
No encryption keys, database URLs or credentials are in this report or TAP artifact.
The existing Windows PostgreSQL service remained running after verification.

From the repository root in PowerShell:

```powershell
corepack.cmd pnpm install --frozen-lockfile
.\tooling\run-customer-auth-postgres.ps1
```

For another PostgreSQL installation, pass `-PostgresBin 'ABSOLUTE_BIN_DIRECTORY'`.
The suite currently checks PostgreSQL 18. Direct invocation of its Node test file
without the runner's isolated settings intentionally skips; that is not evidence
of database verification. The normal web test command excludes the opt-in suite.

Regression checks: **50 web tests passed**, TypeScript checking passed; **80 Flutter
tests passed** and Flutter analysis reported no issues. The Next.js production
build passed. No Flutter source or UI
was changed. The generated Next.js environment declaration is excluded from changes.

## Reusable Components

Reused PostgresAuthRecords, postgresAuthStores, EncryptedAuthRecord, SessionService,
SessionStore, ProviderCredentialStore, OidcTransactionStore and withCustomerSession.
The process helper exercises those same services. No new presentation components,
duplicate authentication state, UI changes or Firebase runtime dependencies.

## Limits and outstanding acceptance

This verifies local PostgreSQL storage, application-process persistence, real locks
and rollback. It does not verify PostgreSQL server crash recovery, failover, network
partitions or ambiguous commit outcomes. It uses loopback SCRAM without TLS, not a
production certificate deployment. Provider refresh/revocation operations in the
locking test are controlled callbacks, not live Keycloak exchanges. The restarted
session demonstrates persisted session metadata; production provider-backed reads
still require fresh provider/account validation through the existing adapter.
Log checks cover these generated fixtures and local server/application paths,
not future deployment telemetry, proxy logs or arbitrary operator configuration.

Production still needs approved TLS database/pool provisioning, least-privilege
runtime grants, server secret management/key retention, backup/cleanup/timeout
policies and route composition. Live authentication remains disabled. No Keycloak
deployment settings were invented. Approved issuer/API origin/scopes, web client and
callback/logout URLs, SMTP, active/pending/suspended test accounts and live backend
acceptance remain outstanding. `/auth/me` currently supports only subject/roles;
extra customer profile fields require a published backend contract.

Android SDK remains absent; no Android build or native device verification was run.

| M2-P2 acceptance task | Status | Remaining blocker |
| --- | --- | --- |
| 1. Flutter OIDC + PKCE | PARTIALLY IMPLEMENTED | Approved configuration and native-device evidence |
| 2. Registration/login/email verification | PARTIALLY IMPLEMENTED | Live Keycloak/SMTP and account approval |
| 3. Secure recovery | PARTIALLY IMPLEMENTED | Live reset and old-password rejection evidence |
| 4. Secure session lifecycle | PARTIALLY IMPLEMENTED | Local PostgreSQL verified; provider/device and deployment acceptance pending |
| 5. Customer profile /auth/me | PARTIALLY IMPLEMENTED | Published identity fields supported; live API and display-profile contract pending |
| 6. Navigation/customer roles | PARTIALLY IMPLEMENTED | Live account/cross-customer authorization acceptance |
| 7. Next.js server sessions | PARTIALLY IMPLEMENTED | Local storage verified; approved deployment configuration and mounted routes pending |
| 8. Automated tests/Android/integration | PARTIALLY IMPLEMENTED | Local DB/regressions pass; Android and live provider integration blocked |
