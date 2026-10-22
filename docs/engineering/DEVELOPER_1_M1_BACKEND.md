# Developer 1 — Milestone 1 backend setup and acceptance
Only Developer 1 backend, worker, database and related documentation are changed. Flutter and other developer workspaces are preserved.

## Local setup
Node >=22, pnpm 9.15.9 through Corepack. Load development-only env from `infrastructure/env/development.env.example` after substituting private values outside Git. `FAJI_DATABASE_URL` must point to the Faji PostGIS database, **never** the separate Keycloak database.
A deterministic lockfile is required for acceptance. Initially run `corepack pnpm install --no-frozen-lockfile` in an isolated checkout, review and commit `pnpm-lock.yaml` to this branch through Wilberry, then all acceptance runs use `--frozen-lockfile`.
Use temporary PostgreSQL/PostGIS and Redis servers for integration; Docker Compose is optional and should not be started on the constrained laptop.
Migrate: `pnpm --filter @faji/database migrate`; API: `pnpm --filter @faji/api dev`. The worker delivery adapter intentionally fails closed; do not run it for external notifications.
Generate OpenAPI: `pnpm --filter @faji/api contracts` with valid M1 test environment.

## One-shot verification
`bash tooling/verify-d1-m1.sh` runs install integrity, API/worker/database typechecks, lint, Nest build, API HTTP smoke and unit tests, worker unit tests, migrations, database integration, optional Redis integration and dependency audit. It has no Docker side effects.
Acceptance still requires a reviewed pinned lockfile, full successful gate output and live disposable service tests. Keycloak token verification and role/tenant enforcement are expressly M2, not implemented or silently bypassed in M1.
