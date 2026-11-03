#!/usr/bin/env bash
# Explicit, local-only M8-P1 OpenAPI snapshot preparation.
# No remote push, branch merge, database writes, or GitHub Actions.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
expected='feat/m8-p1-admin-operations'
[[ "$(git branch --show-current)" == "$expected" ]] || { echo "Refusing to run outside $expected" >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Refusing dirty worktree; preserve existing edits' >&2; exit 2; }
# Shared backend edits are expected in this branch; review cross-domain changes in PR #20.
base_sha="$(git merge-base origin/main HEAD)"
printf 'M8-P1 base: %s\n' "$base_sha"
printf 'M8-P1 head: %s\n' "$(git rev-parse HEAD)"
command -v corepack >/dev/null || { echo 'Corepack required (Node 22 recommended)' >&2; exit 2; }
corepack pnpm@9.15.9 install --frozen-lockfile
# OpenAPI module initialization validates configuration but must not contact these endpoints.
# Use explicitly nonproduction placeholders for contract generation only.
export NODE_ENV=test
export FAJI_DATABASE_URL="${FAJI_DATABASE_URL:-postgresql://faji_contract_only:unused@127.0.0.1:5432/faji_contract_unconnected}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export KEYCLOAK_ISSUER="${KEYCLOAK_ISSUER:-http://localhost:8080/realms/faji}"
export KEYCLOAK_AUDIENCE="${KEYCLOAK_AUDIENCE:-faji-api}"
export S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
export S3_BUCKET="${S3_BUCKET:-faji-contract-only}"
corepack pnpm@9.15.9 --filter @faji/api contracts
git diff --check
unexpected="$(git status --porcelain | grep -vE '^ M packages/api_contracts/openapi.json$' || true)"
if [[ -n "$unexpected" ]]; then
 echo 'Contract export changed unexpected files; inspect before committing:' >&2
 printf '%s\n' "$unexpected" >&2
 exit 2
fi
if git diff --quiet -- packages/api_contracts/openapi.json; then
 echo 'OpenAPI snapshot unchanged; nothing to commit.'
else
 git add -- packages/api_contracts/openapi.json
 git commit -m 'chore(m8-p1): snapshot generated administration OpenAPI contract'
 echo 'Generated OpenAPI snapshot committed locally.'
fi
printf 'Prepared exact source SHA: %s\n' "$(git rev-parse HEAD)"
echo 'Next: configure explicitly marked disposable M8 database, then run bash tooling/verify-m8-p1-consolidated.sh'
