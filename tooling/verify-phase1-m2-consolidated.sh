#!/usr/bin/env bash
set -euo pipefail
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api test
: "${FAJI_AUTH_TEST_DATABASE_URL:?Set a fresh disposable fajify_auth_test database URL}"
pnpm --filter @faji/api exec tsx --test test/better-auth.database.test.ts
