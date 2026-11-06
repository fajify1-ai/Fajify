# M8 · Phase 1 — Platform Administration, Integration & Operations

**Workstream:** M8-P1 — Backend & Platform
**Branch:** `feat/m8-p1-admin-operations` · **PR:** https://github.com/fajify1-ai/Fajify/pull/20
**Initial base:** `98eaf661c55f522e1bb120fe717fc08a909f918f` (2026-11-03); **accepted M7 main integrated:** `f1b26bc22a342c3afd37095e043d28f70b0f588b` via merge `d45215af3de7c7bb590c9486af728f5bebd22b6e`
**State:** Broad backend implementation committed. **Local exact-SHA acceptance, generated OpenAPI snapshot, operator scope provisioning, cross-domain integration review and production release remain pending.** PR stays draft. No deployment or main merge performed.

## Ownership

Architecture: [system design](../architecture/SYSTEM_ARCHITECTURE.md). Scope: [Milestones 8.1–8.7](MILESTONES.md), [phase matrix](../roadmap/FOUR_PHASE_MODEL.md).

M8-P1 owns protected admin API/data, operations, audit, support, reporting, monitoring, integration contracts. M8-P4 owns admin web and operational user experience; P2/P3 own customer/merchant clients. M8 never takes over the authoritative M3 merchant state machine, M5 financial ledger/provider verification, M6 planning/capacity, or accepted M7 ride request, dispatch, safety and fare state machines.

## Implemented work packages

| M8 scope | Backend surface | Notes |
| --- | --- | --- |
| **8.1 Admin foundation** | Explicit operator-provisioned PostgreSQL admin scopes; existing verified Keycloak `platform-admin` + admin-web client + fresh MFA + active session and privileged request budget; immutable command receipts/action audit, grant-change audit and PII-free admin read-attempt audit | Operator grants cannot be self-provisioned from API. M8 endpoints fail closed with no matching scope. Existing M2/M3/M5 privileged endpoints retain their original authorization until jointly migrated/reviewed |
| **8.2 Marketplace governance** | Pending merchant approval queue, moderated review queue, review hide/restore, branch restriction and catalogue unpublish/restore, active restriction queue | Existing M3 `POST /api/v1/business/onboarding/{id}/review` performs authoritative merchant approval. DB triggers prevent merchant reactivation while admin restriction is active; original enabled/publication choice is preserved |
| **8.3 Finance administration** | Aggregate verified-capture, final refunds, successful settlements, unresolved disputes/reconciliation cases; merchant-level financial reports | Existing M5 `/api/v1/admin/finance` owns all refund, payout, policy, dispute and verified-provider commands. M8 does not reimplement money movement |
| **8.4 Support and incident response** | Private support queue/detail, admin replies visible in customer thread, customer-owned support notifications, assignment, priority, reopen/close, admin incidents/transition history, high/critical alert creation | All writes use durable request keys, transactional audit and legal-state checks; raw message bodies are not copied into command receipts |
| **8.5 Integration** | Audited unified customer timeline (M4 orders/reservations/support, M5 holds, M6 plans), M4/M5/M6 consistency diagnostics, reuse of existing package-to-hold capacity, a durable support reply notification trigger and outbox rules | **Booking-to-ride and order-to-delivery binding remain blocked** on accepted M7 dispatch/delivery contracts and explicit customer consent. No fictitious linked ride or delivery created |
| **8.6 Reporting** | 1–90-day customer/merchant/booking/ticket/verified-capture/ledger revenue summary; per-merchant operational and financial report | Money values are decimal-string minor units, derived from authoritative M5 records. `reports.read` **and** `finance.read` required for financial reports |
| **8.7 Monitoring** | Read-only finance-job/lease/reconciliation/outbox and urgent M7 ride-safety health, optional supervised monitor tick, persistent deduplicated incidents/alert inbox, acknowledgement and audit | API returns `providerHealth: unverified` until independent provider probes are configured; outbox events are not proof of push/email delivery |

## New or extended API routes

