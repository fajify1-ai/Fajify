# Faji — Repository Architecture and Engineering Standards
**Status:** Established team conventions and target repository structure.

## 1. Monorepo layout
```text
Fajify/
├── apps/
│   ├── customer_mobile/       # Flutter customer
│   ├── business_mobile/       # Flutter merchant
│   ├── ride_dispatch/         # One Flutter app: driver + dispatcher
│   ├── customer_web/          # Next.js customer website
│   ├── admin_web/             # Next.js admin website
│   ├── api/                   # NestJS modular monolith
│   └── worker/                # Background processing
├── packages/
│   ├── flutter_design_system/
│   ├── flutter_core/
│   ├── flutter_api_client/
│   ├── web_ui/
│   ├── api_contracts/
│   ├── database/
│   ├── domain/
│   └── shared_config/
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── keycloak/
│   ├── database/
│   └── deployment/
├── tests/
│   ├── integration/
│   ├── end_to_end/
│   ├── security/
│   └── performance/
├── docs/
│   ├── architecture/
│   ├── engineering/
│   ├── api/
│   ├── security/
│   ├── product/
│   ├── operations/
│   └── roadmap/
└── tooling/
```
This is the **target layout**, not an assertion that all directories or applications have already been implemented. The current repository may begin with documentation and incrementally create workspaces during M1.

## 2. Workspaces and boundaries
- Use pnpm/Turborepo for TypeScript workspace orchestration and Melos for Flutter packages.
- Expose Flutter design tokens/widgets from `flutter_design_system` and shared foundation/utilities from `flutter_core`.
- Publish reusable contracts from `api_contracts` and separately generated/maintained clients for Flutter and Next.js. Flutter and Next.js share API contracts and business semantics, **not** their UI widgets.
- Keep shared packages free of private application secrets; do not depend on unpublished internal paths between applications.
- Keep backend database persistence inside owned NestJS modules, with explicit service interfaces for cross-domain use.
- Define infrastructure and environment differences via secret stores and configuration templates, never committed passwords or real `.env` files.

## 3. Environment configuration
**Development:** local or disposable databases, fake providers and synthetic test data; reproducible Docker configuration where required.
**Staging:** separate identity and application DBs, production-like network/roles/providers using safe test credentials and no uncontrolled production data.
**Production:** independently deployed services, restricted networking, managed secrets, TLS, backups, audit and alerts.
Record template variable names and validation. Do not copy production secrets into Git history or staging.

## 4. Engineering implementation sequence
1. Establish monorepo and workspace lint/test/build entrypoints.
2. Configure Drizzle migration tooling and PostgreSQL/PostGIS foundation.
3. Start NestJS API with health, OpenAPI and standard validation/error/logging.
4. Import customer Flutter code with source attribution and reproducible build evidence.
5. Scaffold Faji Business and Ride & Dispatch Flutter clients in parallel.
6. Scaffold Next.js customer/admin websites and shared UI packages.
7. Establish mock API fixtures from documented contracts for independent developer progress.
8. Prepare Keycloak and integrate server-enforced authorization in M2.
9. Expand merchant, customer, finance, ride and admin modules according to milestone acceptance gates.
10. Verify exact commit/release in isolated staging before any controlled production release.

## 5. Quality and security gates
Baseline change checks: formatting, linting, static type analysis, unit tests, dependency/secret scans and successful affected-app builds. Domain-level gates: integration tests with real PostgreSQL, role/tenant isolation, transaction/concurrency cases, payment webhook idempotency, location and trip state recovery, UI navigation/accessibility and API contract compatibility. Release gates: E2E flows, performance, authorization review, backup/restore proof, monitoring, rollback plans and operator sign-off.

## 6. Pull request and migration process
- Branch changes from the current intended base and avoid overwriting parallel work.
- PR titles/descriptions identify milestone and owner; changes to OpenAPI/schema require consumer review.
- Database migration PRs include intent, version, destructive-change assessment, forward compatibility, and evidence of migration/rollback or mitigation.
- External providers use signed/verified callbacks and repeat-safe effects; sensitive files remain private.
- Existing customer Flutter code is imported with repository provenance and review; the original source repository is not modified.
- Maintain `docs/engineering/MILESTONES.md` as delivery requirements and PR/evidence links as status, rather than marking planning tasks complete prematurely.

## 7. Definition of done
A task is done only when committed code/docs exist, affected tests pass, error paths and authorization are covered, developer setup is repeatable, contract changes are documented, and the relevant milestone acceptance gate is evidenced. A milestone is not complete merely because its implementation plan is published.
