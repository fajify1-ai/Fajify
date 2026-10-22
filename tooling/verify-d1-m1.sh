#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
test "$(git branch --show-current)" = "feat/m1-d1-backend-foundation" || { echo "Wrong branch"; exit 1; }
command -v node >/dev/null
command -v corepack >/dev/null
node --version
if [[ ! -f pnpm-lock.yaml ]]; then
 echo "BLOCKED: pnpm-lock.yaml is missing; generate/review/commit it before acceptance." >&2
 exit 2
fi
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @faji/api typecheck
corepack pnpm --filter @faji/api lint
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/api test
corepack pnpm --filter @faji/worker typecheck
corepack pnpm --filter @faji/worker build
corepack pnpm --filter @faji/worker test
corepack pnpm --filter @faji/database typecheck
if [[ -n "${FAJI_DATABASE_URL:-}" ]]; then
 corepack pnpm --filter @faji/database migrate
 corepack pnpm --filter @faji/database test:integration
else
 echo "SKIP: PostgreSQL/PostGIS migration and database integration; FAJI_DATABASE_URL unset"
fi
if [[ -n "${REDIS_URL:-}" ]]; then
 corepack pnpm --filter @faji/worker test:integration
else
 echo "SKIP: Redis integration; REDIS_URL unset"
fi
corepack pnpm audit --audit-level high
echo "Static/unit gates complete. API smoke is tested in-process; Keycloak live integration belongs to M2."