All below are prefixed `/api/v1/admin`; every M8 route requires signed active Keycloak identity, admin client, recent verified MFA, the named database-backed admin scope(s), and the existing privileged 20/60s actor budget.

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/operations/overview`, `/operations/audit`, `/operations/command-audit` | `operations.read` or `audit.read` respectively |
| GET | `/governance/approvals`, `/governance/reviews`, `/governance/restrictions` | `governance.read` |
| POST | `/governance/reviews/{id}/moderation`, `/governance/branches/{id}/restriction`, `/governance/catalogue/{id}/restriction` | `governance.write` |
| GET | `/support/cases`, `/support/cases/{id}` | `support.read` |
| POST | `/support/cases/{id}/assignment`, `/support/cases/{id}/messages`, `/support/cases/{id}/status` | `support.write` |
| GET | `/incidents` | `monitoring.read` |
| POST | `/incidents`, `/incidents/{id}/status` | `incidents.write` |
| GET | `/finance/summary` | `finance.read` |
| GET | `/reports/overview?days=30`, `/reports/businesses/{id}` | `reports.read` + `finance.read` |
| GET | `/integrations/consistency`, `/integrations/customers/{subject}/activity` | `integrations.read` |
| GET | `/monitoring/status`, `/monitoring/alerts` | `monitoring.read` |
| POST | `/monitoring/check`, `/monitoring/alerts/{id}/acknowledgement` | `incidents.write` |

Additional customer integration routes, all under `/api/v1/customer/integrations/booking-rides`, require existing M2/M4 customer identity, active account, customer write budget and strict DTO validation:
- `POST /`: associate a verified, already-created, owned M7 ride with an owned M4 reservation. Requires `consent:true`, `reservationId`, `rideId` and an idempotent request key; returns 200 for both first binding and exact replay. The M8 PostGIS integrity trigger independently verifies that ride destination lies within 250 m of a **geocoded** venue belonging to the booking. It rejects missing location, cancelled bookings/rides, wrong customer, duplicate active links and altered database identities.
- `GET /`: paginated owned active/cancelled association history, no GPS/driver coordinates.
- `PUT /{id}/unlink`: idempotently cancels **only the association** without cancelling the ride or booking; records durable linkage events. A separate new ride may be linked after unlinking.

The additive `0102_m8_booking_ride_links.sql` applies **after** accepted M7 migrations `0090`–`0101`. `grant-m7-runtime.ts` grants the restricted association access; it calls the M8-extended `grant-m5-runtime.ts` first. No M7 financial or dispatch state is modified.

M8 also exposes **customer-authenticated, ownership-protected** `GET /api/v1/customer/support-notifications` (bounded newest-first page) and `PUT /api/v1/customer/support-notifications/{id}/read`. These require an active unrevoked customer session and the existing customer write budget; they do **not** grant admin access. Every new administrator reply creates exactly one in-app notice, while customer-authored messages create none. P2 will consume the notification feed in the customer UI; external push/email delivery is not implied.

Privileged GET requests create an append-only `admin.read_requested` record identified by the static controller/handler name. This describes a request, not its eventual HTTP outcome; raw paths, query values and private message content are deliberately excluded.

Commands accept bounded strict DTOs. State mutations require `requestKey` (8–100 safe characters); retries by the same admin with identical payload return one committed result. Reusing a key for a different action fails. All read endpoints return `Cache-Control: no-store`, bounded pages for collections, and no provider credentials/OTP/QR secrets.

## Database and runtime privileges

`0023_m8_admin_operations.sql` is additive to M1–M6. It introduces:
- `admin_scope_grants` (operator-only mutation), `admin_scope_grant_events` append-only history.
- `admin_action_events`, `admin_command_receipts` (immutable, atomic with changes).
- `admin_marketplace_restrictions` and database-level branch/catalogue reactivation triggers.
- Support case assignment/priority and public admin reply author metadata.
- `customer_support_notifications` owner-scoped, exactly-once trigger per administrator-authored message, bounded read history.
- `0102_m8_booking_ride_links.sql`: owner-scoped booking/M7 ride associations, PostGIS venue proximity validation, immutable identifiers and terminal unlink with partial uniqueness for safe rebooking.
- `admin_incidents`, `admin_monitor_signals`, `admin_alerts` (monitored, acknowledged event inbox).

The restricted runtime may SELECT scope grants, never write them; it may SELECT/INSERT immutable command/audit records but not UPDATE/DELETE them. It may modify only the designated mutable M8 domain state. Grants are added to `packages/database/scripts/grant-m5-runtime.ts`; the disposable-target verifier now accepts an explicitly marked `fajify_m8_test_*` PostgreSQL 16 database. M8 uses the same app runtime pool as existing M1–M6 domains, not a connection to the Keycloak database.

See [M8 operations runbook](../operations/M8_ADMIN_OPERATIONS.md) and [security analysis](../security/M8_ADMIN_SECURITY.md).

## Verification — **NOT YET RUN**

In a clean local checkout with Node 22, pnpm 9.15.9 and PostgreSQL 16/PostGIS installed:

```bash
git fetch origin
git switch --track origin/feat/m8-p1-admin-operations
# First run only; prepares + commits the generated API snapshot:
bash tooling/prepare-m8-p1-contracts.sh
# Full exact-SHA disposable PostgreSQL acceptance:
bash tooling/run-m8-p1-disposable.sh
```

The script provisions and destroys a **unique disposable** PostgreSQL 16/PostGIS cluster, checks the marker and identity-database sentinel, separates migration and runtime roles, applies migrations twice, validates M5/M7/M8 privileges, runs API and database typechecks/lint/build, report tests, API tests, restricted PostgreSQL M8 scenarios, OpenAPI regeneration/snapshot equality, dependency audit and source integrity. `tooling/m8-verification-report.mjs` rejects absent/skipped/failed evidence and writes `acceptance.json` with the tested SHA. Never use production data or credentials for this acceptance.

The M8 HTTP tests cover role, client, fresh MFA, session revocation, suspension, scoped reports, PII-free read audits, customer support notification ownership, rate limiting, DTO validation and documentation. Database tests cover command replay/key mismatch, customer ownership, moderation, DB restriction barriers, exactly-once support notices, consented M4 booking→M7 ride link creation/replay/cross-owner rejection/venue proximity/unlink, incident transitions, finance/account timelines, M7 urgent safety monitoring and deduplicated alerts. The consolidated runner includes accepted M7 type checks, unit regressions and full M7 PostGIS and legacy database suites. These are **prepared tests only** until a local runner completes with a passing result.

## Unresolved integration/release gates

1. **M7:** M7-P1 PR #19 was merged into `main` as `f1b26bc22a342c3afd37095e043d28f70b0f588b` with 12/12 local gates reported. M8 now preserves that accepted commit and binds a customer-owned ride to a customer-owned booking **only after explicit consent** and geospatial matching. The M8 checkout cannot initiate/purchase a ride and the M7 client device/location/payout rollout remains separately gated. **Order-to-delivery remains blocked**: M7 models customer trips, not separately authorized courier deliveries. Reusing a passenger ride as a delivery job would be unsafe and incorrect.
2. **OpenAPI:** Regenerate and review `packages/api_contracts/openapi.json` on a clean local source commit; all M8 route bodies, responses, security and parameters must pass strict `M8_OPERATIONS` inventory checks.
3. **Existing privileged routes:** M3 merchant approvals and M5 finance APIs retain their accepted M2/M5 `platform-admin` + MFA policy. Extending granular M8 scopes to those existing routes requires coordinated ownership, compatibility tests, and operator grants before cutover.
4. **Operational:** Verify real Keycloak admin browser MFA, service health, provider sandbox/reconciliation, privacy/log handling, backup/restore and actual outbox/email/push consumer delivery where applicable. Admin monitoring tick is opt-in, requires scheduling, and durable outbox messages alone do not establish external delivery.
5. **Release:** Run local consolidated acceptance on a pinned source commit, review migration/rollback/security and contract changes, obtain required approvals, then consider merging the draft PR. M8-P2/P3/P4 and M9 are separate acceptance tracks.

**No M8-P1 acceptance, main merge, production deployment or real provider/ride operation is claimed.**
