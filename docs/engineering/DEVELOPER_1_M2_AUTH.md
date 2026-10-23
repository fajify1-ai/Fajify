# Developer 1 — Milestone 2 identity and authorization

**Branch:** `feat/m2-d1-keycloak-auth-authorization` — implementation underway, not accepted.

Implemented:
- RS256 JWT verification against exact Keycloak realm issuer and API audience; malformed/forged/expired tokens fail closed.
- Injectable identity guard and coarse role guard with negative unit tests.
- Forward migration `0002_identity_authorization.sql` for `account_access`, `resource_memberships`, and `identity_security_events`.
- Database-backed suspension and `revoked_after` checks (requires validated JWT `iat`) and server-side resource membership guard.
- Disposable Keycloak realm import template enabling verified registration, reset password, application client identities and API audience mapping.

**Important security boundaries:** callers must explicitly compose `IdentityGuard`, `AccountGuard`, `RolesGuard` and/or `ResourceGuard` for protected controllers. The guards are available but not yet bound to production domain endpoints; framework route decorators alone are not a complete access-control gate. Keycloak manages passwords/registration and recovery; the backend must not impersonate an identity provider.

**Outstanding implementation/verification:** integrate guards with protected API routes, account sync/provisioning, authoritative role assignment and approval, access-token/session revocation, audit events, rate limits, privileged MFA, live login/logout/refresh/verified-email testing, environment-specific client redirects and hosted Keycloak database isolation. JWKS cache makes a revoked or logged-out otherwise valid JWT potentially acceptable until expiry unless short-lived tokens and an authoritative revocation/session gate are implemented. Account suspension rows do not automatically synchronize from Keycloak.

Never merge or declare M2 accepted until all required gates have been executed successfully in a disposable environment.
