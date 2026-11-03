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
