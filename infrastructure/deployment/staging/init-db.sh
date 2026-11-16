#!/bin/sh
set -eu
export MIGRATOR_PASSWORD="$(cat /run/secrets/db_migrator_password)" RUNTIME_PASSWORD="$(cat /run/secrets/db_runtime_password)"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
\getenv migrator_password MIGRATOR_PASSWORD
\getenv runtime_password RUNTIME_PASSWORD
CREATE ROLE faji_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migrator_password';
CREATE ROLE faji_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'runtime_password';
CREATE DATABASE fajify_staging_local OWNER faji_migrator;
COMMENT ON DATABASE fajify_staging_local IS 'fajify:staging:private';
REVOKE ALL ON DATABASE fajify_staging_local FROM PUBLIC;
GRANT CONNECT ON DATABASE fajify_staging_local TO faji_runtime;
\connect fajify_staging_local
CREATE EXTENSION postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
