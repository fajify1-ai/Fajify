# Developer 1 — Milestone 1 backend setup and acceptance
This changes only backend, worker, database, infrastructure and related documentation. No Flutter or other developer application code is modified.

## Local setup
Use Node >= 22 and pnpm 9.15.9 (Corepack). Copy `infrastructure/env/development.env.example` to an untracked local environment file and replace all placeholder values. Source into shell only in a trusted development environment. `FAJI_DATABASE_URL` points to the Faji PostGIS database, **never** the Keycloak database.
Install: `corepack pnpm install --frozen-lockfile` after generating and committing a lockfile. If a lockfile is not present, use `corepack pnpm install --no-frozen-lockfile` and review the generated lockfile before acceptance.
Use the existing disposable Compose file only on a sufficiently resourced development host; database and Redis may instead be provided by temporary isolated services. Production infrastructure is never part of this procedure.
`pnpm --filter @faji/database migrate` applies checksummed serial SQL migrations. Never edit an applied migration; append a new numbered file and test against disposable data.
`pnpm --filter @faji/api dev` starts the API; `pnpm --filter @faji/worker build` compiles the worker. Worker delivery adapter is intentionally disabled.

## Acceptance
Run `bash tooling/verify-d1-m1.sh` once from a clean branch checkout. Use `FAJI_DATABASE_URL` to enable migration/database tests; `REDIS_URL` for Redis availability testing; `KEYCLOAK_ISSUER` for future OIDC tests. The script runs no Docker and never starts/changes services itself.
Frontend integration can begin with health/error contracts and API namespace, not live identity or booking APIs. Before M2, enable real issuer/audience/JWKS verification and server-side authorization tests.
