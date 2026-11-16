#!/bin/sh
# Generates private sandbox credentials only; does not start or publish services.
set -eu
cd "$(dirname "$0")"
[ ! -e .secrets ] || { echo '.secrets already exists; refusing to overwrite credentials'; exit 1; }
umask 077
mkdir .secrets
for name in db_owner_password db_migrator_password db_runtime_password redis_password better_auth_secret sms_webhook_secret; do openssl rand -hex 32 > ".secrets/$name"; done
printf '%s\n' 'smtp://mailpit:1025' > .secrets/smtp_url
openssl req -x509 -newkey rsa:2048 -sha256 -days 3 -nodes -keyout .secrets/tls.key -out .secrets/tls.crt -subj '/CN=faji.test' -addext 'subjectAltName=DNS:api.faji.test,DNS:customer.faji.test,DNS:admin.faji.test,DNS:business.faji.test,DNS:dispatch.faji.test' >/dev/null 2>&1
# Host directory is 0700; file secrets must be readable by container service UIDs.
chmod 0444 .secrets/*
echo 'Private sandbox files generated. Review staging runbook before starting anything.'
