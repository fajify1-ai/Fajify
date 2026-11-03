# M8 · Phase 1 — Platform Administration, Integration & Operations

**Workstream:** M8-P1 — Backend & Platform  
**Development branch:** `feat/m8-p1-admin-operations`  
**Starting baseline:** `98eaf661c55f522e1bb120fe717fc08a909f918f` (`main` on 2026-11-03)  
**Status:** First implementation increment; **not accepted, not deployed, not merged**. Consolidated local verification pending.

## Source of truth and ownership

Scope: [Milestones 8.1–8.7](MILESTONES.md), [four-phase allocation](../roadmap/FOUR_PHASE_MODEL.md) and [system architecture](../architecture/SYSTEM_ARCHITECTURE.md).

- **M8-P1** owns privileged backend authorization, admin data/contracts, operational audit, marketplace moderation, finance oversight, support, cross-platform integration, reporting and monitoring.
- **M8-P4** owns the administration dashboard/UI and ride/dispatch operational client UX. M8-P2 and P3 integrate customer and merchant workflows respectively.
- Reuse authoritative M2 identity, M3 business, M4 customer/support, M5 payment/ledger and M6 planning services. Do not create second payment, booking, dispatch or authorization sources of truth.

## Initial M8-P1 implementation: read-only admin operations

| Route | Purpose | Data exposure |
| --- | --- | --- |
| `GET /api/v1/admin/operations/overview` | Counts pending merchant approvals, open customer support cases, hidden/unwithdrawn reviews | Aggregates only; no customer messages, financial values, documents or provider secrets |
| `GET /api/v1/admin/operations/audit?limit=20&offset=0` | Newest-first bounded security-event activity | ID, actor subject, event type, timestamp only; raw event `details` excluded |

Both endpoints require signed Keycloak bearer identity, unsuspended and unrevoked account/session, `platform-admin` role, `azp=faji-admin-web`, verified privileged MFA ACR, `auth_time` within five minutes, and the existing PostgreSQL-backed 20-requests/60s privileged budget. Responses are `Cache-Control: no-store`. Invalid pagination and unexpected query parameters are rejected. The shared admin request budget records accepted privileged reads as `identity_security_events` `admin_request` records; future richer domain audit work must retain explicit actor, action, resource and outcome attribution without logging secret payloads.

The initial routes intentionally add **no mutation** of marketplace, finance, support or ride state. Existing admin/business approval and M5 finance routes remain the owners of their commands. No new database schema or runtime grants are introduced in this increment.

## Verification and acceptance state

Pending local checks on the exact implementation commit in a dependency-installed workspace:

```bash
corepack pnpm --filter @faji/api typecheck
corepack pnpm --filter @faji/api lint
corepack pnpm --filter @faji/api test
corepack pnpm --filter @faji/api build
# In isolated non-production configuration with a clean source tree:
corepack pnpm --filter @faji/api contracts
git diff --check
```

The newly added `m8-admin.http.test.ts` covers denied anonymous/weak-MFA/wrong-client/wrong-role/revoked/suspended requests, privileged rate limiting, validated paging, no-store headers, OpenAPI security and a query-scope check. It is **not a substitute** for PostgreSQL 16/PostGIS migration and least-privilege acceptance, Keycloak browser MFA evidence, or cross-domain integration tests.

`packages/api_contracts/openapi.json` has **not been regenerated** for the initial source increment. Regenerate it locally using the existing controlled API exporter, review additive-only changes, then rerun verification on the resulting clean commit. No GitHub Actions or production infrastructure is used as acceptance evidence.

## Next engineering packages and dependencies

1. **8.1:** Harden audit immutability, actor/action/resource/outcome provenance, least-privileged access, non-repudiation/evidence retention, and privileged contract tests. Distinguish administrative scopes where required instead of expanding all privileges blindly.
2. **8.2:** Add review moderation, governance queue and audited restrictions, with idempotency and self-review/ownership exclusions. Reuse M3 onboarding and M4 reviews; avoid bypassing merchant ownership.
3. **8.3:** Surface scoped M5 financial reconciliation, dispute and settlement reports by delegation to M5 authoritative services. Never allow admin writes to bypass verified provider or balanced ledger rules.
4. **8.4:** Introduce staff assignment, support response/escalation and support/incident audit. Preserve customer-only ownership; never expose private messages in public views.
5. **8.5:** Integrate reservation-to-ride, order-to-delivery and multi-domain account history with durable outbox/idempotency and negative transition tests.
6. **8.6–8.7:** Reconciled, bounded reporting and provider/queue/auth/application monitoring, investigation views and critical alert policies.

**M7 integration gate:** M7-P1 draft PR #19 is still open with acceptance pending at this baseline. Do not wire M7 tables/contracts into `main`-based M8 implementation until that branch is integrated and its exact accepted API contracts, schema and evidence are reviewed.

**M8-P1 closure gate:** exact-SHA verification, restricted runtime database privileges, auth/MFA negative cases, migration replay, additive OpenAPI snapshot, concurrency and idempotency coverage, cross-domain contract review, operational alerting, rollback and security-owner approval. No acceptance or production claims until these are evidenced.
