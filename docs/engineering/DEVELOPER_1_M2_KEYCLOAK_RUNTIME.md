# Live Keycloak runtime — isolated discovery/import smoke

Run `FAJI_KEYCLOAK_HOME=/absolute/path/to/keycloak-26.x bash tooling/run-d1-m2-keycloak-disposable.sh` after extracting an official Keycloak 26 distribution. Requires PostgreSQL 16 installed; no Docker. The distribution is copied into a temporary directory, Java heap capped, and a private PostgreSQL identity-only cluster is created on loopback with random credentials. A strict exit trap stops services and removes the test directory. It uses no persistent Fajify database.

This smoke validates **actual Keycloak startup, realm import and OIDC discovery**, not login or MFA. The full lifecycle gate in `DEVELOPER_1_M2_KEYCLOAK_ACCEPTANCE.md` remains mandatory.

Keycloak 26 docs: https://www.keycloak.org/server/configuration and https://www.keycloak.org/server/importExport.
