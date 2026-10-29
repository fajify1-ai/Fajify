# M3-P1 — Business backend implementation and acceptance register

Base: main at fc7be475933250bcafcb8ac58c7a81adb34669b3 (PR #9).
Branch: feat/m3-p1-business-backend. This is **not** a merge or production release.
Canonical scope: [MILESTONES](MILESTONES.md), [FOUR_PHASE_MODEL](../roadmap/FOUR_PHASE_MODEL.md), [SYSTEM_ARCHITECTURE](../architecture/SYSTEM_ARCHITECTURE.md).

## New contracts
All merchant operations live under `/api/v1/businesses/:businessId/`. Routes require a verified Keycloak bearer, an active account/session, and a database-backed approved-business membership. Branch-scoped routes additionally validate ownership through composite foreign keys. Owners/managers can create branches, publish catalogue items and create availability slots; staff can read and perform reservation/order operations in authorized branches. The M2 business application and approval endpoints are preserved.

- `GET/POST branches`
- `GET/POST branches/:branchId/catalogue`
- `GET/POST branches/:branchId/availability`
- `GET/POST branches/:branchId/reservations`, `PATCH branches/:branchId/reservations/:id/status`
- `GET/POST branches/:branchId/orders`, `PATCH branches/:branchId/orders/:id/status`

Prices are integer minor units, currency ISO-style three uppercase letters; times are ISO-8601 UTC-offset instants. Database transactions enforce capacity using conditional atomic updates, scope reads/writes to merchant and branch, and serialize status updates via row locks. Published items are required for ordering and slot creation. These are merchant-operated order/reservation records only: direct customer self-service, payments, refunds, ticket issuance and dispatch are not introduced.

## Developer handoffs
M3-P3 (Business Flutter): use these routes for branch, catalogue, reservation and order UI; do not infer access from Flutter navigation. M3-P2 (customer): M4 will establish public discovery and customer-authorized placement; merchant endpoints are not customer APIs. M3-P4: use the existing audited M2 approval endpoints for governance; no admin UI changes included.

## Acceptance checklist (not yet certified)
- [ ] TypeScript typecheck, ESLint, Nest build and OpenAPI snapshot
- [ ] Database migration 0006 on disposable PostgreSQL
- [ ] Negative HTTP tests for account/session revocation, foreign merchant, staff permission and validation
- [ ] Concurrent capacity test, invalid state transitions, cross-branch order/item reference tests
- [ ] Regression suite including M2 authorization/security; no skipped tests
- [ ] Evidence with exact SHA and environment attached to draft PR

No production deployment, migration application or merge is authorized by this phase branch.
