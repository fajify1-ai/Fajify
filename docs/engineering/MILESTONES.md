# Faji — Nine-Milestone, 63-Phase Engineering Programme

**Version 1.0.** This is a delivery programme, not a list of implemented features. Work can proceed in parallel subject to contract dependencies and verification gates.

| Milestone | Focus | Phases | Primary workstreams |
| --- | --- | ---: | --- |
| M1 | Engineering Foundation & Infrastructure | 6 | D1 + D2 + D3A + D3B |
| M2 | Identity, Access & Platform Security | 6 | D1 |
| M3 | Faji Business | 7 | D3A + D1 |
| M4 | Faji Customer | 8 | D2 + D1 |
| M5 | Payments, Ticketing & Financial Operations | 6 | D1 + D2 + D3A |
| M6 | Experience Planning & Personalization | 5 | D2 + D1 + D3A |
| M7 | Faji Ride & Dispatch | 10 | D3B + D1 |
| M8 | Administration, Integration & Operations | 7 | D1 + D2 + D3A + D3B |
| M9 | Production Readiness & Launch | 8 | All |

**Total: 9 milestones / 63 phases.**

## Milestone 1 — Engineering Foundation & Infrastructure

**Primary workstreams:** D1 + D2 + D3A + D3B

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 1.1 | Monorepo structure and workspace conventions | D1 |
| 1.2 | Local environments, configuration templates and tooling | D1 |
| 1.3 | PostgreSQL/PostGIS base schema and migration strategy | D1 |
| 1.4 | NestJS API and BullMQ worker skeletons | D1 |
| 1.5 | Flutter/Next.js design foundation and client scaffolds | D2 + D3A + D3B |
| 1.6 | Repeatable verification, repository security and onboarding docs | D1 + all |

**Milestone acceptance:** Every owned app has a buildable skeleton or an explicitly documented placeholder; shared contracts, migration process and local verification commands are published.

## Milestone 2 — Identity, Access & Platform Security

**Primary workstreams:** D1

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 2.1 | Keycloak environment and realm/client configuration | D1 |
| 2.2 | Identity and role/tenant claims design | D1 |
| 2.3 | OIDC/PKCE clients for Flutter and Next.js | D2 + D3A + D3B |
| 2.4 | NestJS authentication and authorization guards | D1 |
| 2.5 | Customer, merchant, driver, dispatcher and staff lifecycle | D1 + all |
| 2.6 | Security, session failure and cross-tenant access tests | D1 + all |

**Milestone acceptance:** Each role signs in to an isolated test environment, owns only authorized resources, and can recover from expired sessions.

## Milestone 3 — Faji Business

**Primary workstreams:** D3A + D1

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 3.1 | Business/organization and branch domain model | D1 |
| 3.2 | Merchant invitation, onboarding and verification | D3A + D1 |
| 3.3 | Business profile, branch and staff management | D3A + D1 |
| 3.4 | Menus, services, experiences and catalog management | D3A + D1 |
| 3.5 | Availability, scheduling, capacity and pricing controls | D1 + D3A |
| 3.6 | Merchant dashboard, reporting and operational controls | D3A |
| 3.7 | Business integration, permissions and lifecycle tests | D1 + D3A |

**Milestone acceptance:** Authorized merchant users can administer their own business and published offerings through verified API flows.

## Milestone 4 — Faji Customer

**Primary workstreams:** D2 + D1

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 4.1 | Customer profile and preferences | D2 + D1 |
| 4.2 | Venue, service, event and experience discovery | D2 + D1 |
| 4.3 | Geospatial search, filtering and map presentation | D1 + D2 |
| 4.4 | Venue and experience detail pages across platforms | D2 |
| 4.5 | Reservation lifecycle and capacity-safe confirmation | D1 + D2 |
| 4.6 | Customer ordering flow and status presentation | D1 + D2 |
| 4.7 | Customer push/email status updates | D1 + D2 |
| 4.8 | Mobile/web feature parity, accessibility and E2E validation | D2 |

**Milestone acceptance:** Customers can discover published inventory and complete validated reservation/order journeys with consistent mobile and web behavior.

## Milestone 5 — Payments, Ticketing & Financial Operations

**Primary workstreams:** D1 + D2 + D3A

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 5.1 | Select payment gateway and define provider adapter | D1 |
| 5.2 | Payment intents, checkout and idempotency protection | D1 + D2 |
| 5.3 | Signed webhook processing, reconciliation and audit | D1 |
| 5.4 | Ticket issuance, QR validity and redemption | D1 + D2 + D3A |
| 5.5 | Cancellation, refund and dispute transitions | D1 + D3A |
| 5.6 | Merchant settlement views and auditable ledger records | D1 + D3A |

