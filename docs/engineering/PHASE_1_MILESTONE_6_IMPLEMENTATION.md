# M6 · Phase 1 — Experience Planning & Personalization Backend

**Workstream:** M6-P1 — Backend & Platform  
**Branch:** `feat/m6-p1-planning-engine`  
**Review:** Draft PR #18 — https://github.com/fajify1-ai/Fajify/pull/18  
**Status:** Implementation changes committed; consolidated local acceptance **not executed**. No GitHub Actions, deployment, or merge.

## Authoritative scope
References: `docs/engineering/MILESTONES.md`, `docs/roadmap/FOUR_PHASE_MODEL.md`, and `docs/architecture/SYSTEM_ARCHITECTURE.md`.

M6-P1 owns rules-based recommendation and eligibility logic, customer-owned saved plans, explainability and alternatives, package-availability integration, payment-safe booking handoff, and server-side contracts. M6-P2 owns customer Plan for Me and Browse Plans UX. M6-P3 owns merchant package configuration. M6-P4 owns curated-plan administration. M4 owns free service reservations and marketplace discovery, and M5 remains the sole authority for holds, payment verification, financial ledgers, refunds and settlement.

## Implemented contract surface (all private, OIDC bearer-protected)
| Method | Route | Behavior |
| --- | --- | --- |
| POST | `/api/v1/plans` | Create customer plan with budget/currency, group, occasion, categories, attributes, bounded coordinates/radius and date window |
| GET | `/api/v1/plans` | Paginated, owner-only history |
| GET | `/api/v1/plans/{id}` | Owner-only detail |
| PUT | `/api/v1/plans/{id}` | Replace draft using required optimistic revision; refuse stale edits |
| POST | `/api/v1/plans/{id}/archive` | Archive plan and disable further recommendations |
| GET | `/api/v1/plans/{id}/recommendations` | Live eligible offering/slot matching, relevance explanations, booking method and explicit empty-result suggestion |
| POST | `/api/v1/plans/{id}/feedback` | Owner-only feedback creation/update |
| GET | `/api/v1/plans/{id}/feedback` | Owner-only feedback read |
| POST | `/api/v1/plans/{id}/booking-holds` | Convert paid service/package recommendation to the existing M5 transactional reservation hold, with exact displayed price assertion |

Business/customer data is never selected by trusting a client-supplied subject; only the verified Keycloak subject is used. Writes run under existing M4 account, session revocation, locking and rate guards. GET results carry no-store headers.

## Recommendation rules and limits
- Only approved, active merchants, active branches, and published offerings with future slots are eligible.
- Plan constraints: date window at most 31 days, group size 1–50, currency, integer minor-unit budget, optional category and case-insensitive literal address match, optional PostGIS location/radius (default 10 km when coordinates supplied).
- Per-group package pricing is charged once; per-guest pricing is multiplied by the group size. M5 paid maximum is enforced before recommending paid items.
- Package components must all be active, same merchant/branch/currency and have sufficient matching availability slots. Product components without inventory slots are conservatively excluded; M3 does not currently provide authoritative stock accounting.
- Ranking is deterministic and uses budget fit, date ordering, occasion and selected keyword attributes. Explanations do not imply guaranteed reservation. At most 500 candidates are examined and at most 50 results returned.
- A free service routes to M4's normal free reservation API; a paid service/package routes to M5 paid-holds. Event tickets use M5 ticket checkout. Zero-priced packages are not offered until a corresponding no-payment composition lifecycle is modeled.
- Recommendations are nonbinding. Merchant data and price are checked again inside the financial hold transaction; only M5 verified payment can confirm paid reservations.

## Package-capacity and payment integration
M6 extends `CommerceLifecycle.hold` to accept package catalogue offerings using the same `kind='reservation'` M5 record, NOT a second payment implementation.
- M5 merchant advisory lock serializes holds and package changes per merchant.
- Reserving a package increments the primary availability slot and the matching component availability slots atomically in the customer transaction.
- `package_component_holds` tracks exact per-component allocations with immutable identity and explicit release timestamp; database trigger validates package, merchant, group quantity and slot alignment.
- Expiration, unverified cancellation, approved paid cancellation/refund and merchant cancellation restore component quantities with the parent reservation in the same transaction. Paid merchant/customer cancellation cannot bypass M5's finance workflow.
- Merchant edits to package composition or group-pricing configuration are rejected while active paid holds or unfulfilled paid reservations exist.
- M5 checkout/verified payment capture checks package price, configured guest limits and component allocation against current merchant configuration. Only a verified successful payment confirms a reservation.
- M5's existing idempotency key is reused; supplying an expected total prevents stale recommendations from creating a differently priced hold. Exact retries return the original hold even when that hold has consumed the remaining capacity; replay ownership and plan revision are checked under the M5 transaction.
- Plan-to-hold conversion attribution is inserted alongside the financial hold within the same transaction; finance and booking source-of-truth remain in M5.
- Merchant add-on selection is not part of M6's initial base-package paid hold: the existing public quote supports add-on preview only. Any expansion to add-on paid holds requires separate financial policy and inventory integration.

