# M5 · Phase 1 · Payments, ticketing and financial operations

Engineering implementation covers work packages 5.1–5.6 on
`feat/m5-p1-payment-foundation`, based on the accepted M4-P1 merge
`b393483066d01cda13b491d1eda89ad2dc4222a5`. PR: https://github.com/fajify1-ai/Fajify/pull/17.
Consolidated local PostgreSQL acceptance and review are pending. This record does not
mark M5 or its other phases accepted.

## Delivered scope

| Package | Backend implementation | Primary verification |
| --- | --- | --- |
| 5.1 Gateway | Bound order intents; server-priced service/event holds; durable Paystack initialization; stable references; signed raw webhooks; independent capture verification; same-reference initialization recovery; explicit independently verified failed order retries | Existing capture/recovery tests; lifecycle HTTP tests; fake-provider adapter tests; PostgreSQL lifecycle scenarios |
| 5.2 Ledger | Immutable capture evidence; balanced debit/credit transfers; merchant-owned payable/recovery accounts; explicit versioned commission and fee policies; purchase snapshots; fee allocation, audit, private balances | Exact BigInt conservation/rounding tests; immutable/scope checks and fee assertions in PostgreSQL acceptance |
| 5.3 Paid bookings | Atomic shared capacity holds; checkout; confirm once inside capture transaction; expiration; policy-bound cancellation; late or superseded capture becomes a refund obligation | Concurrent seat/retry/expiry/capture/cancellation scenarios |
| 5.4 Tickets | Merchant-configured event inventory; atomic holds and issuance; owned history; opaque signed QR tokens with retained key versions; branch-authorized single redemption and revocation | Signing/tamper/rotation tests; concurrent redemption and wrong-branch PostgreSQL scenarios |
| 5.5 Refunds/disputes | Customer requests; privileged decisions; reserves before provider submission; canonical provider confirmation; compensating failure journals; ambiguous response discovery; external refund adoption; chargeback reserves and partial loss/win resolution | Lost-response/no-repeat-POST tests; partial/failed/excess refunds, disputes and compensating journals in PostgreSQL scenarios |
| 5.6 Settlements | Verified recipient registration; actual fulfilment and delay eligibility; concurrent batch claims; explicit privileged batch approval; stable transfer reference; OTP; provider confirmation; payout fees, reversals and recovery-only batches | Concurrent batch, OTP, successful transfer, reversal, post-payout refund and receivable recovery scenarios |
| Shared | Protected customer/merchant/admin APIs; complete OpenAPI; durable outbox consumption and leased financial jobs; periodic canonical provider reconciliation; bounded exception/job/audit views and privileged dead-job retry | Route inventory/HTTP tests; worker recovery/dead-letter scenarios; one consolidated exact-commit runner/report |

## Purchase and accounting rules

Preparation (`POST /customer/orders/{id}/payment-intent`) creates one durable bound intent
from an owned M4 order. Only its retry key is client supplied. Preparation returns
`checkoutEnabled: false`; checkout is a separate action. No product stock guarantee is
introduced where M4 has no stock model.

Paid services and tickets begin with `POST /customer/paid-holds`. `sourceId` identifies an
availability slot for a reservation or an event catalogue item for tickets. Quantity,
guest name and a customer-scoped retry key are accepted; price, business, currency,
identity, reference and success are selected by the server. Identical retries reuse the
snapshot. Holds share the existing reservation capacity counters. Event capacity cannot
exceed the merchant's event maximum. Paid slot times and committed event schedules are
protected from later edits.

Checkout accepts only a receipt email. Its HTTPS callback URL comes from server
configuration. Email never establishes ownership. The initialization command is persisted
before the outbound request; retries reuse its reference. A lost response remains uncertain.
An administrator can retry initialization with the same reference after 30 seconds; a
provider duplicate-reference error remains uncertain and does not mint another reference.
A new order attempt requires a separate explicit retry command and canonical evidence
that the prior reference failed or was abandoned. Late success on the superseded attempt
is captured and refunded, without confirming a second purchase.

A browser redirect does not confirm anything. Only an independently verified successful
provider transaction matching reference, integer amount, NGN currency, environment and
transaction identity may create the receipt and capture journal. Purchase confirmation,
capacity conversion/ticket issuance, audit and outbox commit in that same transaction.
Expired, cancelled, disabled or superseded purchases retain their capture evidence and
create a full remaining refund obligation. They cannot recreate inventory automatically.

Original capture debits `gateway_clearing` and credits `customer_funds`. Versioned approved
policy snapshots split gross funds into merchant share and commission using integer
arithmetic. Canonical provider fees are posted explicitly; unknown or mismatched fees
block settlement through a reconciliation case. Merchant-borne fees exceeding earned
funds create recovery debt. `finance_all_postings` unifies captures and compensating entries.
Each row contains one debit and equal credit. No financial history is rewritten.

