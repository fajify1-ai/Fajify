# M4 / M5 payment integration boundary

M4-P1 is accepted and merged at `b393483066d01cda13b491d1eda89ad2dc4222a5`.
M5-P1 now implements the integrated backend on that foundation; consolidated local
acceptance remains pending. See [M5 engineering/runbook](../engineering/PHASE_1_MILESTONE_5_IMPLEMENTATION.md)
and the combined OpenAPI snapshot for complete routes and schemas.

| Domain | Authority |
| --- | --- |
| M4 | Signed customer/account transactions, free reservations, server-priced orders, merchant/branch eligibility and normal fulfilment/status APIs |
| M5 | Paid capacity/inventory holds, intent/reference and immutable policy snapshots, provider initialization/independent capture verification, receipts/journals, confirmation, ticket issuance/redemption, refunds/disputes and settlement |
| Integration | Confirmation and capture share one transaction; existing cancellation/completion outbox events drive durable financial handling; local acceptance covers the combined migration/source set |

M4 free-service reservations remain free and already confirmed. Paid service bookings use
`POST /api/v1/customer/paid-holds` with `kind=reservation` and the availability ID. Ticket
holds use `kind=ticket` and the event catalogue ID. Both are server-priced, customer-owned,
expire under the approved policy, and share authoritative stock/capacity counters.

M4 orders enter `placed` with a persisted total. Preparing the order intent accepts only
`requestKey` and returns `checkoutEnabled:false`; it does not charge or reserve product stock.
An enrolled paid order cannot advance beyond `placed` until capture and purchase eligibility
are confirmed. Unenrolled historical/free order behavior is retained. All checkout sessions
use an existing owned intent and only accept a receipt email; URL/amount/reference/status/
merchant/identity cannot be supplied by the caller.

A valid webhook signature triggers canonical provider verification. Receipt, balanced capture,
resource confirmation or late-payment refund obligation, audit and `payment.verified` outbox
commit atomically. Clients never confirm payment from a browser return or their own success
state. Read capture via the existing owned payment status API; read hold/ticket/order state
for fulfilment. Duplicate callbacks and provider-rechecks do not reissue resources.

Uncertain initialization retains its original reference. An explicit order retry requires
independently verified failed/abandoned prior attempt and records a new immutable link chain.
Late success on an old attempt is refunded. Expired/cancelled service/event holds never
reacquire inventory just because money arrived. Paid times/schedules cannot be silently edited
after a hold. Cancellation and refund approval revoke unused entitlement and follow configured
windows/cutoffs; merchant completion establishes settlement eligibility after the policy delay.

Financial jobs independently consume cancellation/completion events with durable markers;
they do not reuse or overwrite notification-worker delivery markers. Deploy the M5 finance
worker alongside the HTTP process. Use distinct test/live financial databases, migration/runtime
roles, an approved commercial policy, provider configuration and retained signing-key versions.
All M1–M4 paths/schemas are preserved. The new lifecycle migration is 0014; both distinct M4/M5
0011 filenames remain unchanged. Verify the complete integrated branch with the single
`tooling/run-m5-p1-disposable.sh` command before acceptance or enabling provider checkout.
