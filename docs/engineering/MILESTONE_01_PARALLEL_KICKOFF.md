# Milestone 1 — Parallel Engineering Kickoff & Acceptance Plan

**Milestone:** Engineering Foundation & Infrastructure (phases 1.1–1.6). **Objective:** four teams can clone, build their own workspace, use consistent contracts and develop without waiting for every backend capability.

This milestone builds foundation and UI scaffolds only. A navigable screen is not a live reservation, checkout or ride service.

## Phase ownership and dependencies

| Phase | Scope | Primary owner | Coordination |
| --- | --- | --- | --- |
| 1.1 | Monorepo workspace conventions | D1 | All developers agree locations and tooling |
| 1.2 | Local development configuration | D1 | All developers specify SDK/runtime needs |
| 1.3 | PostgreSQL/PostGIS schema baseline | D1 | Domain questions from D2/3A/3B |
| 1.4 | NestJS API + worker foundation | D1 | Publish health, error and mock API schemas |
| 1.5 | Shared design and app skeletons | D2, D3A, D3B | Shared Flutter tokens and package boundaries |
| 1.6 | Verification, security and handoffs | D1 + all | Local build/test evidence per application |

## Developer 1 — Backend & Platform

### Tasks
1. Establish and document the monorepo naming conventions, Node.js and Flutter toolchain versions, task runners and non-secret environment configuration patterns.
2. Scaffold apps/api as a NestJS/TypeScript modular monolith with health, readiness, API versioning, centralized validation/error handling and placeholder feature modules.
3. Define PostgreSQL/PostGIS database migrations, local/staging connection conventions and initial domain naming; draft business, booking, customer and ride entity relationships.
4. Scaffold apps/worker for Redis/BullMQ with health/queue placeholders and a safe local fixture. Do not represent job execution as production-ready.
5. Publish API schema conventions: route names, request/response structures, pagination, status/error codes, authentication claim placeholders, idempotency expectations and contract mocks.
6. Define Keycloak integration seams (issuer/audience, token claims, roles and tenant context), without claiming completed authentication before M2.
7. Establish secrets handling, .env.example-style templates, local testing instructions and a single local verification entrypoint.
8. Prepare README/onboarding and diagrams that explain how frontend teams consume the backend.

### Milestone deliverables
- apps/api and apps/worker source foundations; PostgreSQL/PostGIS baseline migrations.
- OpenAPI/typed contract stubs and mocked reference responses; documented role/tenancy assumptions.
- Local startup and health checks; lint/typecheck/unit-test or equivalent validation logs.
- Security and contribution guidance, without real credentials.

## Developer 2 — Customer Flutter, Next.js Customer Web & Shared UI

### Tasks
1. Review draft PR #1's imported customer Flutter source at apps/customer_mobile and its provenance; do not silently replace copyrighted assets or declare it accepted.
2. Inventory existing Flutter screens and Firebase-specific repositories; preserve reusable navigation, theme and presentation while documenting implementation gaps.
3. Publish Faji tokens, typography, spacing, shared widget usage and component naming guidance in packages/flutter_design_system.
4. Organize feature-first customer modules: onboarding/auth, discover, venue, plan, reservations, tickets, account/settings and common widgets.
5. Scaffold customer_web as Next.js/TypeScript for public discovery and route/page metadata; use fixture data while API contracts are being developed.
6. Create safe client configuration and centralized endpoint/token-provider abstractions; Keycloak and actual PostgreSQL/NestJS behavior are subsequent integration work.
7. Confirm app navigation flows and accessibility/responsiveness using available Flutter/web tests.
8. Coordinate shared Flutter assets, navigation conventions and design tokens with D3A and D3B.

### Milestone deliverables
- Customer Flutter import reviewed, with outstanding migration risks recorded.
- Shared design contract and core reusable widgets.
- Customer app and web skeleton routes, fixture-driven screens and successful available toolchain checks.
- Documented replacement plan for legacy Firebase, not a Firebase deployment.

