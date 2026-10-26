# Faji — Nine Engineering Milestones and Acceptance Gates
**Execution baseline:** 9 milestones · **4 delivery phases per milestone** (36 phase allocations) · four platform domains.
The former 63 numbered roadmap items are **technical work packages**, not additional delivery phases. Section identifiers such as 2.1–2.6 remain as traceable scope references. Each milestone runs Phase 1 (Backend & Platform), Phase 2 (Customer & Frontend), Phase 3 (Faji Business) and Phase 4 (Ride, Dispatch & Operations). See [four-phase allocation](../roadmap/FOUR_PHASE_MODEL.md). Phase workstreams may overlap once dependencies are satisfied. Every acceptance statement is a **required verification gate**, not a claim of completion.

## M1 — Engineering Foundation & Infrastructure
**Objective:** reproducible workspaces, backend/database foundation, applications and engineering automation.
- **1.1 Repository/workspace:** GitHub monorepo; Flutter, Next.js, NestJS workspace and package boundaries; formatting and static analysis.
- **1.2 Environments:** local PostgreSQL/Redis, Docker, environment variable conventions, secure secrets and disposable test resources.
- **1.3 Database:** Postgres/PostGIS, roles, migrations, initial schema conventions, backup/restore strategy.
- **1.4 APIs:** NestJS module layout, /api/v1 versioning, OpenAPI, validation, errors, logging and trace IDs.
- **1.5 Design system:** Faji tokens, Flutter widgets, Next.js components, responsiveness, accessibility and brand consistency.
- **1.6 Automation:** build/unit checks, dependency and secret scanning, branch protection, release workflow foundations.
**Acceptance:** all app shells build; migrations work (rollback where supported); local/staging reproducible; OpenAPI generates; automated checks pass. Phase-level steps: [workstreams](DEVELOPER_WORKSTREAMS.md).

## M2 — Identity, Access & Platform Security
- **2.1 Keycloak:** isolate identity PostgreSQL; realms, clients, TLS, backup, monitoring.
- **2.2 Authentication:** registration, verification, login, recovery, supported social login, logout.
- **2.3 Flutter OIDC:** Android/iOS Authorization Code + PKCE, secure storage, sessions, expiry/refresh.
- **2.4 Next.js OIDC:** customer/admin login, HttpOnly cookies, server sessions, route protection.
- **2.5 Authorization:** unified subject ID, profiles, merchant/driver/dispatcher/admin roles; resource-scoped access.
- **2.6 Security:** MFA, revocation, suspension, rate limits, audit logs, recovery testing.
**Acceptance:** unified identity across clients; multi-role support; unauthorized access denied; expired/revoked sessions rejected; privileged access hardened.

## M3 — Faji Business Platform
- **3.1 Merchant registration:** business identity, branch/contact, documents and approvals.
- **3.2 Business administration:** merchant dashboard, staff invites, branches, hours and settings.
- **3.3 Catalogue/services:** products, menus, pricing, assets and capability activation.
- **3.4 Availability/reservations:** slots, capacity, calendar, guest check-in, booking operations.
- **3.5 Order fulfilment:** acceptance, preparation, collection, fulfilment and cancellations.
- **3.6 Events/packages:** event ticket configuration, curated packages, add-ons.
- **3.7 Reporting:** sales, bookings, orders, ratings and financial views.
**Acceptance:** only approved merchants publish services; tenant/branch isolation; staff permissions; valid availability and order/booking state transitions.

## M4 — Faji Customer Platform
- **4.1 Client foundation:** Flutter customer + Next.js public website, routes, profile, auth integration.
- **4.2 Discovery:** feed, category, venue listing, search/location filtering.
- **4.3 Venue details:** merchant, media, services, pricing, availability and reviews.
- **4.4 Browse Plans:** packages, budget, group/date, add-ons.
- **4.5 Reservations:** slot selection, confirmation, guest info, booking management.
- **4.6 Commerce:** menus, cart, order placement and history.
- **4.7 Account:** bookings, tickets, wishlist, reviews, notifications, support.
- **4.8 SEO:** indexable venue/event pages, metadata, structured data, social previews and performance.
**Acceptance:** customer discovery matches available merchant offerings; web/mobile share authoritative data; capacity enforced; customer data private; SEO/performance gates pass.

