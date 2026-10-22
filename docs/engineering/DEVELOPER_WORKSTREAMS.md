# Faji — Developer Workstreams and Parallel Delivery
**Status:** Engineering execution allocation | **Milestones:** M1–M9

## Ownership and collaboration
- **Developer 1 — Backend & Platform:** NestJS modular backend, Postgres/PostGIS schemas/migrations, Keycloak authorization, OpenAPI, infrastructure, integrations, background jobs, payments/ledger, observability and deployment gates.
- **Developer 2 — Customer & Frontend:** customer Flutter migration and UI, reusable Flutter design system, customer Next.js website, customer authentication, discovery, checkout, planning, tickets, ride integration and customer release testing.
- **Developer 3 — Business & Mobility:** merchant/business applications, driver/dispatcher experience, merchant finances, operational admin UI and cross-domain workflows.
- **Developer 3A (M1 subdivision):** Faji Business scaffolding, branding, routing, merchant dashboard and module screens.
- **Developer 3B (M1 subdivision):** Faji Ride & Dispatch scaffolding, driver and dispatcher route segregation, navigation, trip/earnings module shells.

The 3A/3B subdivision represents parallel execution of Developer 3's responsibility; it does not change the three primary owner roles. Coordination is by explicit API contracts, test fixtures and bounded package ownership.

## Nine-milestone responsibility matrix
| Milestone | Developer 1 — Backend & Platform | Developer 2 — Customer & Frontend | Developer 3 — Business & Mobility |
| --- | --- | --- | --- |
| **M1 Engineering Foundation** | NestJS, PostgreSQL/PostGIS, monorepo/API tooling | Import Flutter customer code, refactor reusable UI, routing | Business and Ride app scaffolds; 3A / 3B |
| **M2 Identity & Security** | Keycloak, authentication APIs, roles and permissions | Customer sign-up/login, token/session integration | Merchant, driver, dispatcher sign-in and scopes |
| **M3 Faji Business** | Merchant APIs, schemas, state rules | Customer-facing venue components | Merchant onboarding, dashboard, service and order operations |
| **M4 Faji Customer** | Discovery, booking and order APIs | Flutter customer app and Next.js customer web | Customer/merchant booking and order integration |
| **M5 Payments & Ticketing** | Paystack/Flutterwave integration, independent verification, ledger | Checkout, tickets, payment UX | Merchant earnings, settlements, payout views |
| **M6 Experience Planning** | Matching/ranking engine, plan APIs, persistence | Plan for Me, Browse Plans, recommendations | Merchant packages, capacity and experience configuration |
| **M7 Ride & Dispatch** | Dispatch engine, trip state, location APIs | Customer ride booking and tracking | Driver/dispatcher application, trips and earnings |
| **M8 Administration & Integration** | Admin APIs, scoped authorization, audits | Customer integration and cross-domain consistency | Admin dashboard, operational management and support |
| **M9 Production & Launch** | Backend integration/security/performance/recovery gates | Mobile/web E2E, accessibility and store readiness | Business/Ride E2E, real-device GPS and operational pilot readiness |

## Milestone 1 — executable task breakdown
### Developer 1
1. Establish the GitHub monorepo and application/package boundaries.
2. Initialize NestJS modules and versioned REST/OpenAPI foundation.
3. Provision local PostgreSQL + PostGIS; define migration workflow and starter schema.
4. Establish development, staging and production configuration **templates** (commit no actual secrets).
5. Add health/readiness routes, centralized validation, error responses, correlation IDs and logs.
6. Prepare Keycloak realm/client configuration and OIDC middleware interfaces (complete auth integration in M2).
7. Document setup, package boundaries and backend conventions.
8. Configure formatting, linting, unit tests, Dockerfiles and reproducible local compose configuration.

**Proof:** API starts and health check passes, database migration succeeds, API docs generate, services start from documented instructions, baseline checks pass.

### Developer 2
1. Import and preserve reusable code from the existing customer Flutter repository without modifying the source repository.
2. Resolve Flutter dependencies and record import provenance and build results.
3. Move customer code to the agreed `apps/customer_mobile` boundary.
4. Catalogue the existing screens, user journeys and reusable widgets.
5. Extract shared design tokens, buttons, inputs, cards, dialogs and state patterns into an agreed shared Flutter package.
6. Set app identifiers/assets, navigation and deep-linking; implement customer home, bookings and profile shells.
7. Refactor high-priority screens and remove unused assets/dependencies only after review.
8. Add typed API client interfaces and Keycloak OIDC integration points for M2; document local run and tests.

**Proof:** imported customer application builds; routes operate with mock data; reusable components are documented; auth/API boundaries are testable without a live backend.

### Developer 3A — Faji Business
1. Initialize `apps/business_mobile` Flutter project and documented package IDs.
2. Define merchant feature modules, shared/core/services/models layout.
3. Apply Faji branding, typography and optional light/dark theming.
4. Reuse shared components for buttons, cards, forms and dialogs.
5. Build merchant navigation and role-aware guards.
6. Scaffold onboarding/login, dashboard, reservations, orders, menu/services, earnings and profile.
7. Prepare Keycloak service abstractions and API placeholders for M2.
8. Configure environment templates, app icons/splash/assets; document setup.

**Proof:** merchant UI builds/runs locally, all key routes are navigable and use mock data, no real secrets committed.

### Developer 3B — Faji Ride & Dispatch
1. Initialize one Flutter Ride & Dispatch application at `apps/ride_dispatch` (not separate driver and dispatcher products).
2. Organize driver, dispatcher, shared, core and services modules.
3. Apply common branding and reusable controls, including map placeholders.
4. Implement role-specific router/navigation, without relying on UI-only authorization.
5. Scaffold driver onboarding, dashboard, active trip, history, earnings, profile.
6. Scaffold dispatcher dashboard, driver management, active trips and profile.
7. Prepare Keycloak/API client interfaces, with only mock data in M1.
8. Document environment/assets/setup and runnable smoke tests.

**Proof:** one app runs both role flows using mock state and consistent shared components; navigation and future backend integration points are documented.

## Cross-team integration contract
- **D1 publishes:** API namespaces, request/response schemas, error codes, mock fixtures, identity subject contract, module ownership, migration changes.
- **D2 and D3 consume:** generated/centrally maintained clients, mock data aligned with OpenAPI; report breaking changes before integrating.
- Shared UI component changes require API-free design system boundaries and review to avoid breaking multiple apps.
- Changes to auth, payment amounts, settlement rules, booking capacity, dispatch assignment or tenancy require Developer 1 review and specific tests.
- Record dependencies and acceptance evidence in PRs; one developer's blocked integration does not stop independent UI scaffolding.

## Pull request requirements
Every change identifies milestone and developer owner, affected applications/modules, behavior and failure cases, API/schema impact, tests executed, screenshots for UI work, migration/rollback notes where applicable and security/secret checks. Do not merge incompatible API/schema changes before related consumers are prepared. A checked box in a planning graphic is an expected outcome, not evidence of work already completed.
