# Faji monorepo boundaries

> **Current modules versus approved delivery:** The paths below are existing source projects, not separate required installations. The approved target is one public web app and one Flutter app with Customer, Business, and Ride (Coming Soon) entry points; Admin stays separate. See [unified client experience](UNIFIED_CLIENT_EXPERIENCE.md). Better Auth replaces Keycloak for all active runtime authentication.


Customer Flutter: `apps/customer_mobile`. Business Flutter: `apps/business_mobile`. Driver/dispatcher Flutter: `apps/ride_dispatch` (one application, two roles). Customer, Business and administration web source modules: `apps/customer_web`, `apps/business_web`, `apps/admin_web`. Customer and Business use Next.js App Router / React / TypeScript with shared Better Auth. Backend: `apps/api` (NestJS modular monolith) and `apps/worker` (BullMQ). Shared modules live under `packages`; infrastructure and docs have independent directories.

### Target platform

- Node.js + NestJS + TypeScript for backend
- PostgreSQL + PostGIS for relational/geospatial storage
- Better Auth embedded in NestJS for unified authentication
- Redis and BullMQ for cache and background jobs
- Next.js + TypeScript for web
- Flutter/Dart for mobile
- Payment gateway: select and integrate Paystack or Flutterwave in a later milestone

Scaffolding directories do **not** represent implemented features. Customer application integrations use provider-independent repository boundaries; unavailable customer contracts fail explicitly. See `../engineering/M2_P2_FIREBASE_REMOVAL.md`.
