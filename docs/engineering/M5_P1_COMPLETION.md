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

## First consolidated laptop run: fixes awaiting rerun

The uploaded log for `b2de1b74a1c76d23aa542717e5f42ef39496f4c4` reports
147/147 API tests and 13/13 M4 PostgreSQL scenarios passing, with no skips. The M5
PostgreSQL gate failed; the disposable cluster shut down and was removed successfully.
This run is not accepted.

Two defects were identified and corrected in application queries:

- Reading the immutable `finance_environment` singleton used `FOR SHARE`, which requires
  UPDATE permission even though the runtime intentionally has only SELECT/INSERT. The
  read now uses no row lock: INSERT's unique conflict handling serializes initialization,
  and the immutable database trigger prevents the environment changing. Grants stay restricted.
- Capture's INSERT/SELECT reused an untyped currency parameter in incompatible text/varchar
  inference contexts. Capture now selects the matched account currency, explicitly types
  its filter as varchar(3), and casts the intent and minor-unit parameters as UUID/bigint.

The PostgreSQL suite additionally checks concurrent environment initialization, refusal
of a different provider domain, and continued absence of runtime UPDATE permission.
Existing capture/replay acceptance remains the regression gate for the real PostgreSQL
journal query. No migration or runtime grant was broadened. Rerun the complete disposable
launcher on the corrective commit; the previous failed report must not be reused as PASS.
