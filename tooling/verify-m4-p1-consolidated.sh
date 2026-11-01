#!/usr/bin/env bash
# M4 increment acceptance. This is not acceptance of all four M4 phases.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == 'feat/m4-p1-customer-platform' ]] || { echo 'Wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit source before acceptance' >&2; exit 2; }
: "${FAJI_DATABASE_URL:?Disposable migrator URL required}"
: "${FAJI_RUNTIME_DATABASE_URL:?Distinct disposable runtime URL required}"
[[ "${FAJI_DISPOSABLE_DATABASE:-}" =~ ^fajify_m4_test_[a-z0-9_]+$ ]] || { echo 'M4 disposable name required' >&2; exit 2; }
echo "M4-P1 source: $(git rev-parse HEAD)"
pnpm --filter @faji/database exec node --import tsx scripts/disposable-target.ts
pnpm --filter @faji/database typecheck
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api exec tsc -p tsconfig.m4-tests.json
pnpm --filter @faji/api lint
pnpm --filter @faji/api build
pnpm --filter @faji/database exec node --import tsx scripts/migrate.ts
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT,INSERT,UPDATE,DELETE ON user_profiles,account_access,resource_memberships,identity_security_events,revoked_identity_sessions,business_onboarding,outbox_events,business_branches,business_catalogue,business_availability,business_reservations,business_orders,business_order_items,business_branch_hours,business_event_config,business_package_components,customer_request_keys TO m4_runtime;
SQL
pnpm --filter @faji/api test
pnpm --filter @faji/api exec node --import tsx --test test/m4-customer-acceptance.ts
pnpm --filter @faji/api contracts
git diff --exit-code -- packages/api_contracts/openapi.json
echo 'PASS: M4-P1 first increment, including PostgreSQL contention and inherited M2 API database tests'
