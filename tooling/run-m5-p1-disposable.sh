#!/usr/bin/env bash
# Exact-commit acceptance in a new local PostgreSQL 16/PostGIS cluster.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == feat/m5-p1-payment-foundation ]] || { echo 'Wrong M5 branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit source before acceptance' >&2; exit 2; }
[[ "$(id -u)" -ne 0 ]] || { echo 'Run as an unprivileged user' >&2; exit 2; }
pg_bin="${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}"
[[ "$("$pg_bin/postgres" --version)" == *' 16.'* ]] || { echo 'PostgreSQL 16 required' >&2; exit 2; }
[[ "$(corepack pnpm --version)" == 9.15.9 ]] || { echo 'Repository-pinned pnpm 9.15.9 required' >&2; exit 2; }
run_dir="$(mktemp -d /tmp/fajify-m5-acceptance.XXXXXXXX)"
chmod 700 "$run_dir"
cleanup(){
 result=$?
 trap - EXIT
 if [[ -f "$run_dir/data/postmaster.pid" ]]; then
  if ! "$pg_bin/pg_ctl" -D "$run_dir/data" -m immediate -w stop >/dev/null 2>&1; then
   echo "FAILED: PostgreSQL did not stop; preserved cluster at $run_dir" >&2
   exit 1
  fi
 fi
 if [[ "$result" -ne 0 ]]; then tail -30 "$run_dir/postgres.log" 2>/dev/null || true; fi
 rm -rf -- "$run_dir"
 echo 'CLEANUP: disposable M5 PostgreSQL cluster removed'
 exit "$result"
}
trap cleanup EXIT
rand(){ node -e 'process.stdout.write(require("node:crypto").randomBytes(16).toString("hex"))'; }
export FAJI_DISPOSABLE_DATABASE="fajify_m5_test_$(rand)"
admin_password="$(rand)"
export FAJI_MIGRATION_PASSWORD="$(rand)" FAJI_RUNTIME_PASSWORD="$(rand)"
printf '%s\n' "$admin_password" > "$run_dir/admin-password"
chmod 600 "$run_dir/admin-password"
"$pg_bin/initdb" -D "$run_dir/data" -U m5_admin --pwfile="$run_dir/admin-password" --auth=scram-sha-256 --no-locale -E UTF8 > "$run_dir/initdb.log"
pg_port="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
"$pg_bin/pg_ctl" -D "$run_dir/data" -l "$run_dir/postgres.log" -o "-h 127.0.0.1 -p $pg_port -k $run_dir -c shared_buffers=64MB -c max_connections=30" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="$pg_port" PGUSER=m5_admin PGDATABASE=postgres PGPASSWORD="$admin_password"
"$pg_bin/psql" -X -v ON_ERROR_STOP=1 -v db="$FAJI_DISPOSABLE_DATABASE" <<'SQL'
\getenv mig FAJI_MIGRATION_PASSWORD
\getenv run FAJI_RUNTIME_PASSWORD
CREATE ROLE m5_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'mig';
CREATE ROLE m5_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'run';
CREATE DATABASE :"db" OWNER m5_migrator;
COMMENT ON DATABASE :"db" IS 'fajify:m5:disposable';
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO m5_runtime;
SQL
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO m5_runtime;
SQL
export FAJI_DATABASE_URL="postgresql://m5_migrator:$FAJI_MIGRATION_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export FAJI_RUNTIME_DATABASE_URL="postgresql://m5_runtime:$FAJI_RUNTIME_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export NODE_ENV=test REDIS_URL=redis://127.0.0.1:6379
export KEYCLOAK_ISSUER=http://localhost:8080/realms/faji KEYCLOAK_AUDIENCE=faji-api
export S3_ENDPOINT=http://localhost:9000 S3_BUCKET=faji
unset PAYSTACK_SECRET_KEY
echo "SOURCE: $(git rev-parse HEAD)"
corepack pnpm --filter @faji/database migrate
# Grants for inherited M2 API integration; finance grants are separately checked by M5.
PGUSER=m5_migrator PGPASSWORD="$FAJI_MIGRATION_PASSWORD" PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT,INSERT,UPDATE,DELETE ON user_profiles,account_access,resource_memberships,identity_security_events,revoked_identity_sessions,business_onboarding TO m5_runtime;
SQL
corepack pnpm --filter @faji/api typecheck
corepack pnpm --filter @faji/api exec tsc -p tsconfig.m5-tests.json
corepack pnpm --filter @faji/database typecheck
corepack pnpm --filter @faji/api lint
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/api contracts
git diff --exit-code -- packages/api_contracts/openapi.json
corepack pnpm --filter @faji/api test
corepack pnpm --filter @faji/api test:m5:database
echo 'PASS: M5 foundation and inherited API database checks on the recorded source commit'
