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
corepack pnpm --filter @faji/worker lint
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
# Contract generation needs validated configuration, but does not contact these services.
FAJI_DATABASE_URL="${FAJI_DATABASE_URL:-postgresql://localhost:1/faji_contracts}" \
REDIS_URL="${REDIS_URL:-redis://localhost:1}" \
KEYCLOAK_ISSUER="${KEYCLOAK_ISSUER:-http://localhost:8080/realms/faji}" \
KEYCLOAK_AUDIENCE="${KEYCLOAK_AUDIENCE:-faji-api}" \
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}" \
S3_BUCKET="${S3_BUCKET:-faji-contracts}" \
corepack pnpm --filter @faji/api contracts
node -e "const a=require('./packages/api_contracts/openapi.json');if(!a.paths['/api/v1/health']||!a.paths['/api/v1/health/ready'])process.exit(1)"
node tooling/smoke-d1-m1.mjs
corepack pnpm audit --audit-level high
if [[ -z "${FAJI_DATABASE_URL:-}" || -z "${REDIS_URL:-}" ]]; then
 echo "PASS: local verification. PENDING: Milestone 1 acceptance requires PostgreSQL/PostGIS and Redis integration."
 if [[ "${1:-}" == "--acceptance" ]]; then exit 2; fi
else
 echo "PASS: all Milestone 1 verification gates. Review acceptance report before merging."
fi
