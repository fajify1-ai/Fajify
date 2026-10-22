# Faji monorepo boundaries

Customer Flutter: `apps/customer_mobile`. Business Flutter: `apps/business_mobile`. Driver/dispatcher Flutter: `apps/ride_dispatch` (one application, two roles). Customer and administration web: `apps/customer_web`, `apps/admin_web`. Backend: `apps/api` (NestJS modular monolith) and `apps/worker` (BullMQ). Shared modules live under `packages`; infrastructure and docs have independent directories.

### Target platform

- Node.js + NestJS + TypeScript for backend
- PostgreSQL + PostGIS for relational/geospatial storage
- Keycloak/OIDC/PKCE for unified authentication
- Redis and BullMQ for cache and background jobs
- Next.js + TypeScript for web
- Flutter/Dart for mobile
- Payment gateway: select and integrate Paystack or Flutterwave in a later milestone

Scaffolding directories do **not** represent implemented features. Existing Firebase integrations in the legacy app are preserved only for incremental migration.
