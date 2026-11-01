#!/usr/bin/env bash
# Run on the local machine after implementation and contract snapshot are committed.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == 'feat/m4-p1-customer-platform' ]] || { echo 'Wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit source and generated contract before acceptance' >&2; exit 2; }
: "${FAJI_DATABASE_URL:?Disposable migrator URL required}"
: "${FAJI_RUNTIME_DATABASE_URL:?Distinct disposable runtime URL required}"
: "${FAJI_KEYCLOAK_TEST_URL:?Isolated identity sentinel URL required}"
[[ "${FAJI_DISPOSABLE_DATABASE:-}" =~ ^fajify_m4_test_[a-z0-9_]+$ ]] || { echo 'M4 disposable name required' >&2; exit 2; }
source_commit="$(git rev-parse HEAD)"
report_dir="$(mktemp -d /tmp/fajify-m4-report.XXXXXXXX)"
finish(){
 status=$?
 trap - EXIT
 if node tooling/m4-verification-report.mjs "$report_dir" "$source_commit" "$status"; then report_status=0; else report_status=$?; fi
 echo "Verification logs: $report_dir"
 if [[ "$status" -ne 0 ]]; then exit "$status"; fi
 exit "$report_status"
}
trap finish EXIT
run_check(){
 local name="$1" is_test="$2" check_status
 shift 2
 echo "CHECK: $name"
 if "$@" 2>&1 | tee "$report_dir/$name.log"; then check_status=0; else check_status=$?; fi
 node -e 'const fs=require("node:fs");fs.appendFileSync(process.argv[1],JSON.stringify({name:process.argv[2],test:process.argv[3]==="yes",exitCode:Number(process.argv[4])})+"\n")' "$report_dir/checks.jsonl" "$name" "$is_test" "$check_status"
 return "$check_status"
}
echo "M4-P1 exact source: $source_commit"
run_check disposable-preflight no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/disposable-target.ts
run_check database-types no corepack pnpm@9.15.9 --filter @faji/database typecheck
run_check api-types no corepack pnpm@9.15.9 --filter @faji/api typecheck
run_check m4-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.m4-tests.json
run_check lint no corepack pnpm@9.15.9 --filter @faji/api lint
run_check build no corepack pnpm@9.15.9 --filter @faji/api build
run_check migrations no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/migrate.ts
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT,INSERT,UPDATE,DELETE ON user_profiles,audit_events,account_access,resource_memberships,identity_security_events,revoked_identity_sessions,business_onboarding,outbox_events,business_branches,business_catalogue,business_availability,business_reservations,business_orders,business_order_items,business_branch_hours,business_event_config,business_package_components,customer_request_keys,business_public_profiles,business_public_media,business_public_packages,business_package_addons,customer_wishlist,customer_reviews,customer_notifications,customer_support_cases,customer_support_messages,customer_request_buckets TO m4_runtime;
GRANT EXECUTE ON FUNCTION faji_customer_notification() TO m4_runtime;
SQL
run_check database-tests yes bash -c 'cd packages/database; node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check api-tests yes bash -c 'cd apps/api; node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check m4-postgres-tests yes bash -c 'cd apps/api; node --import tsx --test --test-reporter=tap test/m4-customer-acceptance.ts test/m4-marketplace-acceptance.ts'
run_check query-plans no corepack pnpm@9.15.9 --filter @faji/api exec node --import tsx test/m4-query-plans.ts
run_check contracts no corepack pnpm@9.15.9 --filter @faji/api contracts
run_check contract-snapshot no git diff --exit-code -- packages/api_contracts/openapi.json
run_check source-whitespace no git diff --check 728fd1ca457f838e4e8a365e963420bce7b49bac HEAD
run_check dependency-audit no corepack pnpm@9.15.9 audit --audit-level high
[[ "$(git rev-parse HEAD)" == "$source_commit" && -z "$(git status --porcelain)" ]] || { echo 'Source changed during verification' >&2; exit 2; }
