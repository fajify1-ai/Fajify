# M6 · Phase 1 — Experience Planning & Recommendation Engine

**Branch:** `feat/m6-p1-planning-engine`  
**Status:** Development started; not accepted. Automated checks have not been executed in a local workspace.

## Scope and boundaries
Based on `MILESTONES.md`, `FOUR_PHASE_MODEL.md`, and `SYSTEM_ARCHITECTURE.md`:
- M6-P1 owns the planning input model, rules-based eligibility/ranking, plan APIs, durable plans, and safe package-composition booking orchestration.
- M4 owns public discovery and availability; only approved, active, published listings with sufficient current availability may be recommended.
- M5 owns holds, provider-verified paid confirmation, refunds, and ledger. Planning must not mark paid reservations confirmed or mutate financial records directly.
- P2 owns customer-facing Plan for Me / Browse Plans; P3 merchant package configuration; P4 curated-experience administration.
- Planning requests must not leak private customer preferences across identities or expose unapproved merchants.

## First engineering increment
`apps/api/src/planning/recommendation.rules.ts` introduces a pure deterministic candidate filter and ranking function. Hard filters cover merchant approval/publication, currency, group capacity, time window, optional category/geography, and exact integer minor-unit budget. Results include group totals and explanations. The accompanying unit tests cover rejection paths, pricing, ordering, and input validation.

This is a **rules primitive**, not an end-to-end recommendation API or booking implementation. Inputs are provisional: producer-side queries, PostGIS radius matching, availability locking, capacity composition, and OpenAPI contract shapes still require implementation and integration. The text-address filter is a temporary exact-contract placeholder, not a claim of nearby spatial search. The first version uses per-guest prices only; packages will require separate policy and verified price snapshots.

## Implementation sequence
1. Define request/response DTOs and OpenAPI operation IDs for recommendation discovery, plan CRUD and evaluation, with strict input bounds.
2. Implement approved-listing and future-slot candidate retrieval through domain-owned read interfaces; use PostGIS when requested for geography; use server time and bounded pagination.
3. Persist private customer plans and preferences via versioned PostgreSQL migrations, with ownership, access control and status transitions.
4. Integrate merchant packages and dynamic slot capacity without bypassing authoritative availability and price validation.
5. Add authenticated plan APIs, idempotent actions, concurrency controls and safe booking handoff to M5.
6. Add executable unit, integration and authorization tests, exact-commit typecheck/lint/build/contract export, disposable DB acceptance, and consumer review.

## Acceptance gates
- Constraint eligibility: budget, currency, group size, time zone, geography, publication, approval, booking availability, capacity.
- Explainability and deterministic tie ordering; zero-result alternatives never silently violate mandatory constraints.
- Pricing correctness with integer minor units, same-currency totals, and no stale-price booking.
- Private plan ownership, suspension/revocation enforcement, cross-customer and cross-tenant negative tests.
- Race-safe capacity checks, idempotency/retries and no confirmation before M5 verified payment.
- Generated OpenAPI snapshot and consumer integration reviewed before PR merge.

**Verification:** Not run. No tests, CI, database migration or production validation is claimed by this document.

## Second implementation increment (unverified)
- Additive `0015_m6_customer_planning.sql`: customer-owned plans, strict budget/group/time constraints and owner indexes; migrations must be applied in order on a marked disposable database.
- NestJS `PlanningModule` exposes `POST /api/v1/plans`, `GET /api/v1/plans`, `GET /api/v1/plans/:id`, `GET /api/v1/plans/:id/recommendations` and `POST /api/v1/plans/:id/archive`.
- Writes use the existing customer transaction/account/session validation path; reads use account and identity guards and owner-scoped SQL. Planning results are recomputed from approved, active merchant listings and future live slots.
- Package pricing distinguishes `per_group` from `per_guest`; fixed group prices are not multiplied by attendee counts. Package components must be eligible.
- Recommendation results are **not payment confirmation or booking reservations**. They are nonbinding and explicitly marked for revalidation.

## Remaining engineering before final consolidated local verification
1. Verify migration number against all active integration branches and synchronize least-privilege grants for the M6 customer-plan table.
2. Add spatial radius inputs and use authoritative PostGIS location matching, plus server-authoritative category/occasion policy.
3. Add customer preference versioning, plan editing, feedback and recommendation evaluation instrumentation.
4. Add fully composed package booking, idempotent capacity holds, race-safe component capacity and payment orchestration through M5's verified reservation/intent service. Do not directly mark unpaid bookings confirmed.
5. Add end-to-end PostgreSQL test scenarios (customer isolation, revoked sessions, stale price, capacity races, package currency/tenant isolation), migration rollback-mitigation evidence and deterministic contract snapshot coverage.
6. Run local lint, typecheck, API tests, DB migration/acceptance, OpenAPI generation, dependency audit and API build on one exact SHA, then review with the consuming phase owners.

**No consolidated local checks have been run.** Code is committed but draft/unaccepted. This is not a claim of complete M6-P1 engineering acceptance.
