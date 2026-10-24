# Milestone 2 — Keycloak lifecycle acceptance

**Status: partially verified; not yet accepted for merge.** The separate disposable PostgreSQL application-authorization acceptance passed at commit `d3ea70a`: 37/37 API and database tests, zero skips. The live Keycloak 26.8.1 acceptance at `039a0b718e3a8dbcd77bd9c790eb446022f9f547` passed discovery, imported client PKCE S256 restrictions, invalid-verifier rejection, browser-form Authorization Code, API audience, refresh, logout invalidating refresh tokens, outbound verification/recovery email capture, verification-link confirmation, password reset and login with the new password, and rejection of the previous password. These are distinct historical local test runs, not one consolidated final release gate.

## Phase 1 — Realm policy preflight

Run `bash tooling/verify-d1-m2-keycloak-realm.sh`. This checks that every Fajify mobile public client enforces authorization code with **S256 PKCE**, excludes password/direct grants and implicit grants, uses specific registered callbacks and maps the API audience. The check uses no Keycloak process and does **not** prove imported runtime settings.

## Phase 2 — Live disposable Keycloak runtime (executed for current scoped tests)

Provision **a separate temporary PostgreSQL instance for Keycloak** and use a pinned Keycloak 26.x installation. The scoped checks described above have been executed locally; additional acceptance gates below remain open. Run Keycloak exclusively on loopback, supply freshly generated administrator credentials, import `infrastructure/keycloak/realm-faji-m2.json`, and verify successful startup and OIDC discovery. Do not reuse the application's database, existing Keycloak services or permanent identity data. Official import documentation: https://www.keycloak.org/server/importExport.

## Remaining mandatory live gate before merge

1. Inspect imported clients through the authenticated administration API; fail if PKCE S256 is not enforced or password/implicit grants are enabled.
2. Run authorization-code PKCE using a system browser and registered redirect. Verify code challenges and that invalid verifiers cannot redeem a code.
3. Verify registration requires email verification, then complete verified login with disposable SMTP capture (no production email).
4. Verify reset-password messages and recovery using disposable email.
5. Verify refresh rotation, logout, and privileged administrative revocation; ensure old access tokens do not pass the Fajify API after effective revocation.
6. Require and demonstrate actual Keycloak MFA step-up flow for `platform-admin`, with ACR and `auth_time` claims matched to the Fajify privileged guard.
7. Verify account approval workflow, cross-tenant isolation, account suspension, throttling, and audit emission.
8. Record exact binary/image version, source SHA, logs, and pass/fail evidence; confirm both identity and application disposable databases are destroyed.

**Do not merge based solely on the policy preflight.** A signed JWT carrying a claimed ACR is not by itself evidence that Keycloak required MFA. Likewise, short-lived access tokens plus application cutoff checks do not establish global logout revocation without an authoritative integration.

## Current scoped evidence and gaps

- **Verified:** live Keycloak startup and realm discovery, registered public mobile-client PKCE checks, real browser-form Authorization Code exchange, token refresh and refresh-token invalidation on logout, verification email receipt and user-confirmed link processing, password recovery and new-password browser authentication with old-password rejection (commit `039a0b7`).
- **Not yet verified:** self-service registration form submission; privileged Keycloak MFA with real ACR/auth_time evidence; authoritative backend access-token revocation; account approval/suspension, cross-tenant isolation, throttling and audit within the integrated identity boundary. Earlier app database tests do not replace these live gates.
- **Scope:** loopback-only disposable Keycloak and PostgreSQL, synthetic accounts and SMTP capture. No production customer identity system was modified. The script cleans up its disposable Keycloak database and generated credentials after each run.
- **Next action:** engineer the remaining gates, repeat all relevant checks at a single exact source SHA, then review merge readiness. Do not mark the milestone accepted before that consolidated verification.
