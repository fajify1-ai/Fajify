#!/usr/bin/env bash
# M7-P1 consolidated acceptance. Called ONLY from run-m7-p1-disposable.sh.
set -uo pipefail
cd "$(dirname "$0")/.."
: "${FAJI_M7_REPORT_DIR:?Report directory missing}"
[[ "${FAJI_M7_DISPOSABLE_DATABASE_ACK:-}" == m7-disposable-postgis-only ]] || { echo 'Disposable acknowledgement required' >&2; exit 2; }
[[ "${FAJI_DISPOSABLE_DATABASE:-}" == fajify_m7_test_* ]] || { echo 'Not a marked M7 disposable database' >&2; exit 2; }
[[ "$(git branch --show-current)" == feat/m7-p1-ride-dispatch-backend ]] || { echo 'Wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Dirty worktree; refuse acceptance' >&2; exit 2; }
[[ "$(id -u)" -ne 0 ]] || { echo 'Do not run acceptance as root' >&2; exit 2; }
source_commit="$(git rev-parse HEAD)"
results="$FAJI_M7_REPORT_DIR/checks.tsv"
: > "$results"
run(){
 local name="$1"; shift
 echo "== M7 GATE: $name =="
 if "$@" >"$FAJI_M7_REPORT_DIR/$name.log" 2>&1; then
  printf '%s\tPASS\n' "$name" >>"$results"
  echo "PASS: $name"
  return 0
 else
  local status=$?
  printf '%s\tFAIL(%s)\n' "$name" "$status" >>"$results"
  echo "FAIL: $name (exit $status)" >&2
  tail -20 "$FAJI_M7_REPORT_DIR/$name.log" >&2 || true
  if [[ "$name" == api-unit || "$name" == m7-disposable-postgis || "$name" == existing-database-integrations ]]; then
   echo "FAILURE DETAILS ($name): first test diagnostics" >&2
   grep -n -A 20 -E '^not ok [0-9]+' "$FAJI_M7_REPORT_DIR/$name.log" | head -n 180 >&2 || true
  fi
  return "$status"
 fi
}
run database-typecheck corepack pnpm --filter @faji/database typecheck
run api-typecheck corepack pnpm --filter @faji/api typecheck
run m7-test-typecheck corepack pnpm --filter @faji/api typecheck:m7
run api-lint corepack pnpm --filter @faji/api lint
run api-unit corepack pnpm --filter @faji/api test
run api-build corepack pnpm --filter @faji/api build
run m7-disposable-postgis corepack pnpm --filter @faji/api test:m7:database
run existing-database-integrations corepack pnpm --filter @faji/api test:database
if run openapi-export corepack pnpm --filter @faji/api contracts; then
 run openapi-snapshot-match git diff --exit-code -- packages/api_contracts/openapi.json
else
 printf '%s\tBLOCKED(openapi-export)\n' openapi-snapshot-match >>"$results"
 echo 'BLOCKED: openapi-snapshot-match (export failed)' >&2
fi
run source-whitespace git diff --check
run branch-clean bash -c 'test -z "$(git status --porcelain)"'
node - "$results" "$FAJI_M7_REPORT_DIR/acceptance.json" "$source_commit" <<'JS'
const fs=require('node:fs');
const [input,out,sha]=process.argv.slice(2);
const checks=fs.readFileSync(input,'utf8').trim().split('\n').filter(Boolean).map(x=>{
 const [name,status]=x.split('\t');
 return {name,status,passed:status==='PASS'};
});
const failures=checks.filter(x=>!x.passed).map(x=>x.name);
const report={
 milestone:'M7-P1',
 sourceCommit:sha,
 environment:'fresh disposable PostgreSQL 16 / PostGIS / synthetic only',
 checks,
 result:failures.length===0?'PASS':'FAIL',
 problems:failures,
 clusterCleanup:{success:false,pending:true},
 generatedAt:new Date().toISOString()
};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(report.result+' M7-P1 preliminary acceptance',checks.filter(x=>x.passed).length+'/'+checks.length);
JS
if grep -qP '\tFAIL' "$results"; then exit 1; fi
echo "M7-P1 checks completed. Disposable cluster cleanup will finalize the report."
