#!/usr/bin/env bash
# Disposable Keycloak 26 + separate PostgreSQL 16 identity cluster.
# Requires a preinstalled Keycloak distribution; no Docker or persistent DB.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "feat/m2-d1-keycloak-auth-authorization" ]] || { echo 'BLOCKED: wrong branch' >&2; exit 2; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'BLOCKED: tracked worktree modifications' >&2; exit 2; }
for bin in node curl; do command -v "$bin" >/dev/null || { echo "Missing $bin" >&2; exit 2; }; done
pg_bin="${FAJI_PG_BIN:-/usr/lib/postgresql/16/bin}"
keycloak_home="${FAJI_KEYCLOAK_HOME:-}"
[[ -n "$keycloak_home" && -x "$keycloak_home/bin/kc.sh" ]] || { echo 'BLOCKED: set FAJI_KEYCLOAK_HOME to extracted Keycloak 26 distribution' >&2; exit 2; }
"$pg_bin/postgres" --version | grep -q ' 16\.' || { echo 'BLOCKED: PostgreSQL 16 required' >&2; exit 2; }
"$keycloak_home/bin/kc.sh" --version | grep -q '^Keycloak 26\.' || { echo 'BLOCKED: Keycloak 26.x required' >&2; exit 2; }
root=$(mktemp -d /tmp/fajify-m2-keycloak.XXXXXXXX)
chmod 700 "$root"
pg_started=0; kc_pid=''
cleanup(){
 local result=$?
 trap - EXIT
 if [[ -n "$kc_pid" ]] && kill -0 "$kc_pid" 2>/dev/null; then kill "$kc_pid" || true; wait "$kc_pid" 2>/dev/null || true; fi
 if [[ "$pg_started" == 1 ]]; then "$pg_bin/pg_ctl" -D "$root/pg" -m immediate -w stop >/dev/null || true; fi
 rm -rf -- "$root"
 echo 'CLEANUP: disposable Keycloak identity cluster and generated secrets removed'
 exit "$result"
}
trap cleanup EXIT
rand(){ node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))'; }
port(){ node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'; }
pg_port=$(port); kc_port=$(port)
[[ "$pg_port" != "$kc_port" ]] || { echo 'Port collision'; exit 2; }
admin_pass=$(rand); db_pass=$(rand)
printf '%s\n' "$admin_pass" > "$root/pg-admin-password"
chmod 600 "$root/pg-admin-password"
"$pg_bin/initdb" -D "$root/pg" -U m2_keycloak_pg_admin --pwfile="$root/pg-admin-password" --auth=scram-sha-256 --no-locale -E UTF8 >"$root/initdb.log"
"$pg_bin/pg_ctl" -D "$root/pg" -l "$root/postgresql.log" -o "-h 127.0.0.1 -p $pg_port -k $root -c shared_buffers=32MB -c max_connections=20" -w start >/dev/null
pg_started=1
export PGHOST=127.0.0.1 PGPORT="$pg_port" PGUSER=m2_keycloak_pg_admin PGPASSWORD="$admin_pass" PGDATABASE=postgres
export FAJI_KC_DB_PASS="$db_pass"
"$pg_bin/psql" -X -v ON_ERROR_STOP=1 <<'SQL'
\getenv kc_pass FAJI_KC_DB_PASS
CREATE ROLE m2_keycloak_identity LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'kc_pass';
CREATE DATABASE m2_keycloak_identity OWNER m2_keycloak_identity;
REVOKE ALL ON DATABASE m2_keycloak_identity FROM PUBLIC;
SQL
# Keycloak's server distribution is shared but its configuration, working data and DB are isolated.
mkdir -p "$root/kc/data/import" "$root/kc/conf"
cp infrastructure/keycloak/realm-faji-m2.json "$root/kc/data/import/faji-realm.json"
# Prefer a private copy of the distribution to avoid writing cache/build state to a shared installation.
cp -a "$keycloak_home/." "$root/kc/"
cp infrastructure/keycloak/realm-faji-m2.json "$root/kc/data/import/faji-realm.json"
export KC_DB=postgres
export KC_DB_URL="jdbc:postgresql://127.0.0.1:$pg_port/m2_keycloak_identity"
export KC_DB_USERNAME=m2_keycloak_identity KC_DB_PASSWORD="$db_pass"
export KC_BOOTSTRAP_ADMIN_USERNAME=m2_acceptance_admin KC_BOOTSTRAP_ADMIN_PASSWORD="$(rand)"
export KC_HTTP_ENABLED=true KC_HTTP_HOST=127.0.0.1 KC_HTTP_PORT="$kc_port"
export KC_HOSTNAME="http://127.0.0.1:$kc_port"
export JAVA_OPTS_APPEND="-Xms64m -Xmx384m"
"$root/kc/bin/kc.sh" start-dev --import-realm --http-host=127.0.0.1 --http-port="$kc_port" >"$root/keycloak.log" 2>&1 &
kc_pid=$!
ready=0
for attempt in $(seq 1 120); do
 if ! kill -0 "$kc_pid" 2>/dev/null; then echo 'FAIL: Keycloak exited; inspect local preflight/import configuration' >&2; tail -n 35 "$root/keycloak.log" | sed -E 's/((PASSWORD|PASS|SECRET|TOKEN)=[^ ]+)/[REDACTED]/gi' >&2; exit 1; fi
 if curl --max-time 2 -fsS "http://127.0.0.1:$kc_port/realms/faji/.well-known/openid-configuration" -o "$root/discovery.json" 2>/dev/null; then ready=1; break; fi
 sleep 2
done
[[ "$ready" == 1 ]] || { echo 'FAIL: Keycloak discovery not ready' >&2; exit 1; }
FAJI_DISCOVERY_FILE="$root/discovery.json" FAJI_KC_PORT="$kc_port" node <<'NODE'
const assert=require('node:assert/strict');
const fs=require('node:fs');
const x=JSON.parse(fs.readFileSync(process.env.FAJI_DISCOVERY_FILE,'utf8'));
const issuer='http://127.0.0.1:'+process.env.FAJI_KC_PORT+'/realms/faji';
assert.equal(x.issuer,issuer);
for(const key of ['authorization_endpoint','token_endpoint','jwks_uri','end_session_endpoint'])
 assert.ok(x[key]?.startsWith(issuer+'/protocol/openid-connect/'),key);
console.log('PASS: live Keycloak 26 OIDC discovery and realm import');
NODE
echo "SOURCE: $(git rev-parse HEAD)"
echo 'LIMITATION: PKCE browser redemption, verification email, recovery, MFA, refresh and logout are not yet tested.'