## Migrations
- `0015_m6_customer_planning.sql`: customer-owned plans and indexes.
- `0016_m6_spatial_feedback.sql`: coordinate/radius and revision columns, customer feedback records.
- `0017_m6_package_capacity.sql`: component capacity allocation records.
- `0018_m6_attributes_evaluation.sql`: attributes and recommendation evaluation counts.
- `0019_m6_component_integrity.sql`: immutable allocation and cross-tenant/slot/quantity trigger.
- `0020_m6_plan_hold_attribution.sql`: immutable reference from an M5 hold to the owning plan revision.
- `0021_m6_conversion_integrity.sql`: database-enforced ownership and revision integrity for conversion records.
- `0022_m6_evaluation_immutability.sql`: append-only evidence guard for recommendation evaluation history.

All are additive and must be applied in order against an explicitly marked disposable PostgreSQL 16 database. `grant-m5-runtime.ts` adds M6 tables under the restricted runtime role; no new production credentials are committed.

## Acceptance prepared — NOT executed
- Unit: `apps/api/test/m6-recommendation.test.ts`, `m6-planning-security.test.ts`, `m6-booking-eligibility.test.ts`.
- Restricted PostgreSQL & synthetic payment: `apps/api/test/m6-planning-acceptance.ts` — ownership, optimistic revision, feedback, PostGIS, evaluation, package holds, component capacity/expiry/cancellation, replay protection, stale pricing, revoked session and verified synthetic provider capture.
- OpenAPI registry `apps/api/src/planning/planning-contracts.ts` is checked by `apps/api/scripts/export-openapi.ts`; existing schema names remain separate from M4's `PlanView` and `PlanPage`.
- `tooling/prepare-m6-p1-contracts.sh` prepares the OpenAPI snapshot locally on the isolated feature branch only; it never pushes, merges or touches a production database.
- `tooling/verify-m6-p1-consolidated.sh` and `tooling/m6-verification-report.mjs` prepare exact SHA, typecheck, lint, build, migrations/replay, runtime privileges, unit, database, contract, audit and source integrity gates, reporting failure if evidence is missing or incomplete.
- The generated OpenAPI snapshot is **not yet regenerated or accepted**; it must be generated in the local dependency-installed workspace and committed before the final clean-SHA consolidated run.
- No claims of tests passing, application deployment, migrations applied, payment provider readiness or Phase/Milestone acceptance are made.

## Required local finalization (user-authorized only after engineering freeze)
1. Reconcile `origin/main` and parallel migrations and review M5/M6 cross-domain API changes with owners.
2. Run `bash tooling/prepare-m6-p1-contracts.sh` locally to regenerate and commit `packages/api_contracts/openapi.json`. The script supplies non-production placeholder URLs to satisfy NestJS startup validation without connecting to live services; verify no unrelated M4/M5 schema drift.
3. Provision an isolated, uniquely named `fajify_m6_test_...` PostgreSQL 16 database with the server-side disposable marker, a distinct least-privileged runtime role, and **synthetic** payment test credentials.
4. Prefer `bash tooling/run-m6-p1-disposable.sh` on the exact clean implementation SHA: it creates a unique marked disposable PostgreSQL 16/PostGIS cluster, separate migrator/runtime roles, configures synthetic-only environment, invokes the consolidated verifier and removes the cluster on exit. If an already marked isolated M6 database is explicitly configured, run `bash tooling/verify-m6-p1-consolidated.sh` instead. Analyze `acceptance.json` and logs. Address any failures and rerun at the new exact SHA.
5. Verify M4/M5 regressions in their required separate disposable M4/M5 fixtures where applicable; M6's marker is deliberately not allowed to impersonate those acceptance environments.
6. Obtain contract and finance owner review, then move the draft PR toward merge only after all critical gates pass.

**Scope note:** The nonbinding public M4 quote remains `checkoutEnabled:false`; customers initiate paid package booking through the M6 authenticated plan-to-M5 hold path. M6-P2/P3/P4 client integration and their own acceptance are separate workstreams.
