# Parallel development and workspace ownership

## Workstreams
| Developer | Primary code ownership | Milestone 1 delivery |
| --- | --- | --- |
| Developer 1 — Backend & Platform | `apps/api/`, `apps/worker/`, `packages/database/`, `packages/domain/`, `packages/api_contracts/`, `infrastructure/` | NestJS modular API, PostgreSQL/PostGIS, OpenAPI, development services, Keycloak preparation |
| Developer 2 — Customer & Frontend | `apps/customer_mobile/`, `apps/customer_web/`, `packages/flutter_design_system/`, `packages/flutter_core/`, `packages/flutter_api_client/`, `packages/web_ui/` | Flutter customer preservation/migration, shared UI, Next.js customer web |
| Developer 3A — Business | `apps/business_mobile/` | Flutter merchant onboarding and dashboard/navigation shells |
| Developer 3B — Ride & Dispatch | `apps/ride_dispatch/` | Single Flutter application with separate driver and dispatcher navigation |
| Developer 3 — Platform Operations | `apps/admin_web/` jointly with Developer 1 | Administration screens and audited operations interfaces |

## Branch and pull-request workflow
1. Branch from the active migration integration branch while PR #1 is pending; do not push unreviewed work directly to `main`.
2. Suggested feature branches: `feat/m1-d1-backend-foundation`, `feat/m1-d2-customer-foundation`, `feat/m1-d3a-business-foundation`, `feat/m1-d3b-ride-foundation`.
3. Change assigned files independently. Shared contracts, APIs, database migrations, and design-system components require reviewer agreement between affected developers.
4. Developer 1 publishes typed OpenAPI contracts and mock data; Developers 2 and 3 use mocks until secure backend integration is ready.
5. Preserve the imported Flutter customer tree until licensing and source acceptance are resolved. Any later refactor must be isolated and reviewed.
6. Authenticate with Keycloak and enforce permission boundaries in NestJS; UI routes do not authorize backend access.
7. PR descriptions must identify assigned milestone, changed modules, tests, screenshots for UI changes, risks and dependencies.
8. Integration proceeds through reviewed branches; build, security and database gates are mandatory before merging completed milestones.

## Local setup by workstream
- JS/TypeScript: Node.js >=20, pnpm 9; `pnpm install` and `pnpm structure:check`. Start a web project with `pnpm --filter @faji/customer-web dev` or NestJS with `pnpm --filter @faji/api dev`.
- Flutter: install Flutter/Dart; `flutter pub get` in each app. Customer source is preserved unchanged. Business and Ride scaffolds contain Dart entrypoints; initialize native Android/iOS runner files with the Flutter SDK before device builds.
- Infrastructure: copy `.env.example` to `.env`, set unique development credentials and run `docker compose --env-file .env -f infrastructure/docker/compose.yaml up -d` if local services are required.
- Validation: `pnpm structure:check` validates folder configuration only. Run independent Flutter analysis/build/tests and backend/web checks before declaring functionality complete.

All nine milestones and acceptance gates are defined in [MILESTONES.md](MILESTONES.md). The confirmed stack is in [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md).
