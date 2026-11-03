#!/usr/bin/env bash
# M6-P1 local, explicit disposable PostgreSQL acceptance. Do not enable GitHub Actions.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == 'feat/m6-p1-planning-engine' ]] || { echo 'Wrong source branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit all source and contract snapshots before acceptance' >&2; exit 2; }
: "${FAJI_DATABASE_URL:?Explicit disposable migrator URL required}"
: "${FAJI_RUNTIME_DATABASE_URL:?Distinct runtime role URL required}"
[[ "${FAJI_DISPOSABLE_DATABASE:-}" =~ ^fajify_m6_test_[a-z0-9_]+$ ]] || { echo 'Marked M6 disposable name required' >&2; exit 2; }
source_sha="$(git rev-parse HEAD)"
report_dir="${FAJI_M6_REPORT_DIR:-}"
if [[ -z "$report_dir" ]]; then report_dir="$(mktemp -d /tmp/fajify-m6-report.XXXXXXXX)"; fi
mkdir -p "$report_dir"
finish(){
 result=$?
 trap - EXIT
 if node tooling/m6-verification-report.mjs "$report_dir" "$source_sha" "$result"; then report_status=0; else report_status=$?; fi
 echo "M6-P1 evidence directory: $report_dir"
 if [[ "$result" -ne 0 ]]; then exit "$result"; fi
 exit "$report_status"
}
trap finish EXIT
run_check(){
 local name="$1" classification="$2" result
 shift 2
 echo "CHECK: $name"
 if "$@" 2>&1 | tee "$report_dir/$name.log"; then result=0; else result=$?; fi
 node -e 'const fs=require("node:fs");fs.appendFileSync(process.argv[1],JSON.stringify({name:process.argv[2],test:process.argv[3]==="yes",exitCode:Number(process.argv[4])})+"\n")' "$report_dir/checks.jsonl" "$name" "$classification" "$result"
 return "$result"
}
echo "M6-P1 source SHA: $source_sha"
run_check disposable-preflight no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/disposable-target.ts
run_check database-types no corepack pnpm@9.15.9 --filter @faji/database typecheck
run_check api-types no corepack pnpm@9.15.9 --filter @faji/api typecheck
run_check m6-test-types no corepack pnpm@9.15.9 --filter @faji/api exec tsc -p tsconfig.m6-tests.json
run_check api-lint no corepack pnpm@9.15.9 --filter @faji/api lint
run_check api-build no corepack pnpm@9.15.9 --filter @faji/api build
run_check migrations no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/migrate.ts
run_check migrations-replay no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/migrate.ts
run_check runtime-grants no corepack pnpm@9.15.9 --filter @faji/database exec node --import tsx scripts/grant-m5-runtime.ts
run_check report-tests yes node --test --test-reporter=tap tooling/m6-verification-report.test.mjs
run_check database-tests yes bash -c 'cd packages/database && node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check api-tests yes bash -c 'cd apps/api && node --import tsx --test --test-reporter=tap test/*.test.ts'
run_check m6-postgres-tests yes corepack pnpm@9.15.9 --filter @faji/api exec node --import tsx --test --test-concurrency=1 --test-reporter=tap test/m6-planning-acceptance.ts
run_check contracts no corepack pnpm@9.15.9 --filter @faji/api contracts
run_check contract-snapshot no git diff --exit-code -- packages/api_contracts/openapi.json
run_check source-whitespace no git diff --check origin/main HEAD
run_check dependency-audit no corepack pnpm@9.15.9 audit --audit-level high
check_source(){
 [[ "$(git rev-parse HEAD)" == "$source_sha" && -z "$(git status --porcelain)" ]] || { echo 'Working tree or source SHA changed during verification' >&2; return 2; }
}
run_check source-unchanged no check_source
