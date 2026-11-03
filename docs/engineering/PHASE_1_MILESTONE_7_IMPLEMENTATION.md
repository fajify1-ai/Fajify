# Fajify — Milestone 7 / Phase 1 Engineering Handoff

**Phase:** M7-P1 · Backend & Platform  
**Branch:** `feat/m7-p1-ride-dispatch-backend`  
**Baseline:** `2c64b47267d866ec93f6428a9ebe3fd66f70456f`  
**Status:** Implementation committed for local review; no consolidated local acceptance performed. Do not merge, stage with live providers, or assert phase completion until verification evidence exists.

## Scope and architecture

- NestJS modular monolith with signed Keycloak OIDC identity, M2 account revocation, role checks and PostgreSQL resource membership.
- PostgreSQL/PostGIS authoritative state; transaction-locked offers, driver claims and trip transitions; durable outbox, incident and financial audit records.
- SSE endpoint for authenticated low-frequency updates plus cursor-based timeline recovery; **WebSocket push fanout and real-device background tracking are not accepted or evidenced by these changes**.
- Fare policies by vehicle category and version, immutable quote snapshot, provisional geodesic distance. Geodesic metres are **not** driving distance/ETA; do not present the quote as a provider-verified road fare.
- M5 Paystack intent, verified receipt, ledger posting, refunds and payout reconciliation reused for ride financial flows. Driver settlement reserves existing M5 payable balance, records one-shot transfers and requires independent provider confirmation. Production transfer execution is disabled unless explicitly configured.

### Migrations (apply in order through the existing migration runner)

`0090_ride_dispatch.sql` — driver/vehicle/documents, ride requests, offers, trip events, GPS, incidents and unique active assignment.  
`0091_ride_quotes.sql` — authoritative expiring quotes, request binding.  
`0092_ride_operations.sql` — dispatch geofences, generations, bank-reference verification, incident severity, fare/earnings state.  
`0093_ride_incident_dedup.sql` — incident idempotency and active-driver indexes.  
`0094_ride_finance_links.sql` — category commission snapshots, payment-to-ride link, payout reservations.  
`0095_ride_evidence_integrity.sql` — append-only database triggers for trip and financial event histories.  
`0096_ride_tariffs.sql` — versioned active vehicle-category tariff policies.
`0097_ride_payout_reversals.sql` — payout reversal states and immutable fee observations.
`0098_ride_tariff_integrity.sql` — database enforcement against mutating published tariff history.

### API operations (versioned under `/api/v1`)

| Actor | Endpoint group | Behavior |
| --- | --- | --- |
| Customer | `customer/rides` | Quote, create, list/history, owner-only detail, cancellation before arrival, payment-intent preparation |
| Driver | `drivers/onboarding`, `drivers/me` | Registration, document metadata submission, availability, payout recipient reference |
| Driver | `rides/driver/offers`, `rides/offers/:id/accept`, `rides/:id/state` | Own expiring offers, atomic claim and legal trip state transitions |
| Driver | `rides/driver/location`, `rides/driver/location/revoke` | Explicit consent, fresh sequenced GPS updates and immediate location deletion |
| Dispatcher | `dispatch/areas/:areaId/rides`, `.../candidates` | Scoped monitoring and geofenced approved nearby drivers |
| Dispatcher | `dispatch/rides/:id/offers`, `.../match`, `.../reassignment` | Manual and ranked offer generation, fencing and requeue before arrival |
| Customer/driver/dispatcher | `rides/:id/timeline`, `rides/:id/events` | Resource-scoped state/events; SSE periodically revalidates session and area scope |
| Customer/driver/dispatcher | `ride-safety/**` | Idempotent SOS/incident reports, dispatcher incident queue and audited resolution |
| Administrator | `drivers/**/review`, `drivers/**/suspension`, `dispatch/areas`, `admin/ride-tariffs` | MFA-bound, audited review, geofence and tariff commands |
| Administrator | `admin/rides/:id/payout-reservation`, `admin/ride-payouts/:id/{submit,reconcile}` | Reserve verified payable, submit once, confirm provider reconciliation |
| Driver | `drivers/me/earnings` | Owned ride financial summaries, not a claim that earnings are settled |

All protected endpoints require valid bearer identity and active M2 account state. Customer and driver identity alone never supplies dispatcher resource membership; active dispatch-area membership is checked server-side. Admin controls use the existing elevated ACR / authorized client guard.

### Database invariants

1. Driver must be approved, available, unsuspended at both account and driver levels, with category-matching approved vehicle, current approved documents, active zone membership and fresh consented GPS. These are rechecked when an offer is accepted.
2. Request row lock and `dispatch_generation` reject expired/stale offers. PostgreSQL partial unique indexes prevent two accepted offers for one ride and conflicting active driver assignments.
3. Trip transitions are server-controlled, logged with actor and published to the transactionally recorded outbox. Cancellation revokes active offers and clears driver assignment; dispatcher-only reassignment records its exceptional transition.
4. GPS accepts strictly increasing sequence and observation time, valid coordinates, consent and freshness. Consent withdrawal removes the durable latest location and takes the driver offline.
5. A customer ride request must match the original quote, customer, coordinates and category. A replayed idempotency key returns the original ride even after quote expiry.
6. M5 capture is independently provider verified before the ride payment state changes. Driver payouts are reserved against actual M5 operator payable and are never automatically reissued after ambiguous provider responses.
7. Append-only event tables reject UPDATE and DELETE; administrative review and financial mutations create immutable audit or operation events.

