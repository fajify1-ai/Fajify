#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
test "$(git branch --show-current)" = "feat/m1-d1-backend-foundation" || { echo "Wrong branch"; exit 1; }
command -v node >/dev/null
command -v corepack >/dev/null
node --version
corepack pnpm install --no-frozen-lockfile
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
echo "Security: manually review pnpm audit results (lockfile required)"
corepack pnpm audit --audit-level high
echo "PASS: local static/unit gates finished. API smoke and Redis/Keycloak integration require disposable services."