Refund approval reserves the remaining captured amount before contacting the provider.
Commission reversals use cumulative rounding and actual prior surviving refund funding,
including after a failed partial refund. Customer requests do not move money until approved.
Ticket purchases require a full remaining refund; full approval revokes unused tickets or
cancels an unfulfilled order/reservation. Already consumed resources can receive an explicit
support refund, while their usage history remains intact. Customer cancellation also obeys
the snapshotted refund window and start cutoff.

Paystack refund creation has no documented idempotency key. An ambiguous POST is never
resent automatically. The worker searches the exact local `merchant_note` and transaction,
or an administrator attaches a verified matching provider refund ID. A provider-dashboard
refund can be adopted with its canonical transaction/amount/currency/environment checked.
Pending refunds retain reserves; only canonical `processed` consumes them and canonical
`failed` releases their original funding. A failed obligation needs a new explicit request
and approval, not a rewrite of its terminal history.

Disputes reserve exposure before settlement; only independently fetched final resolution
releases it or records loss. A partial loss consumes only the verified amount. Open/lost
dispute exposure blocks further refund approval to prevent overlapping compensation.
After payout, merchant liabilities become recovery debt instead of negative available funds.

Settlements use completed orders/reservations or ended events plus the configured delay.
Outstanding refund requests, disputes, exceptions and claimed payouts exclude funds.
Privileged batch creation is the approval action. It snapshots the verified recipient,
environment and payout fee bearer. Funds are reserved before transfer submission, and
only verified provider success clears the reserve. Transfers reuse one stable reference;
OTP is sent only by a fresh-MFA administrator and is never stored. A confirmed reversal
creates compensating entries and releases claims. Subsequent eligible funds first recover
merchant debt; a zero-cash recovery-only batch persists that command idempotently.

## APIs and client integration

All paths below begin `/api/v1`; the full machine-readable schemas are in
`packages/api_contracts/openapi.json`. Existing M1–M4 and prior M5 schemas/paths are preserved.
Collections accept bounded `limit`/`offset`. Customer holds, refunds and tickets return
`{items,nextOffset}`. Merchant/admin grouped collections use bounded arrays per section.

| Caller | Operations |
| --- | --- |
| Customer | Prepare order intent; create/list/cancel paid holds; initialize checkout; explicit failed order retry; owned payment status/recheck; request/list refunds; list owned ticket QR tokens |
| Merchant owner/manager | Finance policy/balance/payment/batch projection; configure event ticket inventory |
| Merchant owner/manager or branch-granted staff | Redeem a signed ticket within its business, branch and event time window |
| Finance administrator | Create/list policy versions; checkout retry; request/approve/reject/reconcile/link/adopt refunds; verify/disable recipient; approve/cancel/reconcile settlement; submit OTP; reconcile/resolve dispute; bounded operations/audit history; retry dead jobs |
| Paystack | Exact-byte HMAC-SHA512 webhook; charge/refund/transfer/dispute events trigger independent provider reads |

Customer/merchant routes require signed active, unrevoked identities and database-backed
write budgets. Customer reads never expose another subject's purchase. Merchant finance
requires current business membership; staff redemption also checks branch grant. Admin
routes require platform-admin, `faji-admin-web`, the configured MFA ACR and authentication
within five minutes, plus the privileged request budget. Client-selected amount/status/
reference/actor overrides are rejected. QR tokens, access codes and OTP must not be logged.
Payment reads describe capture; clients use hold/ticket/order state for fulfilment.

The authoritative boundaries are also documented in [M4/M5 payment boundary](../api/M4_M5_PAYMENT_BOUNDARY.md).

## Runtime configuration and worker

| Variable | Requirement |
| --- | --- |
| `FAJI_DATABASE_URL` | API/finance worker restricted runtime role; separate from migration owner and Keycloak database |
| `PAYSTACK_SECRET_KEY` | Secret manager value in matching test/live domain; missing key disables payment actions, not unrelated APIs |
| `PAYMENT_CALLBACK_URL` | Operator-controlled HTTPS return page; never a success authority |
| `TICKET_SIGNING_KEYS` | Secret JSON object of key ID to 64 hexadecimal characters; keep previous keys while issued tickets remain usable |
| `TICKET_ACTIVE_KEY_ID` | Current key ID, 1–80 alphanumeric/underscore/hyphen characters |
| `FINANCE_RECONCILE_INTERVAL_SECONDS` | Periodic successful payment/transfer recheck interval; default 900, bounded 30–86400 |

API/worker share the same provider domain and key ring. Test and live finances must use
separate databases; a singleton environment guard rejects mixed captured environments.
No production commission, refund window or settlement schedule is invented: an administrator
must create a complete approved policy for each approved merchant. Policy values are
immutable versions. Gateway-fee policy is snapshotted per purchase; payout-fee policy is
snapshotted per settlement approval.

Build the API, then run the HTTP process and financial worker as separate supervised processes:

```bash
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/api start
# Separate process, using the same runtime configuration:
corepack pnpm --filter @faji/api worker:finance
```

