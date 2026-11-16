# Fajify — Faji Platform

## Unified delivery experience

**Approved first-release target:** one public Fajify web application at `preview.fajify.com` and one installable Flutter Android application, each presenting Customer, Faji Business, and Faji Ride entry points. Customer and Business are active; Ride is Coming Soon. Administration remains a separate internal web console. Existing separate `apps/*` packages are implementation modules to reconcile, not evidence that unified packaging is complete. See [unified client experience](docs/architecture/UNIFIED_CLIENT_EXPERIENCE.md).

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
All registration, sign-in, password recovery, phone OTP, sign-out and session handling occur within Faji web/mobile applications using application-hosted Better Auth. No external browser or hosted login redirect is permitted. NestJS validates authenticated sessions/tokens and enforces server-side roles, memberships, approvals, suspensions and resource scope. One identity can hold multiple roles. The implementation and rollout boundary are documented in [Better Auth implementation](docs/engineering/BETTER_AUTH_IMPLEMENTATION.md); historical OIDC evidence does not validate the replacement.

Fajify is pre-launch with no real users: no legacy identity import or account claiming is needed. [Current merge verification and removal audit](docs/engineering/BETTER_AUTH_MERGE_READINESS.md) records retained acceptance evidence and remaining deployment/device checks.