**Milestone acceptance:** No client-only payment success; financial and ticket state is backed by verified, replay-safe server records.

## Milestone 6 — Experience Planning & Personalization

**Primary workstreams:** D2 + D1 + D3A

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 6.1 | Plan for Me journey and recommendation API boundaries | D2 + D1 |
| 6.2 | Itinerary model, timing and availability constraints | D1 + D2 |
| 6.3 | Initial rule-based recommendations and preference refinement | D1 + D2 |
| 6.4 | Merchant-curated bundles/packages and inventory linkage | D3A + D1 |
| 6.5 | Saved/shared plans, feedback and validation | D2 + D1 |

**Milestone acceptance:** Recommendations and plans have traceable inputs, valid inventory constraints and explicit customer confirmation before paid operations.

## Milestone 7 — Faji Ride & Dispatch

**Primary workstreams:** D3B + D1

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 7.1 | Driver role, profiles and eligibility schema | D1 |
| 7.2 | Driver enrollment and verification UI | D3B + D1 |
| 7.3 | Vehicle and document lifecycle | D3B + D1 |
| 7.4 | Ride request and dispatch domain contracts | D1 |
| 7.5 | Location update interfaces, privacy and retention | D1 + D3B |
| 7.6 | Driver discovery, matching and assignment safeguards | D1 |
| 7.7 | Ride offers, driver acceptance and rejection | D3B + D1 |
| 7.8 | Pickup, active trip and completion states | D3B + D1 |
| 7.9 | Dispatcher console, exception handling and monitoring | D3B + D1 |
| 7.10 | Cancellation, trip history and driver earnings visibility | D3B + D1 |

**Milestone acceptance:** Driver and dispatcher flows operate against server-authoritative trip transitions; location access is scoped and operational tests cover races and failures.

## Milestone 8 — Administration, Integration & Operations

**Primary workstreams:** D1 + D2 + D3A + D3B

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 8.1 | Administrator roles, permissions and delegation | D1 |
| 8.2 | Admin dashboard and case management UI | D2 + D1 |
| 8.3 | Business and driver verification/moderation operations | D1 + D3A + D3B |
| 8.4 | Customer support, refunds and disputes workflows | D1 + D2 |
| 8.5 | Maps, payments, media and notification integration hardening | D1 + all |
| 8.6 | Logs, metrics, audit views and incident management | D1 |
| 8.7 | Cross-application policy and operational acceptance | All |

**Milestone acceptance:** Operators can investigate and resolve exceptional states through audited, least-privilege workflows.

## Milestone 9 — Production Readiness & Launch

**Primary workstreams:** All

| Phase | Engineering work | Owner(s) |
| --- | --- | --- |
| 9.1 | Threat modeling, penetration checks and authorization review | D1 + all |
| 9.2 | Privacy, retention, legal and data lifecycle review | D1 + all |
| 9.3 | Load, performance and capacity verification | D1 + all |
| 9.4 | Backup, restore, queue reliability and recovery testing | D1 |
| 9.5 | End-to-end UAT for customer, merchant, driver and dispatcher | All |
| 9.6 | Mobile/web release builds and storefront preparation | D2 + D3A + D3B |
| 9.7 | Managed staging/production deployment and alerting | D1 + all |
| 9.8 | Launch decision, rollback rehearsal and post-launch ownership | All |

**Milestone acceptance:** Verified tests, operations, privacy/legal approvals and rollback/restore evidence support an explicit go/no-go decision.

## Cross-milestone dependency rules

- M1 defines code ownership, contracts, environments and test gates before feature branches integrate.
- M2 establishes authentication and tenant isolation before business and driver operations rely on user roles.
- M3 merchant inventory and M4 customer booking require shared API schemas and durable availability transitions.
- M5 payment/ticket processing depends on stable reservations/orders; webhook state supersedes client success screens.
- M6 recommendations should respect actual inventory, geography and available time slots.
- M7 dispatch requires geospatial and driver identity primitives before accepting live trip assignments.
- M8 consolidates cross-app operations; M9 is evidence-based readiness, not a UI-completion milestone.

**Ownership reference:** [Developer Allocation](DEVELOPER_ALLOCATION.md) · **Start now:** [Milestone 1 Parallel Kickoff](MILESTONE_01_PARALLEL_KICKOFF.md).
