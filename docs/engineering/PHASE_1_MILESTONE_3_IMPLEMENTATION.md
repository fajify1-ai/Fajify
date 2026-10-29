# M3-P1 — Merchant backend delivery and acceptance handoff

**Branch:** `feat/m3-p1-business-backend` — draft PR #10, based on PR #9 merged into `main`.
**Status:** Code committed; consolidated tests and database acceptance deliberately deferred until development is complete. Do not merge.
**Sources:** [architecture](../architecture/SYSTEM_ARCHITECTURE.md), [milestones](MILESTONES.md), [phase ownership](../roadmap/FOUR_PHASE_MODEL.md), [security contracts](PHASE_1_MILESTONE_2_AUTH_CONTRACTS.md).

## Scope and data ownership

Migration `0006_m3_business_operations.sql` extends (never replaces) the M2 `business_onboarding` approval root. Branch, catalogue, slot, reservation and order tables use tenant/branch composite foreign keys. Prices are integer minor units; order line snapshots preserve the price at creation. All business-specific operations use the account/session guards inherited from M2 and verified business membership. Permission and status checks remain server authoritative.

- Owner: all merchant operations, staff grant/revoke (except self actions).
- Manager: branch, catalogue, schedule and operational management, no access grants.
- Staff: only explicitly granted branches; read catalogue/slots and manage reservations/orders. Staff without a branch grant cannot operate another branch.
- Non-approved merchant, suspended/revoked identity, foreign tenant, invalid identifier, illegal state transition: denied.

Manager/staff onboarding uses *existing* active Keycloak subject IDs. Creating/inviting new identities and sending invitation emails are separate approved identity/notification flows; client-side role assignment is forbidden. No production payment or ticket/dispatch mutations are introduced.

## API v1 contracts

All routes are under `/api/v1/businesses/:businessId`, require signed bearer token and JSON for writes.

| Method | Route suffix | Roles | Purpose |
|---|---|---|---|
| GET/POST | `branches` | owner/manager (GET staff filtered) | List/create branches |
| PATCH | `branches/:branchId` | owner/manager | Update name, contact or activation |
| GET/POST | `branches/:branchId/catalogue` | read staff, write owner/manager | List/create products, services, packages, events |
| PATCH | `branches/:branchId/catalogue/:itemId` | owner/manager | Publish/disable/update item |
| GET/POST | `branches/:branchId/availability` | read staff, write owner/manager | List/create capacity slots |
| PATCH | `branches/:branchId/availability/:slotId` | owner/manager | Enable/disable slot |
| GET/POST | `branches/:branchId/reservations` | owner/manager/scoped staff | List/create merchant-assisted reservations |
| PATCH | `branches/:branchId/reservations/:id/status` | owner/manager/scoped staff | Confirmed → checked-in → completed; confirmed → cancelled |
| GET/POST | `branches/:branchId/orders` | owner/manager/scoped staff | List/create merchant-assisted order and price snapshots |
| PATCH | `branches/:branchId/orders/:id/status` | owner/manager/scoped staff | Placed → accepted → preparing → ready → fulfilled; cancellation until terminal |
| GET | `staff` | owner/manager | List scoped active grants |
| POST | `staff/grants` | owner | Activate existing identity, manager or branch-staff |
| POST | `staff/revocations` | owner | Revoke existing manager or branch-staff grants |
| GET | `overview` | owner/manager | Basic operational counts, fulfilled *order* totals (not payment revenue) |

Required body fields: branch `name`; catalogue `name,kind,priceMinor`; slot `catalogueId,startsAt,endsAt,capacity`; reservation `availabilityId,customerSubject,guests`; order `customerSubject,items:[{catalogueId,quantity}]`; state transition `status`. Inputs use strict DTO validation and UUID params are checked before querying.

**Concurrency:** availability reservation uses a conditional atomic `UPDATE ... WHERE reserved + guests <= capacity` in a transaction. Reservation/order transition state is row-locked. Order lines are priced exclusively by reading published catalogue rows in the same transaction. Reservation and order transitions append events to the existing transactional outbox; no event consumer or external side effects are enabled here.

## Cross-phase contracts

- **M3-P2 Customer:** these are operator-authenticated routes. Public discovery, customer self-booking and checkout are **not** exposed here; use M4 approved customer contracts later.
- **M3-P3 Business Flutter:** consume the endpoints through a typed client; show server validation/state errors, do not invent permissions from a signed-in UI. Role grants require an existing active account and approval.
- **M3-P4 Admin:** retain existing M2 business approval API; merchant review/admin UI is owned by Phase 4. Avoid direct database writes.

## Acceptance to run once implementation is frozen

1. `pnpm install --frozen-lockfile` in a disposable checkout with Node >= 20 and pnpm 9.15.9.
2. `pnpm --filter @faji/api typecheck && pnpm --filter @faji/api lint && pnpm --filter @faji/api test && pnpm --filter @faji/api build`.
3. On isolated PostgreSQL, apply migrations 0001–0006 via the existing migration command. Verify schema constraints and repeat application idempotence. No shared or production database.
4. Verify HTTP guards: missing bearer, suspended/revoked sessions, pending/rejected merchant, cross-tenant business/branch, disallowed staff actions, invalid DTO/UUIDs.
5. Run integration tests with simultaneous reservations at exactly one remaining seat, cancellation releasing capacity, foreign catalogue item/order reference, duplicate/illegal status transitions and rollbacks.
6. `pnpm --filter @faji/api contracts`, review and commit the generated OpenAPI snapshot; check new business endpoints and existing M2 routes for regressions.
7. Record environment, precise head SHA, commands, pass/fail counts and any skipped cases in the PR. Keep draft until verified.

**Not part of M3-P1:** frontend modifications; real payments/refunds; public catalogue/search; push/SMS/email delivery; event ticket issuance; order dispatch; production deployment; modifying other milestone branches.
