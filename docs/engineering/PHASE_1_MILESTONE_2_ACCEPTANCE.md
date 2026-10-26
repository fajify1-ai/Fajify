# Phase 1 — Milestone 2: Engineering and consolidated acceptance

**Branch:** `feat/m2-d1-keycloak-auth-authorization`  
**Status:** engineering increment committed; acceptance NOT YET RUN.

## Scope implemented

- Keycloak public mobile clients use Authorization Code + PKCE S256; dedicated `faji-admin-web` client binds a browser flow requiring username/password and OTP (no cookie-only shortcut). The privileged NestJS guard additionally requires the signed access token's `azp=faji-admin-web`, `platform-admin` role, `acr=faji-mfa`, and `auth_time` within five minutes. The realm import and actual OTP-generated ACR must be confirmed against Keycloak 26.8.1. The live OTP browser acceptance test is now included in the Keycloak runner, but has not yet executed.
- `POST /api/v1/auth/enroll` provisions the verified JWT subject in PostgreSQL as pending/suspended; it grants no account access or roles.
- `POST /api/v1/admin/accounts/:subject/suspension` performs approval/reinstatement and suspension through the guarded and audited PostgreSQL service.
- `GET /api/v1/auth/me` enforces verified JWT and active PostgreSQL account. Suspension cutoff prevents previous tokens from working even after reinstatement.
- Resource membership lookups now additionally require both account and profile to be active. Cross-resource isolation stays in the existing role/resource guards.
- Disposable PostgreSQL-backed HTTP tests cover both a synthetic verified identity and an independently RSA-signed token, including suspension/reinstatement denial.
- The combined disposable Keycloak 26.8.1 test now constructs a synthetic administrator and OTP credential, verifies password-only denial, performs TOTP/PKCE login, and submits that **real Keycloak-signed token** to a NestJS HTTP API connected to a separate disposable PostgreSQL application database. The token must authorize an admin approval before suspension and fail afterward.
- A PostgreSQL-serialized quota limits privileged API mutations to 20 per actor per minute, with event records and an indexed lookup. The guard fails closed if the database is unavailable.
- Repeated onboarding enrollment no longer emits duplicate provisioning audit events. The Keycloak default role includes `customer` only; elevated roles remain explicitly provisioned.
- Privileged scoped-membership creation/withdrawal is exposed only behind signed token, active account, authorized admin client, MFA and rate checks.

## One consolidated verification

On the developer workstation with PostgreSQL 16, PostGIS, Node 22, Corepack/pnpm and Keycloak 26.8.1 already installed:

```bash
cd ~/Desktop/project/Fajify
git fetch origin
git switch feat/m2-d1-keycloak-auth-authorization
git pull --ff-only
FAJI_KEYCLOAK_HOME="$HOME/Downloads/keycloak-26.8.1" bash tooling/verify-phase1-m2-consolidated.sh
```

This sequence runs static Keycloak policy checks, disposable PostgreSQL/API migrations/typechecking/tests, and disposable Keycloak 26 customer plus privileged TOTP acceptance, including a Keycloak-signed JWT reaching a NestJS HTTP API connected to separate temporary application PostgreSQL storage. These sub-runners clean up temporary state and do NOT use production data. Record source SHA and any error output. No pass is claimed until actually executed.

## Mandatory additional release acceptance

A configured MFA flow is not equivalent to proof of MFA. Before acceptance, a **real** `platform-admin` must log in via `faji-admin-web`, complete OTP, and obtain signed token claims `azp=faji-admin-web`, `acr=faji-mfa`, and fresh `auth_time`; a password-only request must be denied. Likewise a real Keycloak-signed token, not the injected-verifier database test, must pass through `/auth/me` then be rejected upon suspension and after reinstatement. Review Keycloak session-level revocation, quota events, cross-tenant authorization on actual domain controllers, and merchant/business verification criteria separately. These are not inferred from the authentication test.

**Never merge into main until the real security acceptance evidence exists.** Admin MFA may need additional realm-specific ACR mapping once observed in the imported runtime.

## 2026-10-26 Keycloak startup diagnostic and correction

The first consolidated run at `129a4f3` passed all 60 API tests, lint, typecheck, build and migrations, then failed starting Keycloak with `Unable to resolve auth flow binding override for: browser`. The realm client override referenced a flow **alias** instead of its dynamically assigned **UUID**. The realm template now leaves the admin override unset during import; after Keycloak boots, the disposable acceptance script discovers the imported flow UUID, configures the `faji-admin-web` browser override via Keycloak Admin REST API, and confirms the binding. This avoids realm-import failure while keeping the password-plus-OTP requirement. The correction is awaiting a new live test run.
