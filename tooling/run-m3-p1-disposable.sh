#!/usr/bin/env bash
# M3-P1 consolidated acceptance using an isolated PostgreSQL 16/PostGIS cluster.
# No existing database, system cluster, main branch, or production service is touched.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "test/m3-p1-final-closure" ]] || { echo 'Wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Dirty source; commit before acceptance' >&2; exit 2; }
[[ "$(id -u)" -ne 0 ]] || { echo 'Run as an unprivileged user' >&2; exit 2; }
pg_bin="${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}"
"$pg_bin/postgres" --version | grep -q ' 16\.'
test -f /usr/share/postgresql/16/extension/postgis.control
run_dir="$(mktemp -d /tmp/fajify-m3-acceptance.XXXXXXXX)"
chmod 700 "$run_dir"
cleanup(){
 status=$?
 if [[ -f "$run_dir/data/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$run_dir/data" -m immediate -w stop >/dev/null 2>&1 || true; fi
 if [[ "$status" -ne 0 ]]; then tail -30 "$run_dir/postgres.log" 2>/dev/null || true; fi
 rm -rf -- "$run_dir"
 echo 'CLEANUP: disposable M3 PostgreSQL cluster removed'
}
trap cleanup EXIT
rand(){ node -e 'process.stdout.write(require("node:crypto").randomBytes(16).toString("hex"))'; }
export FAJI_DISPOSABLE_DATABASE="fajify_m3_test_$(rand)"
admin_password="$(rand)"
export FAJI_MIGRATION_PASSWORD="$(rand)" FAJI_RUNTIME_PASSWORD="$(rand)"
printf '%s\n' "$admin_password" > "$run_dir/admin-password"
chmod 600 "$run_dir/admin-password"
"$pg_bin/initdb" -D "$run_dir/data" -U m3_admin --pwfile="$run_dir/admin-password" --auth=scram-sha-256 --no-locale -E UTF8 > "$run_dir/initdb.log"
pg_port="$(node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
"$pg_bin/pg_ctl" -D "$run_dir/data" -l "$run_dir/postgres.log" -o "-h 127.0.0.1 -p $pg_port -k $run_dir -c shared_buffers=64MB -c max_connections=25" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="$pg_port" PGUSER=m3_admin PGDATABASE=postgres PGPASSWORD="$admin_password"
"$pg_bin/psql" -X -v ON_ERROR_STOP=1 -v db="$FAJI_DISPOSABLE_DATABASE" <<'SQL'
\getenv mig FAJI_MIGRATION_PASSWORD
\getenv run FAJI_RUNTIME_PASSWORD
CREATE ROLE m3_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'mig';
CREATE ROLE m3_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'run';
CREATE DATABASE :"db" OWNER m3_migrator;
COMMENT ON DATABASE :"db" IS 'fajify:m3:disposable';
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO m3_runtime;
SQL
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO m3_runtime;
SQL
export FAJI_DATABASE_URL="postgresql://m3_migrator:$FAJI_MIGRATION_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export FAJI_RUNTIME_DATABASE_URL="postgresql://m3_runtime:$FAJI_RUNTIME_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export NODE_ENV=test
export REDIS_URL="redis://127.0.0.1:6379"
export KEYCLOAK_ISSUER="http://localhost:8080/realms/faji"
export KEYCLOAK_AUDIENCE=faji-api
export S3_ENDPOINT="http://localhost:9000"
export S3_BUCKET=faji
echo "SOURCE: $(git rev-parse HEAD)"
echo "DISPOSABLE DATABASE: $FAJI_DISPOSABLE_DATABASE"
bash tooling/verify-m3-p1-consolidated.sh
