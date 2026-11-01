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

Follow-up: M4 branch `feat/m4-p1-customer-platform` is now visible at
`67ebc0add0ac0c402d706420a0eeca7bd1f7e8f0`. Its documented reservation creation
supports free services, while product orders do not imply payment. M5 work can continue
in parallel; the proposed handoff is [M4/M5 payment boundary](../api/M4_M5_PAYMENT_BOUNDARY.md).
M4 keeps migration 0010; M5's unaccepted foundation is renumbered to 0011.

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
- Migration `0011_m5_payment_foundation.sql` stores durable intents and receipts.
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

## Implemented in increment 2

- `GET /api/v1/customer/payments/{id}` requires a signed active account and scopes the
  query to its subject. Missing and foreign IDs both return 404. The response explicitly
  projects status, exact decimal minor-unit amount, currency and timestamps, without
  exposing provider references, other customer identities or internal records. Reading
  `succeeded` describes capture only; it does not assert booking or ticket confirmation.
- `GET /api/v1/admin/finance/payments/{id}/reconciliation` requires the admin client,
  platform-admin role, fresh MFA, active/unrevoked account and the existing database-backed
  privileged request quota. It records an attributed read audit before returning data.
- Reconciliation reads a single database snapshot and compares receipt, journal amount,
  currency/account pair, verification timestamp and exactly one capture audit/outbox
  event. Missing, mismatched or duplicate effects are reported without rewriting finance
  history. `scope=internal_capture` and `providerReconciliation=not_checked` make clear
  that this is not provider-statement, merchant-balance or payout reconciliation.
- OpenAPI explicitly describes protected response schemas and UUID parameters. New tests
  cover cross-customer reads, revoked/suspended identities, admin assurance/quota failures,
  missing/duplicate evidence, maximum-safe exact money values and audit failure handling.
- The guarded database harness now requires distinct migration/runtime roles. It runs
  payment processing and reads through the runtime role, rejects DDL/TRUNCATE/migration
  access, checks real ownership isolation and reports duplicate outbox effects.
- `tooling/run-m5-p1-disposable.sh` creates and cleans an isolated loopback PostgreSQL
  cluster with generated credentials, applies migrations, runs the inherited API tests
  and the M5 database harness, and records the exact source commit. It refuses a dirty
  or wrong branch and refuses root. It is prepared and syntax-checked, not executed here.

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
| 5.2 Ledger | Account ownership model, commission/fees policy, merchant payables, balances, provider-statement reconciliation and execution of restricted runtime-role checks |
| 5.3 Paid bookings | M4 capacity holds, immutable purchase snapshot, expiry/retry and late-payment resolution; confirm once only after verified capture |
| 5.4 Tickets | Inventory reservation, opaque QR tokens, authorized atomic single-use redemption and concurrent redemption tests |
| 5.5 Refunds/disputes | Authorized policy decisions, compensating journals, provider state/retries, chargebacks and reconciliation |
| 5.6 Settlements | Eligibility, payout batches, privileged approval, provider confirmation, reversals and reconciliation |
| Shared | Merchant finance/read contracts, integrated tenant-isolation acceptance, outbox consumers, provider reconciliation worker, monitoring and integrated exact-commit acceptance |

Resolve commercial commission, refund and settlement policies before enabling corresponding
financial actions. Do not infer a fee percentage or payout schedule from this foundation.

## Verification and acceptance limits

Latest local verification: all 106 tests that do not require a database pass, including
18 M5 unit/HTTP tests, with none skipped in that selected suite. API source and new-test
typechecks, lint/build and database package typecheck pass. OpenAPI is regenerated
through NestJS with required signed-webhook and protected read-contract assertions.
The disposable launcher passes `bash -n`. Database checks are a separate gate.

The default API test command also includes eight existing M2 database cases. These fail
without the explicitly marked migration/runtime databases; they are not skipped or
reported as passing. No PostgreSQL server or Docker is available in this execution host,
so the new migration, database constraints and concurrent real-database replay gate remain
**unverified**. Unit mocks are not evidence of database concurrency correctness.

Run from a clean checkout as an unprivileged user on a PostgreSQL 16/PostGIS machine:

```bash
corepack pnpm install --frozen-lockfile
bash tooling/run-m5-p1-disposable.sh
```

For an operator-managed disposable target, `test:m5:database` requires both
`FAJI_DATABASE_URL` (migration owner) and `FAJI_RUNTIME_DATABASE_URL` (restricted role),
plus a matching `FAJI_DISPOSABLE_DATABASE=fajify_m5_test_...` and database comment
`fajify:m5:disposable`. Both URLs must identify the same marked PostgreSQL 16 database
with different users. The acceptance harness grants scoped runtime privileges only in
that explicit disposable database. Credentials must be supplied through the environment.

The database command refuses an unmarked database, applies all migrations twice, checks
12 concurrent replay attempts, checks exactly one receipt/journal/audit/outbox event,
rejects historical rewrites, rejects success without a journal and rolls back a mismatched
journal at commit. The harness retains synthetic immutable evidence in an operator-managed
database; the launcher removes its entire temporary cluster on exit. Run full historical M2/M3 acceptance with their separate restricted
runtime role and sentinel configuration as well. Real provider sandbox and live-money
tests have not run.

## Migration and review

Migration 0011 adds tables/functions/triggers without changing existing M3 data. The earlier
draft was named `0010_m5_payment_foundation.sql`; it was renumbered before recorded database
acceptance to reserve 0010 for M4. If that older draft was applied to a disposable target,
recreate the target; do not apply the renamed duplicate over existing finance tables.
Keep this delivery as a draft until
PostgreSQL acceptance and review pass. Runtime grants must be explicitly scoped; `PUBLIC`
has no finance table privileges. Runtime roles must not own these tables or receive
TRUNCATE/DDL privileges. Migration-owner acceptance alone is not least-privilege evidence.

Rollback an unactivated application deployment by returning to its previous version while
retaining the new finance tables. Do not delete receipts or journal history. An applied
migration must not be edited; correct defects in a subsequent migration. No deployment,
provider registration, live charge, payout, merge or milestone acceptance is authorized
by this implementation record.
