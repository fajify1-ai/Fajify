#!/usr/bin/env bash
# Run on the local machine after implementation and contract snapshot are committed.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == 'test/m3-p1-final-closure' || "$(git branch --show-current)" == 'fix/m2-business-memberships-contract' ]] || { echo 'Wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit source and generated contract before acceptance' >&2; exit 2; }
: "${FAJI_DATABASE_URL:?Disposable migrator URL required}"
: "${FAJI_RUNTIME_DATABASE_URL:?Distinct disposable runtime URL required}"
: "${FAJI_KEYCLOAK_TEST_URL:?Isolated identity sentinel URL required}"
[[ "${FAJI_DISPOSABLE_DATABASE:-}" =~ ^fajify_m3_test_[a-z0-9_]+$ ]] || { echo 'M3 disposable name required' >&2; exit 2; }
source_commit="$(git rev-parse HEAD)"
report_dir="${FAJI_M3_REPORT_DIR:-}"
if [[ -z "$report_dir" ]]; then report_dir="$(mktemp -d /tmp/fajify-m3-report.XXXXXXXX)"; fi
[[ -d "$report_dir" ]] || { echo 'Report directory does not exist' >&2; exit 2; }
finish(){
 status=$?
 trap - EXIT
 if node tooling/m3-verification-report.mjs "$report_dir" "$source_commit" "$status"; then report_status=0; else report_status=$?; fi
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
echo "M3-P1 exact source: $source_commit"
run_check disposable-preflight no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/disposable-target.ts
run_check database-types no corepack pnpm@9.15.9 --filter @faji/database typecheck
run_check api-types no corepack pnpm@9.15.9 --filter @faji/api typecheck
run_check m4-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.m4-tests.json
run_check m5-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.m5-tests.json
run_check m3-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.m3-tests.json
run_check membership-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.membership-tests.json
run_check lint no corepack pnpm@9.15.9 --filter @faji/api lint
run_check build no corepack pnpm@9.15.9 --filter @faji/api build
run_check migrations no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/migrate.ts
verify_replay(){
 local before after
 before="$(PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}/psql" -X -At -v ON_ERROR_STOP=1 -c 'SELECT name,checksum,applied_at FROM _faji_migrations ORDER BY name')"
 corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/migrate.ts
 after="$(PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}/psql" -X -At -v ON_ERROR_STOP=1 -c 'SELECT name,checksum,applied_at FROM _faji_migrations ORDER BY name')"
 [[ -n "$before" && "$before" == "$after" ]] || { echo 'Migration replay changed history/checksums/timestamps' >&2; return 1; }
}
run_check migrations-replay no verify_replay
run_check runtime-grants no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/grant-m5-runtime.ts
run_check report-tests yes node --test --test-reporter=tap tooling/m3-verification-report.test.mjs
run_check database-tests yes bash -c 'cd packages/database; node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check api-tests yes bash -c 'cd apps/api; node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check m4-postgres-tests yes bash -c 'cd apps/api; node --import tsx --test --test-reporter=tap test/m4-customer-acceptance.ts test/m4-marketplace-acceptance.ts'
run_check m5-postgres-tests yes bash -c 'cd apps/api; node --import tsx --test --test-concurrency=1 --test-reporter=tap test/m5-payment-acceptance.ts test/m5-lifecycle-acceptance.ts'
run_check m3-postgres-tests yes bash -c 'cd apps/api; node --import tsx --test --test-concurrency=1 --test-reporter=tap test/m3-capacity-acceptance.ts test/m3-isolation-acceptance.ts'
run_check query-plans no corepack pnpm@9.15.9 --filter @faji/api exec node --import tsx test/m4-query-plans.ts
run_check contracts no corepack pnpm@9.15.9 --filter @faji/api contracts
run_check contract-snapshot no git diff --exit-code -- packages/api_contracts/openapi.json
run_check source-whitespace no git diff --check 2c64b47267d866ec93f6428a9ebe3fd66f70456f HEAD
run_check dependency-audit no corepack pnpm@9.15.9 audit --audit-level high
check_source(){
 [[ "$(git rev-parse HEAD)" == "$source_commit" && -z "$(git status --porcelain)" ]] || { echo 'Source changed during verification' >&2; return 2; }
}
run_check source-unchanged no check_source
