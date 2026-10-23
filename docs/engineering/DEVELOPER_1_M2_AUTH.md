# Developer 1 — Milestone 2 identity and authorization

**Branch:** `feat/m2-d1-keycloak-auth-authorization` — implementation in progress, not accepted.

Implemented engineering increments:
- RS256 JWT/JWKS verification with exact Keycloak issuer and API audience, expiry and issued-at validation.
- Authentication and coarse-grained roles guards with negative security tests.
- Forward PostgreSQL migration `0002_identity_authorization.sql`: `account_access`, `resource_memberships`, `identity_security_events`.
- PostgreSQL-backed account suspension and access-token-issued-at revocation cutoff; resource membership checks scoped to business, branch or dispatch area.
- Protected `GET /api/v1/auth/me` endpoint requiring both validated bearer access token and active Faji account; no mock login or password collection.
- Disposable Keycloak realm template enabling email verification, reset password, public OIDC clients, and API audience mapper.

**Important boundaries:** Keycloak handles credentials and self-service login/recovery. Never implement password-grant login in NestJS. Controllers with protected actions must explicitly compose IdentityGuard, AccountGuard, and appropriate role/resource guards. Existing public health endpoints intentionally stay unauthenticated.

**Unresolved before acceptance:** resource membership approval/provisioning workflows and audit writing, full Keycloak realm import verification, secure PKCE client sessions, active session revocation/logout (JWT revocation cutoff alone is insufficient), MFA for privileged accounts, throttling and abuse controls, database integration on migration 0002, and full end-to-end verification. Do not mark milestone accepted or merge until these tests pass.

Unit/API verification command: `pnpm --filter @faji/api typecheck && pnpm --filter @faji/api lint && pnpm --filter @faji/api test && pnpm --filter @faji/api build`. The suite must be rerun locally on the exact commit; no successful execution is claimed in this document.
