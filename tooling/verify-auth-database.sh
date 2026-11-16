#!/usr/bin/env bash
# All writes require the existing marked disposable PostgreSQL 16 preflight.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FAJI_DATABASE_URL:?marked disposable owner URL required}"
: "${FAJI_RUNTIME_DATABASE_URL:?separate restricted runtime URL required}"
: "${FAJI_DISPOSABLE_DATABASE:?disposable database marker required}"
pnpm --filter @faji/database exec tsx scripts/disposable-target.ts
pnpm --filter @faji/database migrate
pnpm --filter @faji/database migrate
pnpm --filter @faji/database exec tsx scripts/grant-m7-runtime.ts
pnpm --filter @faji/database test:integration
pnpm --filter @faji/api exec tsx --test --test-concurrency=1 test/authorization.database.test.ts test/business-memberships.database.test.ts
pnpm --filter @faji/api exec tsx --test test/auth-security-acceptance.ts
# Domain suites retain their own milestone-specific disposable target checks.
case "$FAJI_DISPOSABLE_DATABASE" in
 fajify_m3_test_*) pnpm --filter @faji/api exec tsx --test --test-concurrency=1 test/m3-capacity-acceptance.ts test/m3-isolation-acceptance.ts ;;
 fajify_m4_test_*|fajify_m5_test_*) pnpm --filter @faji/api exec tsx --test --test-concurrency=1 test/m4-customer-acceptance.ts test/m4-marketplace-acceptance.ts test/m5-payment-acceptance.ts test/m5-lifecycle-acceptance.ts ;;
 fajify_m6_test_*) pnpm --filter @faji/api exec tsx --test test/m6-planning-acceptance.ts ;;
 fajify_m7_test_*|fajify_m8_test_*) pnpm --filter @faji/api test:m7:database; pnpm --filter @faji/api exec tsx --test test/m8-postgres-acceptance.ts ;;
esac
