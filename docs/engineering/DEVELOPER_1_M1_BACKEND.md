# Developer 1 — Milestone 1 backend setup and acceptance

## Implementation status
Foundation and dependency lockfile committed. See [verification and acceptance report](DEVELOPER_1_M1_ACCEPTANCE.md). Developer 1 Milestone 1 is accepted against clean integration commit `c267372`, including isolated PostgreSQL/PostGIS integration and full regressions; the linked report records evidence and scope. Delivery continues through PR #4; no merge or Milestone 2 work has been performed.

## Setup
Use Node.js 22 and pnpm 9.15.9 through Corepack. Install with `corepack pnpm install --frozen-lockfile`. Dependency updates must update and commit `pnpm-lock.yaml`.

Copy values from `infrastructure/env/development.env.example` into local **untracked** secrets; do not commit passwords. The application PostGIS database and Keycloak database must be isolated. Never aim application SQL migrations at Keycloak.

Development: `corepack pnpm --filter @faji/api dev`. Migration: `corepack pnpm --filter @faji/database migrate`. Documentation: `corepack pnpm --filter @faji/api contracts`.

## Consolidated verification
`bash tooling/verify-d1-m1.sh` does not start Docker or modify production. Without external services it can run dependency integrity, build, typecheck, lint, API unit/HTTP tests, worker tests, database typecheck, and dependency audit. PostgreSQL/PostGIS migration and database tests require disposable DB, Redis integration requires disposable Redis. API contract generation uses local placeholder configuration when service values are absent and must produce both versioned health paths. The script also launches the compiled API and checks liveness, readiness, errors and graceful shutdown. Placeholder values do not verify external integrations. Use `bash tooling/run-d1-m1-disposable.sh` with an available PostgreSQL 16/PostGIS installation and Redis to provision fresh private services, run acceptance and clean up. `FAJI_PG_BIN` optionally selects the PostgreSQL binary directory. For manually provisioned disposable services, set `FAJI_DATABASE_URL`, `FAJI_RUNTIME_DATABASE_URL`, `FAJI_KEYCLOAK_TEST_URL`, `FAJI_DISPOSABLE_DATABASE` and `REDIS_URL`; the application database must have the matching unique `fajify_m1_test_` name and `fajify:m1:disposable` database comment. Runtime and migration roles must differ, and the identity sentinel must be isolated. `bash tooling/verify-d1-m1.sh --acceptance` refuses missing database/Redis URLs before installation (exit 2) and fails any missing required database-test configuration. The default local run reports acceptance pending when service gates are omitted. Keycloak live validation is M2; the M1 identity verifier refuses all bearer tokens.

## Security boundaries
M1 protected modules remain unavailable until M2 verifies JWT signatures, JWKS rotation, issuer, audience, expiry and tenant/resource membership. BullMQ notification worker intentionally fails jobs instead of pretending to deliver notifications. Real writes must use transactional outbox and idempotency.
