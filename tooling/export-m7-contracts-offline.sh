#!/usr/bin/env bash
# Generate the M7 OpenAPI contract without external services or real credentials.
# These URLs point at local ports without a running service. Metadata export
# must not query any database, Redis, identity provider or object store.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == "feat/m7-p1-ride-dispatch-backend" ]] || {
  echo "M7 contract export requires the M7-P1 development branch" >&2
  exit 2
}
(
  unset PAYSTACK_SECRET_KEY PAYSTACK_PUBLIC_KEY PAYMENT_CALLBACK_URL
  export NODE_ENV=test
  export FAJI_DATABASE_URL='postgresql://contract_only:noncredential@127.0.0.1:1/contracts_only'
  export REDIS_URL='redis://127.0.0.1:1'
  export KEYCLOAK_ISSUER='http://localhost:8080/realms/faji'
  export KEYCLOAK_AUDIENCE='faji-api'
  export S3_ENDPOINT='http://localhost:9000'
  export S3_BUCKET='faji-contracts-only'
  corepack pnpm --filter @faji/api contracts
)
echo 'M7 OpenAPI contract exported. Review packages/api_contracts/openapi.json before committing.'
