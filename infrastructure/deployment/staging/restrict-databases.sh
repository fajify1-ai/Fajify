#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC',datname)
FROM pg_database WHERE datallowconn AND datname<>'fajify_staging_local'
\gexec
SQL
