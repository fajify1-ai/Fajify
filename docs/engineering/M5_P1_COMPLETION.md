# M5-P1 engineering handoff

The backend engineering scope for 5.1–5.6 is implemented in PR #17 on
`feat/m5-p1-payment-foundation`, based on accepted M4 merge `b393483`.
[Implementation, API integration, operational recovery and acceptance runbook](PHASE_1_MILESTONE_5_IMPLEMENTATION.md).

Delivered: bound checkout and verified capture/recovery; versioned commission/fee/cancellation
policies and immutable balanced ledger; paid reservation holds/confirmation/expiry; inventory,
signed ticket issuance and atomic scoped redemption; refund approvals/reserves/provider
reconciliation and dispute/chargeback accounting; verified recipients and eligible settlement
batches with OTP, fees, reversal and receivable recovery; private APIs, audit/exception views,
durable outbox/jobs and the financial worker; generated OpenAPI, deterministic provider/HTTP/
accounting tests and a consolidated PostgreSQL acceptance launcher with a strict exact-commit report.

Engineering checks: 139 database-independent API tests pass (41 M5), with no failures/skips/TODOs; strict M4/M5/API/database types, API lint/build and OpenAPI generation pass. All 65 prior paths and 81 prior schemas are preserved. The four reporter self-tests and shell syntax checks pass. The dependency audit passes its high/critical gate; one low and three moderate findings remain. These do not replace PostgreSQL acceptance.

The user requested engineering completion before one consolidated local verification.
PostgreSQL 16/PostGIS is unavailable here. Prepared SQL/concurrency acceptance tests are not
reported as passed. The local command is:

```bash
corepack pnpm install --frozen-lockfile
bash tooling/run-m5-p1-disposable.sh
```

Run from a clean checkout as an unprivileged user. Keep the draft PR pending local acceptance
and review. Remaining operational inputs are explicit approved commercial policy values,
provider test/live account configuration, callback URL and retained ticket-signing keys.
No production values, real provider transactions, deployment or main merge were performed.