### Configuration and operational prerequisites

- Existing M1/M2/M5 environment variables: `FAJI_DATABASE_URL`, `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, `REDIS_URL`, S3 config, Paystack keys, `PAYMENT_CALLBACK_URL`.
- `FAJI_RIDE_OPERATOR_BUSINESS_ID`: UUID of a **real, approved ride operating business** with an approved M5 financial policy and isolated environment. No demo or invented finance account is silently provisioned.
  - Financial policy **must** have `commission_bps=0`, `gateway_fee_bearer=platform`, `payout_fee_bearer=platform`. M7 snapshots ride commission, posts an idempotent commission reclassification from the operator payable to platform revenue before reserving driver earnings, and refuses misconfigured double commission.
  - Provider reversals create compensating ledger postings, and transfer-fee refunds are reconciled from independently verified provider evidence. Unknown fee information blocks final settlement.
- `FAJI_RIDE_PAYOUT_ENABLED=true`: explicit operator gate for one-shot Paystack transfers. Keep unset until payment sandbox tests, payout rules, fee evidence and recipients are independently accepted.
- Driver documents use private object-key references and manual privileged reviews. A document key submission **does not prove an S3 upload exists or its bytes are safe**. Sign/verify uploads and enforce object content checks before real onboarding or production use.
- An administrator provisions active dispatch polygons and grants M2 `dispatch_area` memberships to the appropriate dispatchers and drivers.
- Authenticated write commands reuse M4's database-backed `CustomerWriteGuard` (60 requests/minute with tighter shared support/payment buckets). This applies to driver GPS ingestion as well as customer and dispatcher writes.
- An administrator publishes a vehicle-category `ride_tariff_policy` before quoting; the first release uses geodesic pricing rather than map-routed distance. Production route-based price validation remains an explicit acceptance dependency.
- Safety incidents are durably recorded and available to scoped dispatchers; actual 24/7 emergency staffing, escalation notification delivery and contacts require separate operational acceptance.

### One-shot and recurring worker

```bash
# Against an explicitly disposable database only until locally accepted
FAJI_RIDE_WORKER_ONCE=1 pnpm --filter @faji/api worker:rides
# The recurring worker runs one expiry batch approximately every five seconds.
pnpm --filter @faji/api worker:rides
```

Worker safety: it locks ride rows before expiring offers, requeues rides with no live pending offers and increments the dispatch generation. The `ride.payout.*` events are not instructions to transfer money automatically.

### Local review / consolidated verification (NOT YET EXECUTED)

The preferred consolidated acceptance invocation is `bash tooling/run-m7-p1-disposable.sh` from a clean checkout on this branch as an unprivileged user. It provisions and destroys a marked isolated PostgreSQL 16/PostGIS cluster, applies checked M5+M7 grants to a separate restricted runtime DB role, runs the M7 database suite alongside existing API static/unit/build checks, exports OpenAPI, requires the snapshot to be current and writes `FAJI_M7_REPORT_DIR/acceptance.json` with exact source SHA and cleanup outcome. This launch script is **committed but has not been executed here**. It deliberately fails until an accepted, freshly generated OpenAPI snapshot is committed; do not bypass the comparison gate.

### Manual verification commands, if diagnosing a failing consolidated gate

Run only against a **fresh, explicitly disposable PostgreSQL 16 + PostGIS database**, with independent Keycloak and Paystack sandbox fixtures. Do not use development, shared staging or production credentials for the disposable acceptance runner.

```bash
pnpm install --frozen-lockfile
pnpm --filter @faji/database typecheck
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api lint
pnpm --filter @faji/api test
pnpm --filter @faji/api build
FAJI_M7_DISPOSABLE_DATABASE_ACK=m7-disposable-postgis-only \
  FAJI_DATABASE_URL='<disposable-postgis-url>' \
  pnpm --filter @faji/api test:m7:database
pnpm --filter @faji/api contracts
```

Do not run `test:m7:database` on an existing database: it runs migrations and inserts synthetic records. Review and commit the generated `packages/api_contracts/openapi.json` in the same branch after export succeeds.

**Required negative evidence:** unapproved/expired/suspended drivers rejected; invalid geofences, stale consent and overlapping GPS rejected; cross-account ride and incident data denied; simultaneous claim yields exactly one winner; legal trip state graph; expired/revoked offer recovery; persisted event immutability; quote replay; gateway capture only on independently verified receipt; no double payout or unknown provider fee accepted; suspended/MFA-ineligible admins rejected.

**Integration dependencies for the later consolidated acceptance:** M6 planning contracts and M7-P2/P3/P4 client DTO compatibility; device GPS/background behavior on Android/iOS under Phase 4; merchant pickup and cross-platform handoffs under Phase 3/M8; provider-authenticated document upload; road-distance pricing; real notification/push delivery; paid driver settlement tests including OTP, reversals and reconciliation.

## Release decision

**No release authorization.** This branch has implementation commits and acceptance-test code but no verified test output or regenerated OpenAPI snapshot. The project owner requested consolidated local verification as a later, distinct step. Keep this branch unmerged until that evidence is recorded at a pinned exact commit.
