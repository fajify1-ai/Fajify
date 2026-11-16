#!/usr/bin/env bash
# After implementation freeze: generate the reviewable snapshot on the local machine.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == 'feat/m4-p1-customer-platform' ]] || { echo 'Wrong branch' >&2; exit 2; }
export NODE_ENV=test
export FAJI_DATABASE_URL=postgresql://unused@127.0.0.1:1/contract_generation_only
export REDIS_URL=redis://127.0.0.1:1
export BETTER_AUTH_URL=http://localhost:3001
export BETTER_AUTH_SECRET=disposable-test-secret-over-thirty-two-characters
export FAJI_WEB_ORIGINS=http://localhost:3000
export S3_ENDPOINT=http://localhost:9000
export S3_BUCKET=faji
corepack pnpm@9.15.9 --filter @faji/api contracts
echo 'Generated packages/api_contracts/openapi.json. Review and commit any changes before consolidated verification.'
