# Unified Fajify client experience — approved delivery target

**Decision:** 2026-11-16. **Scope:** target product experience and implementation reconciliation; not a claim that the current separate app packages have already been consolidated.

## User-facing product boundaries

Fajify is **one customer-facing product** across each delivery platform:

- **One public web application**, initially hosted at `https://preview.fajify.com`. Its entry screen offers **Customer**, **Faji Business**, and **Faji Ride**.
- **One installable Flutter application** for Android (and subsequently iOS), with the same three entry points. A user must not need separate Customer, Business, or Ride installations.
- **Customer** and **Business** are active experiences, with role-aware navigation, registration, sign-in, and domain-specific workflows.
- **Ride** remains a branded **Coming Soon** entry in the first release. Do not expose unfinished driver, dispatch, or trip operations.
- **Administration** is a separate internal web console; the existing development hostname is `admin-dev.fajify.com`. It is not an entry point for ordinary public users.
- **One shared NestJS API** at `https://api.fajify.com`, using embedded Better Auth and PostgreSQL/PostGIS. Redis/BullMQ support backend operations.

One account may have multiple roles. Role selection changes the experience, not the identity provider; backend authorization enforces memberships, approvals, and scope. MFA enrollment remains optional, with privileged step-up as required. No Keycloak runtime or hosted identity redirect.

## Implementation boundary and migration

The repository currently has separate Next.js apps (`apps/customer_web`, `apps/business_web`, `apps/ride_dispatch_web`, `apps/admin_web`) and Flutter projects (`apps/customer_mobile`, `apps/business_mobile`, `apps/ride_dispatch`). **These are current engineering boundaries, not the approved number of installable/public applications.** The separate Flutter projects and web roots do not, by themselves, satisfy this decision.

Before changing code, inventory current routes, packages, approved designs, assets, session behavior, and tests. Choose a maintainable single public web entry/deployment and a single Flutter Android application/package, reusing existing feature modules. Define role switching, deep links, navigation, and session handling explicitly. Avoid duplicate implementations or silent loss of existing functionality. Keep Admin independent.

The existing screenshots and Figma exports are design references; preserve the approved entry experience: **Login as a user**, **Faji Business**, **Faji Ride** (Coming Soon). Web paths such as `/customer` and `/business` are proposals until routing is implemented and verified.

## Release and acceptance boundaries

- First release: shared backend; Customer and Business web experiences under `preview.fajify.com`; unified Flutter Android application after build, signing, and physical-device acceptance. Ride is Coming Soon.
- Public registration and password sign-in are required. Email/SMS delivery and their dependent verification/recovery flows are deferred; disabled flows must fail safely and must not claim delivery. Current backend production/staging SMTP startup requirement must be changed and tested before deployment without SMTP.
- Backups must not be confused with automated backup scheduling: validate an initial database backup/restore before real users are accepted.
- Do not claim unified web/mobile packaging, working DNS/TLS, or release readiness until verified by deployment and device tests.
- Current staging includes all four web containers for acceptance purposes; this is not the approved public deployment topology.

This document supersedes conflicting client packaging and deployment interpretations in older milestone plans, architecture diagrams, and per-app READMEs. Historical source code and documentation remain useful for reconciliation; do not reintroduce Keycloak.
