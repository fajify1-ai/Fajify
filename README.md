# Fajify — Faji Platform
**Unified lifestyle, hospitality, entertainment, commerce and mobility ecosystem.**

Faji connects customers with venues, businesses, experiences, reservations, events, products and transportation through the Faji Customer, Faji Business, Faji Ride & Dispatch and Faji Administration domains.

## Engineering documentation
This repository follows the established Faji System Architecture & Engineering Development Roadmap v1.0.

- [System architecture and confirmed technology stack](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Nine milestones, four delivery phases per milestone, and acceptance criteria](docs/engineering/MILESTONES.md)
- [Four-phase allocation matrix for all milestones](docs/roadmap/FOUR_PHASE_MODEL.md)
- [Monorepo structure, delivery process and engineering standards](docs/engineering/REPOSITORY_AND_DELIVERY.md)

## Confirmed core stack
- **Mobile:** Flutter / Dart (customer, business, combined ride/dispatch)
- **Web:** Next.js / React / TypeScript (customer, admin, business, ride & dispatch)
- **Backend:** NestJS / Node.js / TypeScript, modular monolith, REST/OpenAPI and WebSockets
- **Database:** PostgreSQL / PostGIS; Drizzle ORM and SQL
- **Identity:** Better Auth embedded in Faji applications, backed by Faji PostgreSQL
- **Queues/cache:** Redis / BullMQ
- **Services:** S3-compatible storage, Google Maps, Paystack or Flutterwave, transactional email, FCM/APNs push
- **Delivery:** GitHub, pnpm, Turborepo, Melos, Docker, managed hosting

## Authentication and authorization decision
All registration, sign-in, password recovery, phone OTP, sign-out and session handling occur within Faji web/mobile applications using application-hosted Better Auth. No external browser or hosted login redirect is permitted. NestJS validates authenticated sessions/tokens and enforces server-side roles, memberships, approvals, suspensions and resource scope. One identity can hold multiple roles. This is the target architecture; legacy implementation and test artifacts are not evidence that migration has occurred.
