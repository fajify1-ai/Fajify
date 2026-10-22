# Fajify — Developer Ownership & Parallel Delivery

**Version 1.0 — Four workstreams.** The historical "Developer 3" role is now divided between **Developer 3A (Business)** and **Developer 3B (Ride & Dispatch)**. The team may refer informally to Developers 1–3, but execution has four independent owners.

## Role charters

### Developer 1 — Backend & Platform Engineering
- Owns apps/api (NestJS on Node.js, TypeScript) and apps/worker, domain/data packages, Keycloak integration, PostgreSQL/PostGIS, Redis/BullMQ, object storage and backend deployment boundaries.
- Defines OpenAPI contracts, authorization policies, tenant ownership, database migrations, state machines, payment/webhook workflows and cross-client integration fixtures.
- Provides endpoint examples and predictable error shapes so frontend teams can scaffold before backend completion.
- Does not own visual implementation of Business, Ride or Customer experiences.

### Developer 2 — Customer App & Customer Web
- Owns customer Flutter migration and application UI, customer Next.js web and the initial Flutter design tokens/contracts shared with 3A and 3B.
- Coordinates apps/customer_mobile, apps/customer_web, packages/flutter_design_system, and consumer-side shared API interfaces.
- Preserves suitable Faji branding and customer screens while replacing Firebase-oriented repositories with NestJS API calls and Keycloak login as new services become available.
- Customer screens should not independently decide pricing, booking confirmation or payment success.

### Developer 3A — Faji Business Flutter App
- Owns apps/business_mobile and merchant operational UI: merchant onboarding, branch/staff screens, dashboard, reservations/calendar, catalog/menu/services, orders, business notifications and eligible settlement/reporting views.
- Consumes Developer 1's typed APIs and the shared Flutter theming/auth pattern.
- Coordinates with Developer 2 to avoid divergent branding components and Developer 1 on authorization and merchant tenant context.

### Developer 3B — Faji Ride & Dispatch Flutter App
- Owns apps/ride_dispatch as **one role-aware Flutter app**, with both **Driver** and **Dispatcher** modes.
- Covers driver onboarding, verification, vehicle, online/offline, trip offers, acceptance, pickup/active/completed journeys, earnings and dispatcher queues/monitoring.
- Reuses shared UI/auth/API conventions and coordinates closely with Developer 1 on geolocation data, trip transitions and concurrency safeguards.

## Allocation across all milestones

| Milestone | Developer 1 — Platform | Developer 2 — Customer | Developer 3A — Business | Developer 3B — Ride & Dispatch |
| --- | --- | --- | --- | --- |
| **M1 Foundation** | NestJS/API/worker skeleton, Postgres/PostGIS baseline, workspace and verification | Import Customer Flutter, customer web shell, common design tokens, API interfaces | Business Flutter skeleton, dashboard/onboarding/reservation/menu shells | Ride/Dispatch Flutter skeleton, driver/dispatcher navigation and map/trip shells |
| **M2 Identity** | Keycloak, OIDC validation, RBAC and tenancy policies | Customer OIDC/PKCE sessions and login UX | Merchant login, staff permissions and business context | Driver/dispatcher login, role routing, session recovery |
| **M3 Business** | Merchant org/branch/catalog/availability APIs | Customer-side venue cards and read-only integration | Merchant onboarding, profile, staff, services, catalog and operations UI | Driver module maintenance; cross-team dependency review |
| **M4 Customer** | Discovery, reservation and order APIs | Customer Flutter/Next.js discovery, booking/order journeys | Merchant reservation/order management integration | Ride surfaces prepared for customer integration |
| **M5 Payments** | Payment provider, idempotency, webhooks, ledger, tickets | Checkout, customer tickets, refund visibility | Merchant ticket redemption, settlement/reporting UI | Ride fare/earnings contract preparation only where agreed |
| **M6 Planning** | Itinerary/recommendation and inventory APIs | Plan for Me UX, save/share plans and relevance | Business-curated packages and available offerings | Location/trip compatibility consultation |
| **M7 Ride & Dispatch** | Driver and dispatch APIs, PostGIS, location, assignments, lifecycle | Customer ride request, status and itinerary integration | Merchant pickup or dispatch integration only if specified | Driver and dispatcher end-to-end app flows |
| **M8 Operations** | Admin APIs, audit/observability, disputes, controls | Next.js admin dashboard and customer support views | Merchant support and moderation screens | Dispatch operations and incident-handling screens |
| **M9 Launch** | Security, backups, scaling, production deployment | Customer mobile/web UAT and releases | Business app UAT and release | Ride/Dispatch UAT and release |

**Note:** A milestone owner is accountable for the specified interface, not automatically the sole implementer. Shared features require reviewed API and ownership contracts.

## Shared interface ownership and handoffs

| Shared contract | Source of truth | Consumer(s) | Deliverable |
| --- | --- | --- | --- |
| API schema, errors, pagination | Developer 1 | All clients | Versioned API contract, mocks and examples |
| Database schema and transactions | Developer 1 | Backend only | Repeatable migration with rollback plan |
| Keycloak realm, roles, token claims | Developer 1 | D2, D3A, D3B | Role matrix and test identity fixtures |
| Faji Flutter design tokens | Developer 2 | D3A, D3B | Reusable theme + component naming guidance |
| Flutter API client/auth helpers | Developer 1 defines server contract; client contributors coordinate | D2, D3A, D3B | Typed interfaces, token lifecycle and errors |
| Business inventory/availability semantics | D1 + D3A | D2 | Approved published-offering, capacity and booking rules |
| Location/trip event semantics | D1 + D3B | D2, admin | Versioned events and state machine |
| Payment and ticket truth | D1 | D2, D3A, D3B where relevant | Idempotent workflows and server-verifiable status |

## Integration rules

1. Developers should create independent feature branches from the current approved base and open draft PRs early.
2. Parallel UI development may use clearly labeled local fixtures; every production-facing call should ultimately be bound to a reviewed API contract.
3. Customer, Business and Ride Flutter apps should share design tokens and auth conventions without being forced into a single Flutter application.
4. Neither a mock payment result nor a displayed booking/ride state should be considered an executed backend transaction.
5. Merge ownership remains subject to review, source license/asset rights and automated or locally recorded verification.
6. The original Flutter import lives in draft PR #1 until its separate acceptance gates pass.

See [Milestone 1 Parallel Kickoff](MILESTONE_01_PARALLEL_KICKOFF.md), [Milestones](MILESTONES.md), and [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md).
