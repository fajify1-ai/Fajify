# Parallel development and workspace ownership

Fajify delivers each milestone via **four concurrently owned phases**. See [the canonical phase allocation](../roadmap/FOUR_PHASE_MODEL.md).

| Phase | Primary workspace | Responsibility |
| --- | --- | --- |
| Phase 1 — Backend & Platform | `apps/api/`, `apps/worker/`, `packages/database/`, `packages/api_contracts/`, `infrastructure/` | Auth, data, APIs, providers, infrastructure and shared backend verification |
| Phase 2 — Customer & Frontend | `apps/customer_mobile/`, `apps/customer_web/`, Flutter/web shared UI | Customer journeys and platform integrations |
| Phase 3 — Faji Business | `apps/business_mobile/` | Business application, merchant workflows |
| Phase 4 — Ride, Dispatch & Operations | `apps/ride_dispatch/`, `apps/admin_web/` | Driver/dispatcher flows and administration experience |

## Branches and PRs

- New work uses phase-based branch names, e.g. `feat/m2-p1-keycloak-auth`, `feat/m2-p2-customer-auth`, `feat/m2-p3-business-auth`, `feat/m2-p4-ride-auth`.
- PR titles use `M2 · Phase 2 · Customer authentication`. Describe scope, owner, API/schema changes, test and device evidence, blockers and review gates.
- The existing `feat/m2-d1-keycloak-auth-authorization` and Milestone 1 feature branches **remain untouched**; replace conventions only on new contributions. Do not rewrite historical PRs or Git attribution.
- Contracts come from Phase 1; clients use mock fixtures until live backend gates pass. All protected actions require server-side authorization.
- Coordinate shared UI and contract changes; isolate work in phase-owned directories.
- Each phase requires passing affected tests and reviewed changes before merge. Parallel progress does not imply integrated release acceptance.

## Development environments

TypeScript workspaces use Node/pnpm; Flutter workspaces use Flutter/Dart. Development may use disposable local Postgres/Keycloak/test services; never commit live credentials. Build, static analysis, migration, integration and physical-device checks remain scoped to affected components. Refer to [engineering standards](REPOSITORY_AND_DELIVERY.md).