The financial worker uses PostgreSQL durable jobs, distinct from the existing notification
worker. It consumes its own outbox markers without changing notification delivery markers.
Leases use UUID fencing and expire after two minutes; each row's lease is renewed before
execution. Errors back off and dead-letter after eight attempts; diagnostics retain only
error class, never payload or secrets. Expected provider-pending states poll without using
up the error budget. Successful payments/transfers remain on periodic reconciliation to
detect external refunds, disputes, reversals and fee changes. SIGTERM/SIGINT finish the
current tick and close the pool. `node apps/api/dist/payments/m5-worker.js --once` runs one
tick and fails its process if maintenance fails.

`GET /admin/finance/operations` exposes unresolved cases, pending/uncertain refunds, payout
states and non-done/dead jobs. `GET /admin/finance/audit` exposes attributed operation events.
Operators should alert on dead jobs, stale leases, long-pending/uncertain obligations, open
reconciliation cases and worker `finance_worker_tick_failed` events. Dead-job retry is an
audited admin action; it reuses the original financial operation identity. Never edit
journals or clear reserves manually to make an exception disappear.

## Migration, privileges and rollback

Historical migrations `0011_m5_payment_foundation`, `0012_m5_receipt_evidence` and
`0013_m5_order_intents` are unchanged. The additive lifecycle is migration
`0014_m5_financial_lifecycle.sql`. M4's distinct `0011_m4_marketplace_accounts.sql` coexists;
the runner orders full filenames and validates checksums. This new, unapplied migration
must pass local acceptance before activation. If an earlier draft was applied to a
disposable target, recreate the target; never edit checksums or duplicate renamed tables.
New references use Paystack-compatible hyphens; legacy underscore references cannot be
initialized. Existing captured evidence remains readable. Do not activate checkout on
previous unaccepted fixture databases.

Finance tables/views revoke PUBLIC privileges. Production runtime must not own tables or
receive DDL/TRUNCATE/migration-history access. The enumerated permission matrix is in
`packages/database/scripts/grant-m5-runtime.ts`; its executable intentionally refuses
non-disposable targets. Apply equivalent explicit grants through the deployment's migration
owner to the selected runtime role. Stateful finance tables permit SELECT/INSERT/UPDATE;
append-only tables permit SELECT/INSERT; settlement claims alone need DELETE for release;
financial views are SELECT only. Capture journals and snapshots also enforce immutable
history in database triggers.

Roll back by stopping checkout and finance workers and returning application code to the
previous version while retaining finance data and migration history. Review in-flight
provider obligations first. Do not delete financial records or automatically reverse
provider funds as a code rollback.

## Consolidated local verification

On a clean checkout of this branch, as an unprivileged user, with Node 20+,
repository-pinned pnpm 9.15.9 and PostgreSQL 16 with PostGIS and pg_trgm installed:

```bash
corepack pnpm install --frozen-lockfile
bash tooling/run-m5-p1-disposable.sh
```

Set `FAJI_PG_BIN` if PostgreSQL 16 binaries are outside `/usr/lib/postgresql/16/bin`.
The launcher generates credentials, a loopback-only private cluster, distinct migration/
runtime roles and a Keycloak sentinel database that runtime cannot access. It removes
provider/ticket secrets from the acceptance environment; provider tests install synthetic
credentials and a transport that cannot reach the network. It touches no existing cluster.

The consolidated gate checks disposable targeting; strict API/database/M4/M5 test types;
lint/build; all migrations twice; enumerated runtime grants; reporter self-tests; foundation
and inherited API database cases; M4 customer/marketplace acceptance; original M5 capture
acceptance and the complete lifecycle scenarios; M4 query plans; full OpenAPI equality;
whitespace; dependency high/critical gate; and unchanged source. M5 database files run
sequentially to keep their shared worker fixtures deterministic. Fixture-only clock passage
uses a migration-owner transaction in the marked disposable database and restores its
guard before commit; production has no test-clock bypass.

Logs and `acceptance.json` persist in `/tmp/fajify-m5-report.*`, with the exact source
commit and per-check exit/TAP counts. Missing/duplicate checks, missing/empty TAP, failures,
cancellations, skips or TODOs cannot produce PASS. Cluster cleanup is recorded; failed
shutdown/removal forces FAIL and preserves the cluster for recovery. A red report is a
verification failure to fix, not authorization to waive a financial check.

Engineering checks here cover static compilation, lint/build, isolated unit/HTTP/provider
checks, contract compatibility and runner/reporter behavior. PostgreSQL 16 is unavailable
in this execution host, so migrations and real-database concurrency remain unverified until
the user's consolidated local run. Real Paystack sandbox/dashboard configuration and live
money operations have not been executed. No deployment, provider registration, main merge
or production acceptance is claimed. Keep PR #17 in draft pending that verification/review.

Provider contracts: https://paystack.com/docs/api/transaction/,
https://paystack.com/docs/payments/webhooks/, https://paystack.com/docs/api/refund/,
https://paystack.com/docs/api/transfer/, https://paystack.com/docs/api/dispute/.
