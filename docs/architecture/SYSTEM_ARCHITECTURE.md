# Faji — System Architecture
**Classification:** Engineering specification | **Baseline:** v1.0 | **Status:** Established architecture

## 1. Product and application boundaries
Faji is a unified lifestyle, hospitality, entertainment, commerce, and mobility platform with four operational domains:
1. **Faji Customer:** discovery, Plan for Me, Browse Plans, reservations, tickets, orders, ride requests, customer accounts.
2. **Faji Business:** merchant verification and onboarding, branches, service catalogue, capacity, reservations, orders, events, packages, revenue, staff.
3. **Faji Ride & Dispatch:** one application with separate driver and dispatcher roles; onboarding, driver eligibility, assignment, trips, locations, earnings, incidents.
4. **Faji Administration:** verification, moderation, financial oversight, approvals, fraud/support, audit, reporting, operational monitoring.

The architecture supports Android, iOS and web. The backend is a **NestJS modular monolith** with explicit domain boundaries; backend service extraction occurs only when scale and operational needs justify it. All clients consume the same versioned, server-authoritative APIs.

## 2. Technology stack
| Layer | Established technology | Responsibility |
| --- | --- | --- |
| Customer, Business, Ride & Dispatch mobile | Flutter / Dart | Android and iOS clients |
| Customer public website | Next.js / React / TypeScript | SEO, browsing, booking, commerce, accounts |
| Administration website | Next.js / React / TypeScript | Platform governance and operations |
| Business web | Flutter Web | Authenticated merchant operations |
| Dispatcher web (where needed) | Flutter Web | Dispatcher workflows |
| Backend | NestJS / Node.js / TypeScript | Domain APIs, authorization and orchestration |
| Primary relational data | PostgreSQL | Authoritative state and transactions |
| Spatial data | PostGIS | Nearby venues, coverage and driver proximity |
| Data access | Drizzle ORM + PostgreSQL SQL | Typed queries, migrations, advanced SQL |
| Authentication | Keycloak / OAuth 2.0 / OpenID Connect | Identity, sessions, MFA |
| Caching and coordination | Redis | Cache, rate limits, ephemeral ride location |
| Background processing | BullMQ | Retryable jobs, notifications, reconciliation |
| Real time | NestJS WebSockets | Trip, order, booking and dispatch events |
| Files | S3-compatible storage | Public imagery, private documents and receipts |
| Payments | Paystack or Flutterwave | Gateway integration; provider to be configured |
| Maps | Google Maps | Search, geocoding, routes, distances |
| Mobile push | Firebase Cloud Messaging + Apple Push Notification service | Push delivery only; **not Firebase as application database** |
| Email | Amazon SES or equivalent transactional provider | Transactional messages |
| Web UI | Tailwind CSS / shadcn/ui | Responsive web styles and components |
| Contracts | OpenAPI | API schema and typed client generation |
| Flutter routing | go_router | Mobile navigation |
| Workspaces | pnpm / Turborepo / Melos | JS/TS and Flutter monorepo orchestration |
| Containers and delivery | Docker, GitHub, managed hosting | Reproducible infrastructure and deployment |

The source specification explicitly permits alternatives for payment gateway, email provider and hosting; those vendor alternatives are not claims that a particular account or production deployment has been configured. Firebase Cloud Messaging is a push transport, **not** the application database or core backend.

## 3. Application topology
```text
Flutter: Customer | Business | Ride & Dispatch     Next.js: Customer Web | Admin Web
                       \                           /
                        versioned REST / WebSockets
                                 |
                     NestJS API (modular monolith)
                       |        |         |
                    Keycloak  Redis     Background workers (BullMQ)
                       |        |         |
           Identity PostgreSQL  |      PostgreSQL + PostGIS
                                         |
                               S3 / maps / payments / email / push
```
Identity and application data are isolated logically: Keycloak owns credentials and identity-provider records; Faji PostgreSQL owns profiles, memberships, business records, bookings, ride operations and finances. Application records reference the immutable Keycloak subject identifier.

## 4. Identity and authorization
- Flutter uses OIDC Authorization Code + PKCE through secure system-browser authentication and platform-appropriate token storage.
- Next.js uses server-side OIDC sessions and secure HttpOnly cookies.
- NestJS validates signed access tokens (issuer, audience, key, expiry, claims); all resource-scoped permissions are enforced on the server.
- One identity may be a customer, business owner/staff, driver, dispatcher or administrator.
- Authorization additionally checks business/branch membership, driver approval, dispatcher area, suspension, ownership and admin scope; a UI route or Keycloak role alone is insufficient.
- Administrative access requires stronger authentication controls and audit logging.

