# Phase 1 — Milestone 2: Keycloak acceptance evidence and remaining gates

**Status:** customer authentication passed at commit `5e831b4d5d542998a65a773ec6edf097006bd71e` on a disposable Keycloak 26.8.1 / PostgreSQL 16 environment. The latest authorization/security commits have **not** yet passed consolidated acceptance. An automated synthetic administrator TOTP challenge-and-token test has been added to the disposable Keycloak runner, but remains unexecuted.

## Accepted customer lifecycle

The exact disposable acceptance run at `5e831b4` logged PASS for public self-registration, verification email capture, confirmation, enrollment of first password, first login using browser Authorization Code + S256 PKCE, refresh and logout, recovery mail, new-password authentication, old-password rejection and test cleanup. These are scoped identity lifecycle results, not evidence that onboarding approval, privileged MFA or token revocation passed.

## Pending privileged identity and API authorization gate

The realm now defines `faji-admin-web`, a dedicated browser flow mandating username/password and OTP, an ACR mapping for `faji-mfa`, and a client binding. The API privileged guard requires this client's signed `azp`, `platform-admin`, matching `acr`, and recent `auth_time`. Mandatory real-world checks:
- Import the realm into Keycloak 26.8.1, check Admin REST execution requirements, then perform a **browser authorization flow with OTP**. Confirm no password-only token satisfies privileged guard and OTP-issued token does.
- Validate actual `azp`, `acr` and `auth_time` of signed JWTs without logging tokens or secrets.
- Run newly committed database-backed HTTP guards with PostgreSQL 16 and verify outstanding static and runtime tests; then repeat using a real Keycloak-signed token.
- Verify suspension and reinstatement deny previously issued access tokens, while refresh/session invalidation and remaining admin access controls are confirmed.
- Confirm scoped merchant approval/membership contracts, missing-account denial, cross-tenant isolation, brute-force handling and audit records.

## Consolidated verification

`FAJI_KEYCLOAK_HOME="$HOME/Downloads/keycloak-26.8.1" bash tooling/verify-phase1-m2-consolidated.sh`

The runner performs existing scoped automated gates, not all of the additional live admin and signed-token acceptance checks listed above. Until those checks pass, this milestone is not accepted for merge. Do not operate on production identity databases or live customer accounts.
