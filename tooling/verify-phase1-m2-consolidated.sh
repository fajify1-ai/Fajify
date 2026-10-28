#!/usr/bin/env bash
# Phase 1 Milestone 2 consolidated local gate. Runs once after engineering freeze.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "feat/m2-p1-session-security-hardening" ]] || { echo 'BLOCKED: wrong source branch' >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'BLOCKED: tracked worktree modifications' >&2; exit 2; }
source_sha="$(git rev-parse HEAD)"
echo "PHASE 1 — MILESTONE 2 | SOURCE: $source_sha"
echo '=== 1/3: Realm security and authentication policy ==='
bash tooling/verify-d1-m2-keycloak-realm.sh
echo '=== 2/3: Disposable application PostgreSQL and API ==='
bash tooling/run-d1-m2-database-disposable.sh
echo '=== 3/3: Disposable identity PostgreSQL and Keycloak lifecycle ==='
FAJI_KEYCLOAK_HOME="${FAJI_KEYCLOAK_HOME:?Set FAJI_KEYCLOAK_HOME to Keycloak 26.8.1}" bash tooling/run-d1-m2-keycloak-disposable.sh
[[ "$(git rev-parse HEAD)" == "$source_sha" ]] || { echo 'BLOCKED: source commit changed during acceptance' >&2; exit 3; }
echo "PASS: scoped M2 automated gates at $source_sha"
echo 'PENDING FINAL SIGN-OFF: actual Business-domain endpoints and end-to-end onboarding authorization integration; security fixture and distributed-throttle checks pass.'