## 5. Backend module ownership
The application exposes bounded modules for: identity integration, users, organizations/branches, merchant verification, catalogue, discovery, experience planning, availability, reservations, events, ticketing, orders, payments, ledger, settlements, ride operations, dispatch, location, notifications, reviews, promotions, support, administration, audit and reporting.

Rules:
- Each domain owns validation, state transitions, persistence and its public application service.
- Other domains integrate through approved module interfaces/events, not uncontrolled direct table mutations.
- API namespace: `/api/v1/{users,businesses,venues,catalogue,experiences,plans,availability,reservations,events,tickets,orders,payments,settlements,drivers,rides,dispatch,notifications,reviews,support,admin}`. Authentication protocol endpoints can be Keycloak-hosted.
- Publish OpenAPI definitions and use centrally maintained/generated typed clients.
- Background jobs are retryable and idempotent; use a transactional outbox for atomic coordination with database writes.
- Every write operation validates caller scope, input, and legal state transition.

## 6. Database domains and invariants
Conceptual table groups (schema names finalized in versioned migrations):
- Identity: user_profiles, user_preferences, account_statuses.
- Merchants: businesses, business_branches, business_memberships, business_documents, business_services.
- Marketplace: venues, categories, experiences, packages, package_items, media_assets.
- Reservations: availability_rules, availability_slots, reservations, reservation_guests, reservation_events.
- Tickets: events, ticket_types, ticket_inventory, tickets, ticket_redemptions.
- Commerce: menus, menu_items, item_variants, orders, order_items, fulfilments.
- Ride: driver_profiles, vehicles, driver_documents, driver_availability, ride_requests, dispatch_offers, trips, trip_events.
- Finance: payment_intents, payment_transactions, ledger_accounts, ledger_entries, refunds, settlement_batches, payouts.
- Operations: notifications, reviews, support_cases, disputes, audit_events.

Database standards: UUID public IDs; explicit FK/unique/check constraints; transactional critical transitions; idempotency keys; indexes for hot queries; least-privilege roles; versioned migrations; TLS, backups and restore exercises. PostGIS implements service areas and nearby searches. High-frequency driver locations may be maintained ephemerally in Redis, while durable trip transitions live in PostgreSQL.

## 7. Authoritative workflows
**Reservation:** availability search → request → temporary capacity hold → payment initiation → verified payment → confirmation → merchant notification → check-in → completion. Handle hold expiry, payment failure, cancellation, refunds and capacity restoration.

**Ticket:** publish event → reserve inventory → purchase → verify payment → issue QR ticket → server-side verify → atomic, single-use redemption.

**Order:** submit → payment/merchant acceptance → confirm → prepare → ready → pickup/delivery handoff → fulfil. Handle rejection, cancellation and failed fulfilment.

**Ride:** request → fare estimate → eligible-driver lookup → offer → concurrent-safe assignment → driver arrival → pickup → in-progress → drop-off → completion → separate financial settlement. Enforce approved driver/vehicle eligibility and prevent double-assignment.

**Finance:** receive payment → independently verify provider status → immutable double-entry ledger postings → payable balance → settlement eligibility → payout → provider confirmation → reconciliation. Chargebacks/refunds require compensating entries. Never trust a browser success screen as proof of payment.

## 8. Real-time, storage, notifications and safety
WebSocket events are authenticated and scoped; clients reconnect, de-duplicate, recover from gaps and query authoritative state. Driver location updates require consent, staleness checks, safety/incident workflows and real-device background GPS tests. Private verification documents use scoped short-lived signed URLs, upload validation and access auditing. Send email, FCM/APNs push and persistent in-app notifications asynchronously; respect consent for marketing messages.

## 9. Deployment and operational controls
Isolated development, staging and production resources; no uncontrolled production data in staging. Independently deploy customer web, admin web, Flutter applications, NestJS API, workers, Keycloak, managed PostgreSQL, Redis, object storage and monitoring. Keycloak's database is isolated from Faji's application database. Container deployments use managed secrets, TLS, health checks, logs, alerts and rollback procedures. Schema changes are reviewed and deployed compatibly; application replacement must not delete persistent data.
