# Fajify — Four Parallel Engineering Phases

**Milestones:** M1–M9. **Structure:** exactly four workstream phases inside each milestone.

The canonical assignment matrix and naming conventions are maintained in [FOUR_PHASE_MODEL.md](../roadmap/FOUR_PHASE_MODEL.md). Phases are parallel delivery tracks rather than sequential dates.

## Phase ownership
1. **Phase 1 — Backend & Platform:** NestJS, PostgreSQL/PostGIS, Keycloak, REST/OpenAPI, queue jobs, payments, security, infrastructure and backend release verification.
2. **Phase 2 — Customer & Frontend:** Flutter customer and Next.js customer website, client authentication, shared UI, discovery, checkout, planning and testing.
3. **Phase 3 — Faji Business:** Business Flutter app, merchant identity/permissions, onboarding, menus/services, orders, reservations, earnings and merchant E2E.
4. **Phase 4 — Ride, Dispatch & Operations:** Combined Flutter Ride & Dispatch app, role-specific journeys, location, trips, dispatch/earnings, admin web UX and operational testing.

## Phase tasks for Milestone 1
- **M1-P1:** Workspace boundaries, NestJS versioned API, initial Postgres/PostGIS migrations, configurations, API contracts, health/logging, tests.
- **M1-P2:** Preserve imported Flutter customer app, audit existing screens, reusable components, navigation, customer web shell and typed API interfaces.
- **M1-P3:** Business app scaffold, branding, merchant entry, dashboard, services/menu, order/reservation module shells, mocks and tests.
- **M1-P4:** One Ride & Dispatch app with separate driver/dispatcher routes, trip/maps/earnings shells and admin web shell.

## Phase tasks for Milestone 2
- **M2-P1:** Real Keycloak realm with isolated Postgres, secure OIDC clients and API audience, NestJS verifier, auth contracts, role/resource guards, sessions/revocation, audits/MFA and acceptance evidence.
- **M2-P2:** Customer Flutter OIDC Authorization Code + PKCE, registration, recovery, session lifecycle, authenticated profile, secure Next.js OIDC and customer tests.
- **M2-P3:** Business authentication entry/sign-in, registration identity handoff, OIDC/PKCE, merchant scope checks, Business screen guards, customer/merchant switching and device tests. Business approval is M3.
- **M2-P4:** Driver/dispatcher OIDC, role segregation, protected journeys, session expiry/logout, admin web identity and MFA integration with Phase 1 policies, platform tests.

## Interface rules
- Phase 1 publishes versioned contracts, mock fixtures and backend authorization decisions.
- Phases 2–4 consume the published contracts and coordinate breaking API changes. UI-only route protection never substitutes for API authorization.
- Changes to tenancy, roles, payments, dispatch or database schema require Phase 1 review.
- PR acceptance must include phase ID, dependent commit/contract, tests, screenshots for UX, evidence and open blockers.
- Historical Developer-named documents and PRs are retained as immutable project history and not relabeled retroactively.

See [MILESTONES.md](MILESTONES.md) for all nine acceptance gates and [FOUR_PHASE_MODEL.md](../roadmap/FOUR_PHASE_MODEL.md) for M1–M9 assignments.