## Developer 3A — Business Flutter

### Tasks
1. Scaffold a standalone Flutter app in apps/business_mobile; keep its build independent of customer and ride apps.
2. Adopt agreed feature-first conventions and config, with modules for onboarding, dashboard, reservations/calendar, catalog/menus, orders, services, staff and profile.
3. Adopt shared Faji branding and Flutter tokens; avoid copying/diverging theme code.
4. Provide merchant invitation, sign-in and verification-status UI shells without implying live registration.
5. Build business dashboard, branch and staff management UI shells with explicit mock data.
6. Build reservation list, booking details and calendar shells and document expected merchant actions.
7. Build menu/services/catalog and orders interfaces; state which operations are placeholders.
8. Create role-aware navigation and typed API/auth seams matching D1's contracts; include run/build instructions and basic UI tests.

### Milestone deliverables
- Independently runnable Flutter Business application skeleton.
- Navigable merchant onboarding/dashboard/reservation/order/catalog/staff shells.
- Shared theme integration, client abstraction and local test evidence.

## Developer 3B — Ride & Dispatch Flutter

### Tasks
1. Scaffold a standalone Flutter application in apps/ride_dispatch, containing both driver and dispatcher roles.
2. Establish feature-first modules for driver onboarding, vehicle, dashboard, trip offers, active trip, earnings, account and dispatch queue.
3. Reuse the shared Faji design language and mobile UI components.
4. Create driver registration, license/vehicle document and verification-status screen shells with safe fixtures.
5. Create driver online/offline dashboard and earnings/history shells (mock state only).
6. Create trip offer, pickup, active trip and completed-trip UI/navigation states.
7. Create dispatcher dashboard, requests/assignments, driver/trip monitoring and exception-handling screens with role-aware routes.
8. Prepare map/location permission interface and D1 API/Keycloak integration seams; do not stream or store live precise location at this milestone.

### Milestone deliverables
- Independently runnable single Flutter Ride & Dispatch scaffold.
- Driver and dispatcher routes, screens, mock data, shared theming and documented build checks.
- No claim of live dispatching or real driver matching.

## Parallel execution plan

**Workstream A (D1):** publish API conventions, role claims, fixtures and baseline migrations early; frontend teams consume the contracts as a stable draft.

**Workstream B (D2):** inventory customer import, design tokens and web skeleton; share mobile components/naming with D3A/D3B.

**Workstream C (D3A):** scaffold merchant UX independently against stubbed business endpoints.

**Workstream D (D3B):** scaffold driver/dispatcher UX independently against stubbed ride endpoints.

**Integration checkpoint:** the teams review API field naming, error response conventions, role/tenant claims and shared UI tokens before wiring real services. Contract-breaking changes require coordinated PR review.

## Acceptance checklist

- [ ] Each application/worker designated for M1 has a committed scaffold or an explicitly documented unimplemented placeholder.
- [ ] Local developer setup does not require live secrets or production data.
- [ ] D1 publishes migration baseline, API response/error contract samples and server health endpoint.
- [ ] D2 publishes shared Faji Flutter tokens and documents the customer import's open risks.
- [ ] D3A builds/runs the Business Flutter shell; D3B builds/runs the role-aware Ride Flutter shell.
- [ ] Repository lint/typecheck/test/build entrypoints are documented; each owner provides evidence from an actual run (no assumed passes).
- [ ] Role-aware navigation does not equal verified authentication; backend ownership of booking/payment/dispatch is explicit.
- [ ] PRs are reviewed by relevant owners; no unverified production integration is merged.

**Current repository reality:** PR #1 contains an exact source-file import of the earlier Flutter customer app but remains draft, and legacy Firebase code still requires conversion. The planned NestJS and Flutter Business/Ride scaffolds are not declared implemented by this document.
