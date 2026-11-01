# M4 · Phase 1 · Customer backend

Status: **implementation prepared; consolidated local verification and phase acceptance pending**.

Base: `main` at `728fd1ca457f838e4e8a365e963420bce7b49bac`.
Branch: `feat/m4-p1-customer-platform`. Review: PR #16.

## Delivery scope and verification decision

Implementation follows [MILESTONES.md](MILESTONES.md), [four-phase ownership](../roadmap/FOUR_PHASE_MODEL.md), [delivery standards](REPOSITORY_AND_DELIVERY.md), [architecture](../architecture/SYSTEM_ARCHITECTURE.md), the M3 merchant backend, and the M4 Customer/Business handover PDFs. P1 supplies APIs, persistence, authorization, contracts and the local acceptance tooling; P2/P3 own the client implementations and consumer acceptance.

The user directed that all consolidated verification be performed locally after M4-P1 implementation, because GitHub Actions is unavailable due to billing. **No Actions workflow is added, enabled or required. No new tests, build, lint, typecheck, audit, migrations or contract-generation checks were run for this implementation expansion.** The existing 95-test evidence file belongs only to the earlier first increment and does not establish that this implementation passes. The expanded OpenAPI snapshot must be generated and reviewed locally; its source DTOs, annotations and operation registry are committed here.

## Implemented API inventory

All paths are prefixed `/api/v1`. The exact 38-operation contract inventory is `apps/api/src/customer/customer-contracts.ts`.

| Area | Routes | Behavior |
| --- | --- | --- |
| Taxonomy and feed | GET `/discovery/categories`, `/discovery/offerings` | Current product/service/package/event taxonomy; active, published offerings from approved merchants; text, address, category and branch filters |
| Offering details | GET `/discovery/offerings/{id}`, `/discovery/offerings/{id}/availability` | Public catalogue/pricing, media, event schedule, configured package components/add-ons, booking capabilities and future available slots |
| Venues | GET `/discovery/venues`, `/discovery/venues/{id}`, `/discovery/venues/{id}/reviews` | Merchant/branch details, public summary/contact, hours, location, media and verified-review summaries; text/city/category/branch and optional geographic filtering |
| Browse Plans | GET `/discovery/plans`; POST `/discovery/plans/{id}/quote` | Configured packages filtered by currency, group budget, guests, exact future slot start, branch/location and text; exact decimal minor-unit quotes with permitted add-ons |
| Reservations | POST/GET `/customer/reservations`; GET `/customer/reservations/{id}`; POST `/customer/reservations/{id}/cancellation` | Free-service booking, guest name/count, private history/detail, cancellation before start while confirmed |
| Orders | POST/GET `/customer/orders`; GET `/customer/orders/{id}`; POST `/customer/orders/{id}/cancellation` | Product orders, server price snapshots/totals, private history/detail; customer cancellation closes at merchant acceptance |
| Profile | GET/PATCH `/customer/profile` | Own display name; identity credentials, roles and verification remain owned by M2/Keycloak |
| Wishlist | GET `/customer/wishlist`; PUT/DELETE `/customer/wishlist/{id}` | Own saved offerings, up to 500; retry-safe additions/removals; unpublished/disabled entries are excluded from public data projections |
| Reviews | PUT `/customer/orders/{id}/review`, `/customer/reservations/{id}/review`; GET `/customer/reviews`; DELETE `/customer/reviews/{id}` | One review per completed owned experience, rating 1–5, editing and withdrawal; author edits cannot reset moderator suppression |
| Notifications | GET `/customer/notifications`, `/customer/notifications/unread-count`; PUT `/customer/notifications/{id}/read` | Private in-app status notices and retry-safe read receipts |
| Support | GET/POST `/customer/support`; GET `/customer/support/{id}`; GET/POST `/customer/support/{id}/messages`; PUT `/customer/support/{id}/closure` | Owned cases and paginated customer messages, replay-safe creation/replies and closure; order/reservation references require ownership |
| Merchant public content | PUT `/businesses/{businessId}/branches/{branchId}/public-profile`, `/public-media`, `/packages/{id}/public-options` | Approved business owner/manager only, plus branch/tenant checks in the transaction; public metadata, ordered media and package guest/pricing/add-on rules |

Collections return `items` and nullable `nextOffset`; `limit` is 1–50 (default 20), `offset` 0–10000 (default 0). Stable ordering breaks timestamp ties by ID. Offset pages are not a frozen snapshot if records arrive during pagination. The feed uses the existing catalogue kinds as categories; it does not invent a separate lifestyle taxonomy or a recommendation engine.

