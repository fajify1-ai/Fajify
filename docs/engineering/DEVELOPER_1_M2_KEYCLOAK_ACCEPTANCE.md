# Milestone 2 — Keycloak lifecycle acceptance

**Status: not yet accepted.** The disposable PostgreSQL application-authorization acceptance passed at commit `d3ea70a`: 37/37 API and database tests, zero skips. Keycloak lifecycle tests were **not** run.

## Phase 1 — Realm policy preflight

Run `bash tooling/verify-d1-m2-keycloak-realm.sh`. This checks that every Fajify mobile public client enforces authorization code with **S256 PKCE**, excludes password/direct grants and implicit grants, uses specific registered callbacks and maps the API audience. The check uses no Keycloak process and does **not** prove imported runtime settings.

## Phase 2 — Live disposable Keycloak runtime (not yet executed)

Provision **a separate temporary PostgreSQL instance for Keycloak** and use a pinned Keycloak 26.x installation. Run Keycloak exclusively on loopback, supply freshly generated administrator credentials, import `infrastructure/keycloak/realm-faji-m2.json`, and verify successful startup and OIDC discovery. Do not reuse the application's database, existing Keycloak services or permanent identity data. Official import documentation: https://www.keycloak.org/server/importExport.

## Mandatory live gate before merge

1. Inspect imported clients through the authenticated administration API; fail if PKCE S256 is not enforced or password/implicit grants are enabled.
2. Run authorization-code PKCE using a system browser and registered redirect. Verify code challenges and that invalid verifiers cannot redeem a code.
3. Verify registration requires email verification, then complete verified login with disposable SMTP capture (no production email).
4. Verify reset-password messages and recovery using disposable email.
5. Verify refresh rotation, logout, and privileged administrative revocation; ensure old access tokens do not pass the Fajify API after effective revocation.
6. Require and demonstrate actual Keycloak MFA step-up flow for `platform-admin`, with ACR and `auth_time` claims matched to the Fajify privileged guard.
7. Verify account approval workflow, cross-tenant isolation, account suspension, throttling, and audit emission.
8. Record exact binary/image version, source SHA, logs, and pass/fail evidence; confirm both identity and application disposable databases are destroyed.

**Do not merge based solely on the policy preflight.** A signed JWT carrying a claimed ACR is not by itself evidence that Keycloak required MFA. Likewise, short-lived access tokens plus application cutoff checks do not establish global logout revocation without an authoritative integration.
