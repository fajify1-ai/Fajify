# Developer 1 — Milestone 2 identity and authorization

**Branch:** `feat/m2-d1-keycloak-auth-authorization` — engineering in progress, not accepted.

## First implementation increment
The NestJS IdentityModule now supplies an RS256 Keycloak JWT/JWKS verifier when both `KEYCLOAK_ISSUER` and `KEYCLOAK_AUDIENCE` are configured. It retains fail-closed behavior without configuration. The verifier pins the exact issuer and API audience, requires subject/expiry, rejects future not-before timestamps, verifies RSA signatures using the Keycloak realm's JWKS endpoint, and extracts realm/client roles for *claims only*. Resource ownership must always be checked server-side against application memberships.

JWT verification alone does not establish session revocation or account suspension. Until those checks, Keycloak realm/client provisioning, secure PKCE login/session integrations, role-scoped endpoints, rate limiting, audit logging and disposable integration verification are implemented and tested, **Milestone 2 must not be accepted or merged**.

## Implementation notes
- Keycloak issuer example: `https://identity.example.com/realms/faji`
- Audience: `faji-api`; API access tokens must be configured to include this audience.
- No client secret is required to validate access tokens. Confidential client secrets belong only in appropriately protected server-side configuration.
- Do not trust client-submitted roles, user IDs, tenants or account status.
- The separate Keycloak PostgreSQL database remains owned by Keycloak.
- JWKS retrieval is bounded and cached briefly; failed lookups deny access.
- Local static/unit checks: `pnpm --filter @faji/api typecheck && pnpm --filter @faji/api test`.
- Mandatory remaining milestone verification: actual disposable Keycloak realm, PKCE/login/logout/revocation/MFA and permission/suspension negative tests, no required skips, security audit.
