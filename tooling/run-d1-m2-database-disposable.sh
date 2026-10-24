#!/usr/bin/env bash
# Creates a private loopback PostgreSQL 16/PostGIS test cluster; never touches existing clusters.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "feat/m2-d1-keycloak-auth-authorization" ]] || { echo 'BLOCKED: wrong branch' >&2; exit 2; }
for c in node corepack; do command -v "$c" >/dev/null || { echo "Missing $c" >&2; exit 2; }; done
pg_bin="${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}"
"$pg_bin/postgres" --version | grep -q ' 16\.' || { echo 'PostgreSQL 16 required' >&2; exit 2; }
run_dir="$(mktemp -d /tmp/fajify-m2-db.XXXXXXXX)"
chmod 700 "$run_dir"
cleanup(){
 if [[ -f "$run_dir/data/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$run_dir/data" -m immediate -w stop >/dev/null || true; fi
 rm -rf -- "$run_dir"
 echo 'CLEANUP: disposable M2 cluster removed'
}
trap cleanup EXIT
rand(){ node -e 'process.stdout.write(require("node:crypto").randomBytes(18).toString("hex"))'; }
export FAJI_DISPOSABLE_DATABASE="fajify_m2_test_$(rand)"
admin_password="$(rand)"
migration_password="$(rand)"
runtime_password="$(rand)"
printf '%s\n' "$admin_password" > "$run_dir/admin-password"
chmod 600 "$run_dir/admin-password"
"$pg_bin/initdb" -D "$run_dir/data" -U m2_admin --pwfile="$run_dir/admin-password" --auth=scram-sha-256 --no-locale -E UTF8 > "$run_dir/initdb.log"
pg_port="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
"$pg_bin/pg_ctl" -D "$run_dir/data" -l "$run_dir/postgres.log" -o "-h 127.0.0.1 -p $pg_port -k $run_dir -c shared_buffers=32MB -c max_connections=15" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="$pg_port" PGUSER=m2_admin PGDATABASE=postgres PGPASSWORD="$admin_password"
export FAJI_MIGRATION_PASSWORD="$migration_password" FAJI_RUNTIME_PASSWORD="$runtime_password"
"$pg_bin/psql" -X -v ON_ERROR_STOP=1 -v db="$FAJI_DISPOSABLE_DATABASE" <<'SQL'
\getenv mig FAJI_MIGRATION_PASSWORD
\getenv run FAJI_RUNTIME_PASSWORD
CREATE ROLE m2_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'mig';
CREATE ROLE m2_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'run';
CREATE DATABASE :"db" OWNER m2_migrator;
COMMENT ON DATABASE :"db" IS 'fajify:m1:disposable';
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO m2_runtime;
SQL
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO m2_runtime;
SQL
export FAJI_DATABASE_URL="postgresql://m2_migrator:$migration_password@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export FAJI_RUNTIME_DATABASE_URL="postgresql://m2_runtime:$runtime_password@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
echo "SOURCE: $(git rev-parse HEAD)"
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @faji/api typecheck
corepack pnpm --filter @faji/api lint
corepack pnpm --filter @faji/api test
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/database migrate
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT,INSERT,UPDATE,DELETE ON user_profiles,account_access,resource_memberships,identity_security_events TO m2_runtime;
SQL
# Unit suite excludes .database.test.ts; real DB tests are explicitly invoked here.
corepack pnpm --filter @faji/api exec tsx --test test/authorization.database.test.ts
echo 'PASS: M2 disposable PostgreSQL authorization checks completed'
