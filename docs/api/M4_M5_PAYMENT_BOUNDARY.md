# M4 / M5 payment integration boundary

Status: proposed handoff contract while both Phase 1 workstreams are in progress.
M4 branch inspected at `67ebc0add0ac0c402d706420a0eeca7bd1f7e8f0`;
M5 foundation starts at `c493f9e71319e260bc01f9cd4432ac9b1fa34660`.
M4 has since advanced to `92bc44b671e2a683283da6e3d3dcc680f41b95b2` independently;
this M5 delivery does not merge or modify that branch.
This document describes the integration to implement; it does not advertise a working
checkout endpoint or authorize either branch to bypass the other's acceptance gate.

## Ownership

| Domain | Authority |
| --- | --- |
| M4 | Signed customer ownership, merchant/branch eligibility, immutable purchase price snapshot, reservation capacity hold or order eligibility, expiry/cancellation |
| M5 | Payment intent and provider reference, independent capture verification, receipts, ledger, retry-safe financial transitions, refund/settlement state |
| Shared integration | One purchase linked to its payment attempt, idempotent verified confirmation, late-payment handling, end-to-end acceptance |

M4's existing free-service reservations are already confirmed. Do not attach a gateway
charge to them and imply that they followed a paid-hold workflow. Orders in `placed`
have a server total but no paid status. Neither existing state is evidence of payment.

## Trusted purchase snapshot required before initialization

An internal domain service must load these values from persisted, ownership-checked
records. The customer's HTTP request must not choose the amount, currency, merchant,
customer subject, provider success state or a supposed signed quote object.

| Field | Contract to agree and persist |
| --- | --- |
| Purchase ID and type | Stable UUID and an explicit paid reservation, order or ticket purchase kind |
| Customer subject | Immutable Keycloak subject matching the signed active caller |
| Business and branch | Approved/active scope validated by M4 |
| Amount | Positive canonical decimal string in minor units, at most `9007199254740991` for the initial provider adapter |
| Currency | `NGN` for the current M5 implementation |
| Price snapshot/version | Persisted source proving what was purchased; recalculating from mutable catalogue prices after capture is not valid |
| Hold/eligibility | Authoritative purchase state and expiry; inventory/capacity ownership where required |
| Retry key | Customer-scoped key bound to the same purchase and snapshot; changed meaning returns a conflict |

Zero-price reservations stay in the free path. A payment intent needs a unique purchase
link and a defined policy for multiple attempts; the current foundation schema does not
yet contain that link. Add it in the integration migration rather than accepting unbound
customer-created intents. Initialization/recovery must reuse the persisted provider
reference and prevent a timed-out attempt from silently becoming a second payment.

## Verified capture and confirmation

M5 currently emits `payment.verified` with `{paymentIntentId}` in the same transaction
as its receipt and journal. M4 integration must resolve the persisted purchase link and
consume this event once, using a durable deduplication key. Raw provider payloads,
browser redirects and a customer's `GET /customer/payments/{id}` response must never
confirm bookings or issue tickets directly.

The privileged M5 provider-recheck endpoint can emit that same event when it recovers
a successful payment whose webhook was missed. It loads the existing intent's stored
reference, independently verifies it and uses the same atomic capture rules. M4 must
therefore consume the domain event based on the persisted purchase link regardless of
whether the receipt's evidence source is `webhook` or `provider_recheck`. Repeated admin
checks do not produce another capture event. No API accepts a claimed successful payment.

When the hold is valid, lock its authoritative state and confirm once. Capture success
does not imply that inventory is still available: if the hold expired, the order was
cancelled, or eligibility was revoked, preserve the financial receipt and record a
resolution case. Refund/reallocation follows the agreed policy and separate idempotent
financial workflow. Do not discard a late payment, recreate expired capacity without
checking it, or pay the merchant before eligibility is established.

## Parallel delivery and integration gate

M5 can proceed independently with gateway validation, internal ledger reconciliation,
private payment reads, ticket/refund/settlement foundations and synthetic tests.
Live paid checkout needs the agreed persisted purchase/hold link and combined acceptance.

M4 retains migration `0010_m4_customer_workflows.sql`; M5's unaccepted foundation is
renumbered to `0011_m5_payment_foundation.sql` before database acceptance. No M4 source
or branch is changed by that adjustment. If an operator applied the older M5 draft
filename in a disposable database, recreate that disposable database before rerunning;
do not manually delete migration history or apply the renamed duplicate over it.
M4 subsequently added `0011_m4_marketplace_accounts.sql`; the runner identifies and sorts
the complete filenames, so both distinct 0011 files can coexist. M5 also adds
`0012_m5_receipt_evidence.sql`. Preserve applied migration identities and verify the full
combined migration set during integration rather than repeatedly renumbering drafts.

When integrating, preserve both module registrations and both OpenAPI assertion sets,
then regenerate the combined contract. Keep both M4 and M5 disposable markers supported
in `packages/database/scripts/disposable-target.ts`; do not overwrite either branch's
shared-file changes wholesale. Verify customer/tenant isolation, price changes,
concurrent retries, hold expiry versus capture, cancelled purchases, provider timeouts,
duplicate events, single ticket redemption and reconciliation on one exact integrated
commit. Passing each feature branch separately does not prove this combined workflow.
