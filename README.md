# Fajify — Faji Platform
**Unified lifestyle, hospitality, entertainment, commerce and mobility ecosystem.**

Faji connects customers with venues, businesses, experiences, reservations, events, products and transportation through the Faji Customer, Faji Business, Faji Ride & Dispatch and Faji Administration domains.

## Engineering documentation
This repository follows the established Faji System Architecture & Engineering Development Roadmap v1.0.

- [System architecture and confirmed technology stack](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Nine development milestones, 63 phases and acceptance criteria](docs/engineering/MILESTONES.md)
- [Developer 1, Developer 2, Developer 3 and 3A/3B allocations](docs/engineering/DEVELOPER_WORKSTREAMS.md)
- [Monorepo structure, delivery process and engineering standards](docs/engineering/REPOSITORY_AND_DELIVERY.md)

## Confirmed core stack
- **Mobile:** Flutter / Dart (customer, business, combined ride/dispatch)
- **Web:** Next.js / React / TypeScript (customer and admin); Flutter Web (business/dispatch operations)
- **Backend:** NestJS / Node.js / TypeScript, modular monolith, REST/OpenAPI and WebSockets
- **Database:** PostgreSQL / PostGIS; Drizzle ORM and SQL
- **Identity:** Keycloak / OIDC / OAuth 2.0
- **Queues/cache:** Redis / BullMQ
- **Services:** S3-compatible storage, Google Maps, Paystack or Flutterwave, transactional email, FCM/APNs push
- **Delivery:** GitHub, pnpm, Turborepo, Melos, Docker, managed hosting
