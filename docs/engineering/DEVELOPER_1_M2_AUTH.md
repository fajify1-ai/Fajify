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
