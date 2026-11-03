# M7 · Phase 1 — Ride & Dispatch backend implementation

**Status:** In development. Not accepted, not merged, not released.
**Branch:** `feat/m7-p1-ride-dispatch-backend`
**Base:** `2c64b47267d866ec93f6428a9ebe3fd66f70456f`
**Authority:** [M7 scope](MILESTONES.md), [phase allocation](../roadmap/FOUR_PHASE_MODEL.md), [architecture](../architecture/SYSTEM_ARCHITECTURE.md).

## Objective and boundaries

Implement NestJS API modules, durable PostgreSQL/PostGIS migrations, background processing, server-scoped authorization, authenticated realtime contracts, and OpenAPI support for the combined Driver/Dispatcher app and Customer/Business clients. No live traffic or credentials required for development.

## Ordered increments

1. **Domain invariants (started):** trip-state transition graph, driver/vehicle/document eligibility and validated location freshness. Code: `apps/api/src/rides/ride-domain.ts`. Tests: `apps/api/test/m7-ride-domain.test.ts`. These are pure functions, not a complete API or accepted security mechanism.
2. **Persistence:** versioned migrations for driver profiles/vehicles/documents, eligibility history, ride requests, dispatch offers, trips/events, incidents and idempotency/outbox. Add FKs/check constraints, partial unique indexes for active assignments, expiry indexes and spatial query indexes. Ensure migration tests use explicitly disposable PostgreSQL/PostGIS.
3. **Authorization:** Keycloak identity subject and application membership checks for customer, approved driver, dispatcher within assigned area and privileged admin. Scope all reads, writes, room joins and event subscriptions. Deny suspended identities and unauthorized cross-user data.
4. **Driver workflow:** onboarding, document metadata/private storage, approval/rejection, suspension, document expiry, vehicle verification and driver availability. A role alone must never permit dispatch.
5. **Ride/fare APIs:** validated pickup/drop-off and requested category, provider-agnostic distance/duration estimate, versioned fare quote with expiry, explicit confirmation and idempotent ride-request creation.
6. **Dispatch:** eligible-driver proximity search, expiring offers, atomic claim and one-active-trip constraints, durable fencing tokens, reassignment and retryable worker processing. Redis is advisory; PostgreSQL is authoritative.
7. **Trip and location:** legal transitions, authenticated/consented GPS ingest with sequence/freshness checks, authorised tracking and WebSocket recovery, persisted trip events. Background GPS platform/device verification belongs to Phase 4.
8. **Finance and safety:** integrate existing M5 payment/ledger contracts with verified charge, earnings and settlement states; never infer payment success from client claims. Add incident and emergency escalation, audit, offline sync safety and dispatcher scoped actions.
9. **Contracts/acceptance:** versioned OpenAPI, negative authorization tests, concurrent claim tests, idempotency/retries, migration and integration evidence; compatibility review with M7-P2/P3/P4. PR stays draft until complete.

## Phase acceptance gates

- No offers/assignments for unapproved, suspended, expired-document or unavailable drivers.
- Concurrent accepts cannot double-assign a ride or create conflicting active driver assignments.
- Illegal trip transitions are rejected and durable trip events accurately reflect state.
- Location consent, coordinate validity, future timestamps and stale updates are enforced.
- Passenger, driver, merchant and dispatcher resource scopes prevent unauthorized access.
- Quotes, verified charges, ledger entries, earnings and reconciled payouts follow finance contracts.
- Sensitive documents, incidents and emergency data have strict authorization and audit coverage.
- Generated OpenAPI and locally reproduced unit/integration/DB acceptance tests pass at exact commit SHA.
- Required M7-P4 physical device/background GPS testing is separately evidenced before milestone acceptance.

## Verification commands (when environment available)

```bash
pnpm --filter @faji/api test
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api lint
pnpm --filter @faji/api contracts
```

The first increment's tests have been committed but **not executed in this connected GitHub environment**. Do not infer full phase acceptance or runtime readiness from these foundational files. The M6 planning milestone can run in parallel; M7 requires identity, location and financial contract readiness and coordination before any live integration.
