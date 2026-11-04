#!/bin/sh
export PATH=/bin:/usr/bin:/usr/lib/postgresql/16/bin
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
exec >/dev/console 2>&1
set -eu
hostname faji-acceptance
mount -t tmpfs -o size=1800m tmpfs /run
chmod 1777 /tmp
insmod /e1000.ko
ifconfig lo 127.0.0.1 up
ifconfig eth0 10.0.2.15 netmask 255.255.255.0 up
route add default gw 10.0.2.2
. /bootconfig/secrets.env
mkdir -p /run/pg-app /run/pg-identity /run/pg-sockets
chown -R 1000:1000 /run/pg-app /run/pg-identity /run/pg-sockets /home/postgres
chown 1000:1000 /bootconfig/apppw /bootconfig/idpw
chmod 600 /bootconfig/apppw /bootconfig/idpw
su -s /bin/sh postgres -c 'initdb -D /run/pg-app -U postgres --pwfile=/bootconfig/apppw --auth=scram-sha-256 --no-locale -E UTF8' >/run/initdb-app.log 2>&1
su -s /bin/sh postgres -c 'initdb -D /run/pg-identity -U postgres --pwfile=/bootconfig/idpw --auth=scram-sha-256 --no-locale -E UTF8' >/run/initdb-identity.log 2>&1
cp /bootconfig/server.crt /run/pg-app/server.crt
cp /bootconfig/server.key /run/pg-app/server.key
chown 1000:1000 /run/pg-app/server.crt /run/pg-app/server.key
chmod 600 /run/pg-app/server.key
echo 'hostssl all all 10.0.2.2/32 scram-sha-256' >> /run/pg-app/pg_hba.conf
su -s /bin/sh postgres -c 'pg_ctl -D /run/pg-app -l /run/pg-app/server.log -o "-h 0.0.0.0 -p 5432 -k /run/pg-sockets -c ssl=on -c ssl_cert_file=/run/pg-app/server.crt -c ssl_key_file=/run/pg-app/server.key -c shared_buffers=32MB -c max_connections=30" -w start'
cp /bootconfig/server.crt /run/pg-identity/server.crt
cp /bootconfig/server.key /run/pg-identity/server.key
chown 1000:1000 /run/pg-identity/server.crt /run/pg-identity/server.key
chmod 600 /run/pg-identity/server.key
echo 'hostssl all all 10.0.2.2/32 scram-sha-256' >> /run/pg-identity/pg_hba.conf
su -s /bin/sh postgres -c 'pg_ctl -D /run/pg-identity -l /run/pg-identity/server.log -o "-h 0.0.0.0 -p 5433 -k /run/pg-sockets -c ssl=on -c ssl_cert_file=/run/pg-identity/server.crt -c ssl_key_file=/run/pg-identity/server.key -c shared_buffers=32MB -c max_connections=20" -w start'
PGPASSWORD="$APP_DB_PASS" psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $APP_DB_NAME;"
PGPASSWORD="$APP_DB_PASS" psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "COMMENT ON DATABASE $APP_DB_NAME IS 'fajify:m2:disposable';"
PGPASSWORD="$KC_DB_PASS" psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE faji_identity LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$KC_DB_PASS';
CREATE DATABASE faji_identity OWNER faji_identity;
REVOKE CONNECT ON DATABASE faji_identity FROM PUBLIC;
GRANT CONNECT ON DATABASE faji_identity TO faji_identity;
SQL
echo 'GUEST: two isolated PostgreSQL 16 services ready with host-link TLS'
while true; do sleep 60; done
