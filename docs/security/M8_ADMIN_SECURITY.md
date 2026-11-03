# M8-P1 Administrative Security and Failure Model

**Status:** Engineering design/implementation; real Keycloak and deployment acceptance pending.

## Trust boundaries
- Keycloak owns the signed issuer/audience/subject, `platform-admin` role, authorized admin web party, MFA ACR and authentication time. Application Postgres owns account suspension/revocation, explicitly scoped grant decisions, business records and operational history. UI route checks are not an authority.
- All M8 routes use identity, active account/session, privileged recent MFA, explicitly granted M8 scope(s), and PostgreSQL-backed budget guards. Scope DB outage is fail-closed. Revenue reports require two scopes.
- Operator grants are made outside runtime, with human review. The runtime cannot modify scope grant rows. Grant changes have append-only audited history and cannot be deleted or retargeted.

## Adversarial and negative cases
- Anonymous/weak MFA/wrong `azp`/wrong role/expired elevated authentication/suspended or revoked actor → denied.
- Active admin without an exact scope (or without one of both financial report scopes) → denied.
- Different request payload with reused actor/request key → conflict, not replayed mutation. Same exact request returns the prior JSON-safe response.
- Concurrent moderation and merchant reactivation → database-level restricted flag prevents merchant bypass. Lifting a restriction restores the merchant's former enabled/publication value.
- Admin acting on their own review or self-owned merchant resource → denied.
- Case escalation to an inactive/unauthorized assignee → denied. Closed case reply → denied. Public customer messages remain owner-visible, with admin author attribution not leaked through legacy M4 customer read projections.
- Forbidden incident transition or attempt to resolve a still-active monitored failure → denied.
- Missing provider evidence → no financial capture/settlement success inferred. No M8 service moves money directly.
- Audit/command rows are append-only. Sensitive provider credentials, OTP, ticket QR, message bodies and raw provider payloads are not included in M8 operation history or command replay receipts.

## Threat and operational risks still requiring verification
- Real Keycloak MFA assurance and admin session/auth-time mappings, configuration of `platform-admin`/admin client, and operator grant process.
- Existing M3/M5 admin commands retain their legacy privileged authorization until coordinated dual-scope migration. Do not describe M8 granular scopes as globally applied to historical admin APIs yet.
- PostgreSQL runtime currently serves several modules; verify least privileges and avoid unreviewed raw SQL access. No claimed row-level security on pooled global-administrator reads.
- Database backup/restore, incident response exercises and tamper recovery. SQL-level database superusers remain an ultimate trust boundary.
- Finance reporting and outbox monitoring require operational dashboards and manual reconciliation; an unconsumed outbox row is not evidence of an externally delivered alert.
- M7 draft delivery, user consent, driver eligibility and location privacy must clear before implementing live booking-to-ride or order-to-delivery handoff.

Acceptance: strict typecheck/lint/build, generated additive OpenAPI, synthetic HTTP negative tests, isolated restricted PostgreSQL migrations and replay, transactional/concurrency/idempotency checks, finance/identity contract review and explicit release authorization. A draft PR is never an accepted release.
