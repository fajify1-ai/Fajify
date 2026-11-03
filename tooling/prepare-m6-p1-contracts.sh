#!/usr/bin/env bash
# Explicit, local-only M6-P1 OpenAPI snapshot preparation.
# No remote push, branch merge, database writes, or GitHub Actions.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
expected='feat/m6-p1-planning-engine'
[[ "$(git branch --show-current)" == "$expected" ]] || { echo "Refusing to run outside $expected" >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Refusing dirty worktree; preserve existing edits' >&2; exit 2; }
git diff --quiet origin/main...HEAD -- apps/api/src/auth apps/api/src/business apps/api/src/customer apps/api/src/payments || {
 echo 'Shared source differences detected. Review the PR diff before preparing contracts.' >&2
 # Source differences are expected on M6, therefore this is advisory.
}
base_sha="$(git merge-base origin/main HEAD)"
printf 'M6-P1 base: %s\n' "$base_sha"
printf 'M6-P1 head: %s\n' "$(git rev-parse HEAD)"
command -v corepack >/dev/null || { echo 'Corepack required (Node 22 recommended)' >&2; exit 2; }
corepack pnpm@9.15.9 install --frozen-lockfile
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
 git commit -m 'chore(m6-p1): snapshot generated planning OpenAPI contract'
 echo 'Generated OpenAPI snapshot committed locally.'
fi
printf 'Prepared exact source SHA: %s\n' "$(git rev-parse HEAD)"
echo 'Next: configure explicitly marked disposable M6 database, then run bash tooling/verify-m6-p1-consolidated.sh'
