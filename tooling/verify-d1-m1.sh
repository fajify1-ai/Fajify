#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
test "$(git branch --show-current)" = "feat/m1-d1-backend-foundation" || { echo "Wrong branch"; exit 1; }
command -v node >/dev/null
command -v corepack >/dev/null
node --version
if [[ ! -f pnpm-lock.yaml ]]; then
 echo "BLOCKED: pnpm-lock.yaml missing. Generate/review/commit before acceptance." >&2
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
else echo "SKIP: PostgreSQL/PostGIS migration and database integration (no FAJI_DATABASE_URL)"; fi
if [[ -n "${REDIS_URL:-}" ]]; then
 corepack pnpm --filter @faji/worker test:integration
else echo "SKIP: Redis integration (no REDIS_URL)"; fi
if [[ -n "${FAJI_DATABASE_URL:-}" && -n "${REDIS_URL:-}" && -n "${KEYCLOAK_ISSUER:-}" && -n "${KEYCLOAK_AUDIENCE:-}" && -n "${S3_ENDPOINT:-}" && -n "${S3_BUCKET:-}" ]]; then
 corepack pnpm --filter @faji/api contracts
 node -e "const a=require('./packages/api_contracts/openapi.json');if(!a.paths['/api/v1/health'])process.exit(1)"
else echo "SKIP: OpenAPI generation (configuration incomplete)"; fi
corepack pnpm audit --audit-level high
echo "PASS: executed static/unit gates. Optional services clearly reported above."
