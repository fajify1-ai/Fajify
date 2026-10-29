#!/usr/bin/env bash
set -Eeuo pipefail
# Run ONLY after engineering is frozen and on an explicitly marked disposable PostgreSQL 16 DB.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
test "$(git branch --show-current)" = 'feat/m3-p1-business-backend' || { echo "Wrong branch" >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo "Dirty tree; evidence must reference an exact commit" >&2; exit 1; }
echo "M3-P1 source: $(git rev-parse HEAD)"
: "${FAJI_DATABASE_URL:?FAJI_DATABASE_URL must point at marked disposable database}"
: "${FAJI_DISPOSABLE_DATABASE:?M3 disposable database name required}"
pnpm --filter @faji/database exec tsx scripts/verify-m3-p1-target.ts
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api lint
pnpm --filter @faji/api test
pnpm --filter @faji/api build
pnpm --filter @faji/database migrate
pnpm --filter @faji/api exec tsx test/m3-capacity-acceptance.ts
pnpm --filter @faji/api exec tsx test/m3-isolation-acceptance.ts
pnpm --filter @faji/api contracts
test -z "$(git status --porcelain)" || { echo "Generated files differ; commit/review before acceptance" >&2; exit 1; }
echo "M3-P1 code and migration verification gates completed; manual contention/security acceptance still required"