Venue radius search requires both latitude and longitude; radius is 1–100 km (default 10), uses PostGIS geography in metres, and sorts by distance. Venues without configured coordinates are excluded only from radius results. Branch profile updates replace the public profile; omit/clear both coordinates to remove a location. Address/city text filtering remains available without geocoding or an external Maps account. Public API projections exclude onboarding applicants, private merchant contacts and customer identity subjects. Public reviews show the label `Verified customer`, never a profile name or subject ID.

All monetary values are decimal strings in minor units. Browse Plans defaults to NGN and compares budgets only within the selected currency; the displayed group total multiplies the base price by guests only for `per_guest` pricing. Budget filters apply to the base group price; selected add-ons can increase the final quote. Quotes add selected add-on quantities at current server prices. They report `capacityHeld: false` and `checkoutEnabled: false`: a quote neither reserves inventory nor asserts payment. Date filtering uses an exact timezone-qualified slot start, not a fuzzy calendar-day match. Required package components must remain active, published, in the same branch and currency. Add-ons are explicitly configured and limited to published same-branch products/services.

## Ownership, concurrency and abuse controls

Customer routes use M2 identity/account guards. Inputs cannot choose account subject, ownership, prices, totals, payment success or workflow status. Private resource lookups include the signed subject and return 404 for foreign IDs. Writes recheck account/profile state, issued-at revocation and session revocation within the transaction. A per-account transaction lock prevents conflicting same-account writes and profile lock upgrades; session revocation shares the same session lock. Account/profile, merchant approval, branch and catalogue locks coordinate changes with suspension, membership revocation and publication updates. Known contention/deadlock retry errors return a conflict rather than silently claiming success.

Reservation/order request keys are mandatory, scoped globally by customer and operation, and fingerprint normalized semantic input. Exact retries return the existing resource; changed input returns 409. Capacity, creation, key records and outbox events commit together. Atomic slot changes prevent overselling; resource row locks serialize customer cancellation with M3 merchant transitions. Order requests include the last displayed `expectedPriceMinor`; a changed price is rejected, and totals are recomputed using bigint. Wishlist changes, read receipts, review updates and support closure are retry-safe. Support case/reply keys detect changed-payload reuse. Cases allow at most 100 customer messages.

Database-backed fixed-minute budgets apply across API instances: 60 writes per account per minute, with narrower 10/minute support and review budgets. Rejected requests consume quota. A 429 includes `Retry-After: 60`; unavailable quota storage rejects writes with 503. Rate records occupy at most three rows per active account rather than growing with every minute. Reads remain bounded by pagination; the API pool has a five-second PostgreSQL statement timeout and six-second driver query timeout. Write transactions additionally limit lock waits to three seconds.

## Additive schema and integration

- `0010_m4_customer_workflows.sql`: private reservation guest name, customer-history indexes, reservation/order retry records.
- `0011_m4_marketplace_accounts.sql`: public branch profile/location, ordered public media, package public settings and add-ons, wishlist, verified reviews, notifications, support cases/messages and request budgets. Adds `pg_trgm` and PostGIS/trigram/history indexes. Existing migrations remain unchanged.

M4 reservations/orders use the existing M3 tables and merchant event names, so new records appear in merchant inboxes. Transactional database triggers create private notifications for both customer and merchant status changes, with one record per resource/status. Profile-less legacy merchant-assisted subjects are skipped; no fake accounts are created. These are in-app notifications only. Email/push delivery, operator replies/moderation UI and financial support actions remain their respective later workstreams.

Media APIs accept only public HTTPS URLs on an exact host allowlist configured through `PUBLIC_MEDIA_HOSTS` (comma-separated hostnames, without scheme, path or wildcard). Credentials, signed query strings, fragments and custom ports are rejected. Media URLs are not fetched by the API. Up to 20 images per venue or offering are stored with plain-text alt text and stable order; identical replacement preserves existing IDs. Without configured public media hosts, nonempty media writes return 503. Private onboarding documents are never promoted to public media. Upload provisioning belongs to the existing storage infrastructure; this API stores approved public references.

Deploy migrations before the new API and grant the runtime only the documented application-table DML plus notification-trigger execution; schema/migration ownership remains separate. Reverting the API can leave additive tables/columns in place. Preserve retry records and guest/support data during rollback to prevent duplicate creation after redeployment. Production retention/deletion policies remain part of release review, not an implicit database purge.

