#!/usr/bin/env bash
# Explicitly disposable restore only. Never points pg_restore at the source database.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FAJI_DATABASE_URL:?disposable owner URL required}"
: "${FAJI_RESTORE_URL:?distinct fresh disposable restore database required}"
: "${FAJI_DISPOSABLE_DATABASE:?source disposable marker required}"
pnpm --filter @faji/database exec tsx scripts/disposable-target.ts
node -e 'const a=new URL(process.env.FAJI_DATABASE_URL),b=new URL(process.env.FAJI_RESTORE_URL);if(a.host!==b.host||a.pathname===b.pathname||!/^\/fajify_m[1-8]_test_[a-z0-9_]+$/.test(b.pathname))throw Error("Distinct disposable restore target required")'
backup_dir="$(mktemp -d "$PWD/work/auth-backup.XXXXXX")"
chmod 700 "$backup_dir"
pg_dump --format=custom --no-owner --file="$backup_dir/database.dump" "$FAJI_DATABASE_URL"
chmod 600 "$backup_dir/database.dump"
FAJI_DATABASE_URL="$FAJI_RESTORE_URL" FAJI_DISPOSABLE_DATABASE="$(node -p 'new URL(process.env.FAJI_RESTORE_URL).pathname.slice(1)')" pnpm --filter @faji/database exec tsx scripts/disposable-target.ts
# PostGIS is provisioned by the DBA. The migrator deliberately cannot alter its owner comment.
pg_restore --list "$backup_dir/database.dump" | sed '/ COMMENT - EXTENSION postgis /d' > "$backup_dir/restore.list"
pg_restore --use-list="$backup_dir/restore.list" --single-transaction --exit-on-error --no-owner --dbname="$FAJI_RESTORE_URL" "$backup_dir/database.dump"
# Verify the complete checksum ledger and replay against the restored schema.
FAJI_DATABASE_URL="$FAJI_RESTORE_URL" pnpm --filter @faji/database migrate
pnpm --filter @faji/database exec tsx scripts/verify-restored-data.ts
echo "PASS: backup restored with all content and migration checksums intact. Private backup: $backup_dir"
