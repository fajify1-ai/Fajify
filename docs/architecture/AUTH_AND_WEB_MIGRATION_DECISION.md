# Approved architecture decision — Better Auth and unified Next.js web

> **Client packaging clarification (2026-11-16):** The matrix below describes supported role surfaces and current development modules, **not separate user-facing app installations**. The approved target is one unified public Next.js web experience at `preview.fajify.com` and one unified Flutter Android/iOS application with Customer, Business, and Ride entry points; Ride is Coming Soon for the first release. Admin remains separate. See [unified client experience](UNIFIED_CLIENT_EXPERIENCE.md).


**Decision date:** 2026-11-16  
**Status:** Approved architecture; implementation is on the Better Auth continuation branch. Release gates remain open; see [acceptance report](../engineering/BETTER_AUTH_RELEASE_ACCEPTANCE.md).

## Authentication
Keycloak is removed from the active architecture. Better Auth is hosted within the Faji application backend, primarily integrated with NestJS, and persists authentication data in Faji PostgreSQL. Registration, login, password recovery, phone OTP, logout and session management are rendered and completed within each Faji application. No external system browser, hosted login page or browser-based OIDC redirect is part of the target journey. External message delivery for OTP or recovery does not imply an external login interface.

NestJS must validate the session or token presented to each protected API/WebSocket request and enforce all resource-scoped authorization: user status, business/branch memberships, driver eligibility, dispatcher scope, admin privileges, approvals and suspensions. UI-level checks are never sufficient. One account may hold customer, business staff, driver, dispatcher and admin roles. Authentication records, profiles and memberships share Faji PostgreSQL while retaining explicit ownership boundaries. The implementation uses a Drizzle PostgreSQL adapter, web session cookies and native bearer sessions. Phone delivery and safe identity claiming are described in [implementation documentation](../engineering/BETTER_AUTH_IMPLEMENTATION.md); real provider/device and staging acceptance remain release gates. MFA enrollment is optional; privileged operations may require proportionate step-up controls.

## Client platform matrix

| Application | Web | Native mobile |
| --- | --- | --- |
| Customer | Next.js / React / TypeScript | Flutter / Dart (Android, iOS) |
| Business | Next.js / React / TypeScript | Flutter / Dart (Android, iOS) |
| Ride & Dispatch | Next.js / React / TypeScript | Flutter / Dart (Android, iOS) |
| Administration | Next.js / React / TypeScript | Not in the approved mobile scope |

Flutter Web is not a supported deployment target.

## Documentation precedence and migration boundary
This decision, `docs/architecture/SYSTEM_ARCHITECTURE.md`, `docs/engineering/MILESTONES.md`, `docs/engineering/REPOSITORY_AND_DELIVERY.md` and `docs/roadmap/FOUR_PHASE_MODEL.md` define future implementation and acceptance. Earlier Keycloak, OIDC/PKCE, browser-redirect and Flutter Web instructions in dated milestone reports, implementation guides, PR notes, acceptance evidence, sample realm files and setup notes are **historical only**, not approved current instructions. Preserve their factual records and branch names without implying old tests validate Better Auth.

## Migration acceptance criteria
1. No running Keycloak dependency, realm/client configuration or hosted identity redirect in application runtime or deployment.
2. All four Next.js web surfaces and supported native Flutter apps complete in-app registration, login, recovery, phone OTP, logout and session lifecycle using Better Auth.
3. Better Auth schema and application domain data coexist safely in Faji PostgreSQL with versioned migrations, backup and recovery coverage.
4. NestJS rejects invalid, expired and revoked sessions/tokens and fails closed on missing memberships, unapproved roles, suspensions and cross-tenant requests.
5. Multi-role identity, optional MFA enrollment, privileged step-up policies and auditable administrative actions pass relevant tests.
6. Fajify is pre-launch with no real users; no identity migration or legacy-provider rollback is required. Preserve normal database backups, restore verification and application rollout safeguards.

## Pre-launch finalization

Fajify has no real users. Better Auth is the sole active provider. Account import/claiming, legacy password conversion and Keycloak-specific rollback are unnecessary and removed from release requirements. Applied SQL history remains immutable; normal backups/recovery remain mandatory. See [merge readiness](../engineering/BETTER_AUTH_MERGE_READINESS.md).
