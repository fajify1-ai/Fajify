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
pnpm --filter @faji/database typecheck
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api lint
pnpm --filter @faji/api build
pnpm --filter @faji/database migrate
# M2's database integration tests require distinct, unprivileged runtime credentials.
: "${FAJI_RUNTIME_DATABASE_URL:?Runtime database URL required for M2 security acceptance}"
: "${PGUSER:?Isolated PostgreSQL administrator required for runtime grants}"
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" psql -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT,INSERT,UPDATE,DELETE ON user_profiles,account_access,resource_memberships,identity_security_events,revoked_identity_sessions,business_onboarding,outbox_events,business_branches,business_catalogue,business_availability,business_reservations,business_orders,business_order_items,business_branch_hours,business_event_config,business_package_components TO m3_runtime;
SQL
pnpm --filter @faji/api test
pnpm --filter @faji/api exec tsx test/m3-capacity-acceptance.ts
pnpm --filter @faji/api exec tsx test/m3-isolation-acceptance.ts
pnpm --filter @faji/api contracts
test -z "$(git status --porcelain)" || { echo "Generated OpenAPI differs; inspect and commit reviewed generated contract, then rerun at exact SHA" >&2; exit 1; }
echo "M3-P1 code and migration verification gates completed; manual contention/security acceptance still required"
