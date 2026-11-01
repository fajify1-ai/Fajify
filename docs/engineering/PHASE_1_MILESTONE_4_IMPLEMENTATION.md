# M4 · Phase 1 · Customer backend

Status: **in progress — first implementation increment; not accepted for merge**.

Base: `main` at `728fd1ca457f838e4e8a365e963420bce7b49bac`.
Branch: `feat/m4-p1-customer-platform`.

## Sources and scope

Scope follows [MILESTONES.md](MILESTONES.md), [four-phase ownership](../roadmap/FOUR_PHASE_MODEL.md), [delivery standards](REPOSITORY_AND_DELIVERY.md), [system architecture](../architecture/SYSTEM_ARCHITECTURE.md) and the M3 backend implementation. The M4 Phase 2 Customer and Phase 3 Business PDF handovers were also reviewed: customer operations must use approved APIs, appear in merchant workflows, enforce tenant/customer isolation, and handle retries/capacity conflicts.

M4-P1 owns backend APIs, persistence, contracts and acceptance. Customer Flutter/Next.js and Business Flutter implementation remain with P2/P3. This increment introduces the shared customer workflow foundation; it does not close the entire M4 roadmap.

## Implemented routes

All paths below are under `/api/v1`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/discovery/offerings` | Public, published offerings from approved merchants and active branches; literal text search, address location filter, catalogue category and branch filters |
| GET | `/discovery/offerings/{id}` | Explicit public merchant/branch/catalogue fields, price as a decimal string |
| GET | `/discovery/offerings/{id}/availability` | Future active slots with remaining capacity; authoritative check repeats when reserving |
| POST | `/customer/reservations` | Active signed account; free service reservation, guest name, required retry key |
| GET | `/customer/reservations` | Current customer's history |
| GET | `/customer/reservations/{id}` | Current customer's reservation only |
| POST | `/customer/reservations/{id}/cancellation` | Before slot start, while confirmed; duplicate calls release capacity once |
| POST | `/customer/orders` | Product order, server price snapshot/total, required retry key |
| GET | `/customer/orders` | Current customer's history |
| GET | `/customer/orders/{id}` | Private order detail and historical item-price snapshots |
| POST | `/customer/orders/{id}/cancellation` | While placed; closes once merchant accepts; retry safe |

Lists use `limit` (1–50, default 20), `offset` (0–10000, default 0), and return `items` plus nullable `nextOffset`. Ordering is deterministic, but offset pages are not a frozen snapshot when new rows arrive. Category means the current catalogue `kind`: product, service, package or event. Location matches branch address text, not radius or GPS distance. Discovery is a listing/feed of offerings; it does not claim venue recommendations or a geographic ranking algorithm.

Customer routes use M2 `IdentityGuard` and `AccountGuard`. Requests cannot supply customer subject, prices, total, merchant ID, payment status or booking status. Ownership comes from the signed identity. Foreign IDs return 404. Order lines include `expectedPriceMinor` as the last displayed decimal minor-unit price; a mismatch returns 409 and requires refresh. IDs and requests are validated strictly. Returned public rows are explicitly projected; onboarding applicant, membership and private contact fields are not exposed.

See the generated [OpenAPI contract](../../packages/api_contracts/openapi.json) for exact bodies, query/path parameters, bearer declarations and response schemas. Contracts are reviewable draft APIs until acceptance; P2/P3 may prepare typed adapters against them, with live integration awaiting acceptance.

## Persistence and concurrency

Migration `0010_m4_customer_workflows.sql` adds a private reservation guest name, customer-history indexes, and `customer_request_keys`. It does not replace any historic migration. Keys are scoped to customer and operation globally, including across branches; semantic input is fingerprinted. UUID spelling and order line order are normalized. The key record, capacity/order writes and merchant outbox event commit together. An exact replay returns the existing resource, including its current status; a changed request with the same key returns 409. Failed writes roll back the key, so a rejected attempt may be corrected and retried.

M4 reuses M3 reservation/order tables and merchant event names, so customer-generated records enter the existing merchant inbox. M4's service owns customer creation/cancellation rules; M3 retains merchant fulfilment/check-in transitions. Cancellation locks the same resource rows as merchant transitions. Atomic slot updates enforce capacity. Catalogue, branch and merchant approval locks protect creation against concurrent unpublishing or disabling; all contributing product rows are locked in a consistent ID order. Customer account/profile locks serialize writes against suspension/revocation cutoff changes.

The existing session revoker now takes the same session advisory lock as customer writes. This gives logout and the M4 transaction a defined order, with no in-memory revocation cache. No historical authors or branches were changed.

## Payment and booking boundary

M3's reservation state machine starts at `confirmed`; it has no payment hold/pending state. Confirming a paid customer reservation through that state machine would bypass M5's verified-payment requirement. This increment therefore accepts **free services only**. Paid services, event tickets and composed-package booking are rejected rather than confirmed without payment/capacity coordination. M5 must introduce paid holds/expiry/verified confirmation, and package capacity integration needs its own contract.

Orders enter `placed` with an authoritative total; placement does not assert payment or create gateway, ledger or settlement records. Product stock is not modeled in M3: published/active checks are supported, stock inventory is not claimed. Customer cancellation after merchant acceptance needs the later support/refund workflow.

## Verification

Executed with Node 24.22.1 and repository-pinned pnpm 9.15.9:

- API source typecheck, M4 tests/acceptance harness typecheck, database package typecheck: passed.
- API ESLint and Nest build: passed.
- All 95 API tests that do not require PostgreSQL: passed, none skipped in that selected suite. This includes 7 new M4 tests and the changed session-revocation tests.
- OpenAPI generated successfully; exporter asserts all 11 customer operations, response/request schemas, resource path parameters, pagination and protected bearer declarations while retaining M3 checks.
- Both shell launchers pass `bash -n`; tracked diff passes `git diff --check`.

**Database verification is pending.** This environment has no PostgreSQL/PostGIS server or separate runtime/migration targets. Directly invoking the M4 database harness without its disposable marker failed at its prerequisite hook, before any database connection or application assertion. The 5 database scenarios are not reported as passed. The 95-test result excludes inherited M2 PostgreSQL tests; it is not the full API acceptance gate.

Run in a clean checkout of the feature branch on the developer's PostgreSQL 16/PostGIS machine:

```bash
corepack pnpm@9.15.9 install --frozen-lockfile
bash tooling/run-m4-p1-disposable.sh
```

The launcher creates an isolated loopback cluster, generated credentials, a marked database and distinct migration/runtime roles; rejects root and an uncommitted/wrong branch; applies migrations and scoped grants; runs inherited API tests and 5 new real PostgreSQL scenarios; then cleans up. Set `FAJI_PG_BIN` if PostgreSQL 16 binaries are installed elsewhere. Ensure `pnpm` resolves to the repository's pinned 9.15.9 version. No production URLs are required. Record the exact tested commit and complete output in the PR. A regenerated OpenAPI diff requires review and commit before a clean rerun.

The PostgreSQL scenarios cover public eligibility, two customers contending for one seat, parallel identical reservation/order retries, a single outbox event per creation, repeat cancellation, ownership isolation, paid/past-slot denial, revoked sessions, foreign-branch items, stale price rejection, merchant inbox visibility and merchant acceptance closing customer cancellation.

## Remaining M4-P1 work

1. Execute PostgreSQL migrations, least-privilege/runtime and concurrency acceptance; fix any failures before acceptance.
2. Add richer branch/venue details and media contracts, public event/package component views, and complete Browse Plans filtering (budget, group/date, add-ons). M6 retains recommendation logic.
3. Define and implement the remaining M4 account APIs: wishlist, reviews, in-app notifications and support; reuse M2 profile/identity where appropriate. Paid ticket inventory remains M5.
4. Add customer write abuse/rate controls and bounded-load/query-plan verification on realistic synthetic data.
5. Review query limits, cancellation policy and additive schema with P2/P3; run actual customer-to-merchant integration. Frontend SEO/performance belongs to P2 and needs backend support where gaps are found.
6. Review and accept the phase before merging. No production deployment or all-phase M4 completion is asserted.

## Migration rollout and recovery

Deploy the additive migration before the new API. Runtime grants must include DML on `customer_request_keys` and retain existing M3/M2 tables; runtime must not own schema or migrations. Reverting the API leaves additive columns/tables harmlessly present. Avoid dropping retry records or guest data during rollback: removing keys can allow duplicates on a subsequent rollout. Retention/privacy policy for guest names and retry records remains a release-review item. Existing M3 clients are compatible: the added guest column is nullable and existing creation paths are unchanged.
