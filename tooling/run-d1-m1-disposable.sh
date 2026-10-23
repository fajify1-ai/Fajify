#!/usr/bin/env bash
# Uses an already available PG16/PostGIS installation; never downloads or starts Docker.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
pg_bin="${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}"
"$pg_bin/postgres" --version | grep -q ' 16\.' || { echo 'PostgreSQL 16 required'; exit 1; }
run_dir=$(mktemp -d /tmp/fajify-m1-test.XXXXXXXX)
chmod 700 "$run_dir"
cleanup() {
 if [[ -f "$run_dir/data/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$run_dir/data" -m fast -w stop >/dev/null; fi
 if [[ -n "${redis_pid:-}" ]] && kill -0 "$redis_pid" 2>/dev/null; then kill "$redis_pid"; wait "$redis_pid" || true; fi
 rm -rf -- "$run_dir"
 echo 'CLEANUP: private PostgreSQL cluster and Redis stopped; run directory removed'
}
trap cleanup EXIT
export FAJI_DISPOSABLE_DATABASE="fajify_m1_test_$(node -e 'process.stdout.write(require("crypto").randomBytes(6).toString("hex"))')"
export FAJI_MIGRATION_PASSWORD=$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')
export FAJI_RUNTIME_PASSWORD=$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')
export PGPASSWORD=$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')
printf '%s\n' "$PGPASSWORD" > "$run_dir/admin-password"
chmod 600 "$run_dir/admin-password"
"$pg_bin/initdb" -D "$run_dir/data" -U m1_admin --pwfile="$run_dir/admin-password" --auth=scram-sha-256 --no-locale -E UTF8 > "$run_dir/initdb.log"
# OS-assigned ports avoid collisions; PostgreSQL also has its own private socket directory.
pg_port=$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
redis_port=$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
"$pg_bin/pg_ctl" -D "$run_dir/data" -l "$run_dir/postgres.log" -o "-h 127.0.0.1 -p $pg_port -k $run_dir -c shared_buffers=32MB -c max_connections=15 -c max_worker_processes=2" -w start >/dev/null
export PGHOST=127.0.0.1 PGPORT="$pg_port" PGUSER=m1_admin PGDATABASE=postgres
"$pg_bin/psql" -X -v ON_ERROR_STOP=1 -v db="$FAJI_DISPOSABLE_DATABASE" <<'SQL'
\getenv migration_password FAJI_MIGRATION_PASSWORD
\getenv runtime_password FAJI_RUNTIME_PASSWORD
CREATE ROLE m1_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migration_password';
CREATE ROLE m1_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'runtime_password';
CREATE DATABASE :"db" OWNER m1_migrator;
COMMENT ON DATABASE :"db" IS 'fajify:m1:disposable';
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db" TO m1_runtime;
CREATE DATABASE keycloak_m1_sentinel;
REVOKE ALL ON DATABASE keycloak_m1_sentinel FROM PUBLIC;
SQL
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO m1_runtime;
SQL
export FAJI_DATABASE_URL="postgresql://m1_migrator:$FAJI_MIGRATION_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export FAJI_RUNTIME_DATABASE_URL="postgresql://m1_runtime:$FAJI_RUNTIME_PASSWORD@127.0.0.1:$pg_port/$FAJI_DISPOSABLE_DATABASE"
export FAJI_KEYCLOAK_TEST_URL="postgresql://m1_runtime:$FAJI_RUNTIME_PASSWORD@127.0.0.1:$pg_port/keycloak_m1_sentinel"
export REDIS_URL="redis://127.0.0.1:$redis_port"
redis-server --bind 127.0.0.1 --port "$redis_port" --save '' --appendonly no --dir "$run_dir" > "$run_dir/redis.log" 2>&1 &
redis_pid=$!
for attempt in {1..50}; do if redis-cli -h 127.0.0.1 -p "$redis_port" ping >/dev/null 2>&1; then break; fi; sleep 0.1; done
node -e 'console.log("Verified source commit:",require("child_process").execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim())'
bash tooling/verify-d1-m1.sh --acceptance
PGDATABASE="$FAJI_DISPOSABLE_DATABASE" "$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM user_profiles)+(SELECT count(*) FROM audit_events)+(SELECT count(*) FROM outbox_events) <> 0
 THEN RAISE EXCEPTION 'Synthetic data cleanup incomplete'; END IF;
END $$;
SELECT name,checksum FROM _faji_migrations ORDER BY name;
SQL
echo 'PASS: synthetic application records cleaned before cluster destruction'