## Scope boundaries and consumer handoff

M3 reservations begin at `confirmed` and do not model payment holds. Customer confirmation therefore remains restricted to **free services**. M5 owns paid holds/expiry, independently verified confirmation, gateway/ledger/refunds and ticket inventory/history. Orders enter `placed` without claiming payment. Product stock is not modeled by M3; this implementation enforces publication/availability but does not claim stock tracking. M6 owns recommendation logic and transactional package booking/capacity composition; M4 supplies browsable package data and nonbinding quotes. M8 owns privileged support responses/moderation/operational administration. P2 owns canonical web routes, structured SEO markup, accessibility, browser performance and client applications; the public GET APIs support server-rendered/indexable content without exposing private records.

P2/P3 can prepare clients against the committed DTO/operation definitions, then regenerate typed clients from the locally generated and reviewed OpenAPI snapshot. Only consumer-reviewed, locally accepted contracts should be treated as accepted live integrations. This phase does not assert client, payment, all-phase milestone or production readiness.

## Consolidated local verification after implementation

In the local checkout on the feature branch:

```bash
corepack pnpm@9.15.9 install --frozen-lockfile
bash tooling/prepare-m4-contracts.sh
git diff -- packages/api_contracts/openapi.json
```

Review and commit the generated snapshot when it changes, then run from a clean tree:

```bash
bash tooling/run-m4-p1-disposable.sh
```

The preparation script generates the contract without connecting to a database; it asserts all 38 owned operations, response/body schemas, required path/query parameters and bearer declarations, and preserves existing M2/M3 definitions. Generation is still pending locally for this expanded implementation.

The consolidated launcher creates a disposable loopback PostgreSQL 16/PostGIS/pg_trgm cluster with generated credentials and separate administrator/migrator/runtime roles, plus an inaccessible identity sentinel database. It refuses root, the wrong branch or a dirty checkout. Set `FAJI_PG_BIN` if binaries are elsewhere. No production credentials, GitHub Actions runner or payment-provider account is required.

The consolidated sequence covers source/database/test TypeScript checks; lint/build; all migrations and foundation migration/rollback/privilege/sentinel tests; the complete API suite including inherited M2 database checks; both M4 real PostgreSQL acceptance files; synthetic query-plan evidence; OpenAPI regeneration and snapshot equality; whitespace checks; dependency audit at the high/critical gate. It records the exact unchanged commit, per-check exit status and TAP pass/fail/skipped counts in a persistent local `/tmp/fajify-m4-report.*` directory with `acceptance.json`. The reporter requires exactly one successful record for every required gate and a complete, nonempty TAP summary for each test stage. Missing/duplicate records, failures, cancelled, skipped or todo tests prevent PASS. Reporter regression tests are included in the local run. The disposable database cluster is removed while evidence remains available. If PostgreSQL cannot stop, its data directory is preserved for recovery; cleanup failure returns a nonzero status and downgrades the acceptance report to FAIL. The query-plan fixture rolls back its 3,000 synthetic catalogue rows and is not a claim of production load capacity.

Prepared database scenarios cover capacity contention, exactly-once retry effects/outbox records, cancellation release, ownership isolation, merchant inbox/status integration, paid/past-slot denial, revoked access, foreign/stale catalogue items, merchant public-content authorization, PostGIS radius selection, package guest/date/currency/budget/add-on rules, wishlist publication changes, completed-experience reviews and moderator suppression, notification privacy/idempotency, support retries/closure and shared write budgets across two API instances.

No current acceptance count or successful migration claim is made until those local commands run at the final source commit and failures are resolved. Keep PR #16 draft until consolidated local results and P2/P3 contract review are recorded.

## Local verification progress

The local run at `a441dd1869fef68a3e48545133f251e632831e71` passed disposable-target validation, database/API/M4-test TypeScript checks, lint, build, all 11 migrations, runtime grants and all four reporter tests. Foundation database tests passed 10/11; the spatial-index fixture failed because it attempted temporary-table creation with the restricted runtime role. API tests, M4 acceptance, query-plan evidence, final contract equality and audit were not reached. The disposable cluster was stopped and removed.

The fixture now exercises PostGIS calculations through the runtime role and performs temporary-table/index setup through the migration role. Runtime privileges are unchanged. This correction is pending the next consolidated local run; it is not a passing phase acceptance result.
