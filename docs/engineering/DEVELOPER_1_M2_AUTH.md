# Developer 1 — Milestone 2 identity and authorization

**Status: implementation in progress, not accepted.** Branch: `feat/m2-d1-keycloak-auth-authorization`.

Implemented:
- RS256 JWT verification against exact issuer and API audience; expiry/issued-at validation.
- Coarse role guards, server-side account suspension and resource membership guards.
- Forward migration `0002_identity_authorization.sql` for account access, resource memberships and audit events.
- Protected `GET /api/v1/auth/me`, requiring validated identity and active account.
- Trusted internal access service methods for fail-closed provisioning (new accounts suspended), suspension/reinstatement with token revocation cutoff, and resource membership changes. All writes are transactional with an audit event in the same database transaction. **These internal commands are not public HTTP endpoints and require authoritative administrator or approval workflow checks before invocation.**
- Development Keycloak realm template and mobile client audience mappings.

Still required before acceptance:
- Verify local migration 0002 with real PostgreSQL and privilege boundaries.
- Implement a trusted Keycloak-to-Faji provisioning path; never trust arbitrary callers or automatic privilege assignment.
- Wire server-side admin approval workflows, privileged MFA checks and subject/session revocation against Keycloak.
- Run actual disposable Keycloak PKCE registration, email verification, recovery, refresh, logout, revocation and MFA tests.
- Wire domain endpoints to identity, account, role and resource guards; add rate limits and operational security event monitoring.
- Re-run all API/backend suites and security checks on exact branch commit with zero required skips.

`main` and mobile workspaces are outside this branch's intended change scope.

## Strict account-access invariant

A legacy `user_profiles` row alone never authorizes protected routes. Both `account_access` and `user_profiles` must exist and be unsuspended; absent rows deny access. This prevents previously imported customer identities from becoming active without explicit approval. This increment adds negative unit tests but has not been locally verified yet.

## Revocation integration increment (pending verification)

A disposable PostgreSQL-backed HTTP acceptance test now exercises `GET /api/v1/auth/me` with an injected verified identity, a real `AccessService` and real PostgreSQL account-state updates. It checks approved access, immediate denial after suspension, and continued denial after reinstatement using the previously issued identity. The test also checks suspension/reinstatement audit events. Run it only against the disposable migration/runtime database environment; it intentionally does not start or modify permanent services.

**Evidence boundary:** the injected verifier tests the database/HTTP authorization boundary, not Keycloak signature verification. The final combined gate must also present a real Keycloak-signed token to the API and demonstrate revocation. This increment has not yet passed a local test run.