## M5 — Payments, Ticketing & Financial Operations
- **5.1 Gateway:** Paystack or Flutterwave adapter, payment intent, independently verified callbacks/webhooks, idempotency.
- **5.2 Ledger:** double-entry accounts/entries, commissions, payables and audit.
- **5.3 Paid bookings:** capacity holds, checkout, verified confirmation, expiry/retry.
- **5.4 Tickets:** inventory, QR issuance, atomic server-side validation and redemption.
- **5.5 Refunds/disputes:** policies, reversals, provider reconciliation, chargebacks.
- **5.6 Merchant settlements:** eligibility, payout batches, provider confirmation and reconciliation.
**Acceptance:** duplicated notifications cannot double-charge or double-post; no unverified successful payments; no duplicate ticket redemption; ledger/refund/payout reconciliation succeeds.

## M6 — Experience Planning & Personalization
- **6.1 Planning model:** occasion, budget, group, geography, date/time, attributes.
- **6.2 Recommendation logic:** eligibility, location/budget/availability matching, rankings and alternatives.
- **6.3 Plan for Me:** guided input, validation, state persistence and results.
- **6.4 Curated integration:** packages, availability, group prices and booking conversion.
- **6.5 Quality:** evaluation, explanations, feedback, analytics and optimization.
**Acceptance:** recommendations obey availability and constraints; pricing logic is coherent; choices explainable; recommended items can lead to valid booking. First implementation uses structured matching/rules, not mandatory generative AI.

## M7 — Faji Ride & Dispatch
- **7.1 One Ride & Dispatch app:** role-aware driver/dispatcher routes and OIDC.
- **7.2 Driver onboarding:** identification, licence, vehicle, banking and review.
- **7.3 Driver administration:** approvals, suspension, eligibility, document expiry.
- **7.4 Location:** permissions, background GPS, proximity, stale handling.
- **7.5 Ride requests:** pickup/drop-off, vehicle category, fare estimation, confirmation.
- **7.6 Dispatch:** driver matching, fenced/atomic assignment, offer expiry, reassignment.
- **7.7 Trip execution:** en route, pickup, trip start, live tracking, drop-off, completion/history.
- **7.8 Dispatcher operations:** live monitoring, manual assignment, incident/escalation flows.
- **7.9 Ride finance:** charges, earnings, commission, bonus/tips, settlement, reconciliation.
- **7.10 Safety:** emergency flows, restrictions, incident records, offline handling, real-device background location tests.
**Acceptance:** only eligible drivers assigned; no double assignment; consistent trip state; background location verified within iOS/Android platform limitations; payouts reconcile; safety flows work.

## M8 — Platform Administration, Integration & Operations
- **8.1 Admin foundation:** admin dashboard, scopes, MFA, auditing.
- **8.2 Marketplace governance:** approvals, moderation and restrictions.
- **8.3 Financial administration:** payment/refund/settlement/dispute controls.
- **8.4 Support:** tickets, complaints, booking/order/ride incidents.
- **8.5 Cross-platform:** booking-to-ride, package-to-reservation, order-to-delivery, account history and notifications.
- **8.6 Reports:** customer, merchant, ride, reservations, tickets, revenue.
- **8.7 Monitoring:** application/queue/auth/provider health, errors and incidents.
**Acceptance:** admin operations authorized/audited; integrated workflows consistent; reporting reconciles; incident investigation and critical alerts available.

## M9 — Production Readiness, Deployment & Launch
- **9.1 End-to-end verification:** all domains, integration, failures and retries.
- **9.2 Security:** auth, permissions, sensitive files, APIs, payments, infrastructure.
- **9.3 Load/performance:** search, booking contention, payments, ticket concurrency, GPS, driver assignment and database.
- **9.4 Recovery:** backups, restoration drills, rollback and incident simulations.
- **9.5 Production infrastructure:** isolated environments, TLS, secret handling, monitoring and alerting.
- **9.6 Mobile releases:** signing, metadata, privacy, permissions, TestFlight/Google Play tracks.
- **9.7 Pilot:** limited geography, verified merchants, onboarding, financial/incident monitoring.
- **9.8 Public launch:** approved production release, reporting, monitoring, support and controlled scaling.
**Acceptance:** functional and security gates clear; restore/rollback proven; provider reconciliation succeeds; regulatory/store requirements satisfied; explicit launch authorization recorded.

## Dependencies and release controls
- M1 enables the other milestones; M2 precedes releasing protected customer/merchant/driver activity.
- M3 supplies merchant/availability data to M4; M5 precedes live paid booking and ticketing.
- M6 requires usable discovery/availability data; M7 depends on identity, location, finance and administration foundations.
- M8 integrates operational domains; M9 validates the complete platform.
- Introduce baseline auditing, security, monitoring and tests **throughout**, not only during M8/M9.
- Document for each **milestone/phase identifier** (e.g. M2-P1): work package ownership, dependency, implementation PR(s), verification command/result, threat/failure coverage, open issues, release decision and approver. A milestone closes only after all four phases and their integration checks pass.
