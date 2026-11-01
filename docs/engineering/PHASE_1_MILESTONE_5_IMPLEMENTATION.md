# M5 · Phase 1 · Payments, ticketing and financial operations

## Baseline and delivery status

Started 1 November 2026 (Africa/Lagos), from `main` at
`728fd1ca457f838e4e8a365e963420bce7b49bac` (merged M3-P1).
Branch: `feat/m5-p1-payment-foundation`.

This is the first backend increment, **not M5-P1 acceptance**. The canonical scope is
[MILESTONES.md](MILESTONES.md), sections 5.1–5.6, with responsibilities in
[FOUR_PHASE_MODEL.md](../roadmap/FOUR_PHASE_MODEL.md).
Read alongside the system architecture and repository delivery standards.

At kickoff, connected GitHub `main` contains M3 merchant APIs, but no M4 customer
checkout APIs; a branch-name search returned no M4 branch. M4 may be underway
elsewhere. Coordinate its authoritative quote/hold contracts and migration numbers
before integrating. Do not replace M3 merchant reservations with paid bookings.

## Implemented in increment 1

- Paystack is the initial provider behind a separate gateway class. No new dependency.
- `POST /api/v1/payments/webhooks/paystack` verifies HMAC-SHA512 over exact raw bytes
  using constant-time comparison, then independently verifies the reference with Paystack.
- Only a successful verification with matching reference, amount, currency and test/live
  domain can transition a known pending payment intent. NGN integer minor units only.
  Browser returns and notification amount/status fields cannot mark a payment successful.
- Unknown references never create intents. Invalid signatures perform no database or
  provider work. Other signed event types are acknowledged without financial effects;
  refund/dispute/transfer handlers are still pending.
- Row locking, unique provider transaction identity, one receipt and one journal per
  intent prevent repeat posting. A replay repeats independent verification, then performs
  no financial/audit/outbox inserts. Provider failures return 503 for retry.
- Receipt, journal, success transition, audit and outbox event are one transaction.
- Migration `0010_m5_payment_foundation.sql` stores durable intents and receipts.
  Each journal row explicitly pairs one debit with an equal credit. Account/currency
  foreign keys and deferred reconciliation triggers enforce matching amounts at commit.
  Receipt/journal/account mutation and successful intent rewrites are rejected.
- Captured funds debit `gateway_clearing` and credit `customer_funds`. This records
  gross funds awaiting allocation; it does **not** calculate merchant earnings, fees,
  commission, settlement eligibility or available balances.

There is intentionally no public intent-creation or browser-success endpoint in this
increment. No application flow can yet create a payment intent. Database fixture inserts
are test setup only. A trusted domain purchase/hold and authenticated customer ownership
must be integrated before a checkout API is exposed. No customer/client amount is trusted.

## Configuration and provider contract

Set `PAYSTACK_SECRET_KEY` through the deployment secret manager (`sk_test_...` for
sandbox, `sk_live_...` for live). An absent/invalid key makes the payment route unavailable;
it does not prevent unrelated API routes from starting. No secret is committed or logged.
Only the fixed HTTPS Paystack verification endpoint is called, with a 10-second timeout
and redirects rejected. The adapter validates provider response shape and masks failures.

Configure the versioned webhook URL in the matching Paystack environment only after
the migration and integration checks pass. Raw body capture is enabled in API bootstrap.
Custom test/server bootstraps using this controller must also use `{rawBody:true}`.

Provider references:
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/verify-payments/
- https://paystack.com/docs/api/transaction/

## Remaining M5-P1 work

| Work package | Required next delivery |
| --- | --- |
| 5.1 Gateway | Authenticated intent initialization from a persisted server quote, ownership checks, request-key conflict checks, initialization timeout/recovery and provider sandbox acceptance |
| 5.2 Ledger | Account ownership model, commission/fees policy, merchant payables, account balances, reconciliation and restricted runtime-role evidence |
| 5.3 Paid bookings | M4 capacity holds, immutable purchase snapshot, expiry/retry and late-payment resolution; confirm once only after verified capture |
| 5.4 Tickets | Inventory reservation, opaque QR tokens, authorized atomic single-use redemption and concurrent redemption tests |
| 5.5 Refunds/disputes | Authorized policy decisions, compensating journals, provider state/retries, chargebacks and reconciliation |
| 5.6 Settlements | Eligibility, payout batches, privileged approval, provider confirmation, reversals and reconciliation |
| Shared | Customer/merchant/admin read contracts, tenant isolation, outbox consumers, reconciliation worker, monitoring and integrated exact-commit acceptance |

Resolve commercial commission, refund and settlement policies before enabling corresponding
financial actions. Do not infer a fee percentage or payout schedule from this foundation.

## Verification and acceptance limits

Initial local verification: nine new unit/HTTP tests pass; API source typecheck, lint,
build and database package typecheck pass; OpenAPI is regenerated through NestJS with
a required signed-webhook contract assertion. The non-database regression suite is run
separately from the database suite.

The default API test command also includes eight existing M2 database cases. These fail
without the explicitly marked migration/runtime databases; they are not skipped or
reported as passing. No PostgreSQL server or Docker is available in this execution host,
so the new migration, database constraints and concurrent real-database replay gate remain
**unverified**. Unit mocks are not evidence of database concurrency correctness.

Run on a newly created, disposable PostgreSQL 16/PostGIS database only:

```bash
# Supply the migration-owner URL via environment; do not put credentials in this file.
export FAJI_DISPOSABLE_DATABASE=fajify_m5_test_acceptance
# The database must have this matching server-side comment, set by its operator:
# COMMENT ON DATABASE fajify_m5_test_acceptance IS 'fajify:m5:disposable';
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @faji/api typecheck
corepack pnpm --filter @faji/api lint
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/api test:m5:database
```

The database command refuses an unmarked database, applies all migrations twice, checks
12 concurrent replay attempts, checks exactly one receipt/journal/audit/outbox event,
rejects historical rewrites, rejects success without a journal and rolls back a mismatched
journal at commit. It retains synthetic immutable evidence; discard the entire disposable
database after review. Run full historical M2/M3 acceptance with their separate restricted
runtime role and sentinel configuration as well. Real provider sandbox and live-money
tests have not run.

## Migration and review

Migration 0010 adds tables/functions/triggers without changing existing M3 data. Coordinate
its sequence with concurrent M4 work before merge. Keep this delivery as a draft until
PostgreSQL acceptance and review pass. Runtime grants must be explicitly scoped; `PUBLIC`
has no finance table privileges. Runtime roles must not own these tables or receive
TRUNCATE/DDL privileges. Migration-owner acceptance alone is not least-privilege evidence.

Rollback an unactivated application deployment by returning to its previous version while
retaining the new finance tables. Do not delete receipts or journal history. An applied
migration must not be edited; correct defects in a subsequent migration. No deployment,
provider registration, live charge, payout, merge or milestone acceptance is authorized
by this implementation record.
