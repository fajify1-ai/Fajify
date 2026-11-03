# Fajify Milestone 7, Phase 1 — backend engineering handoff

**Development branch:** `feat/m7-p1-ride-dispatch-backend`  
**State:** Source implementation committed; **NOT locally accepted, NOT merged, NOT production-enabled**.

## Implemented source

1. M7 ride/driver/dispatch/finance/safety PostgreSQL/PostGIS tables and sequential migrations `0090`–`0100`.
2. Keycloak bearer, active account, driver role, dispatcher geofence resource membership and MFA-bound privileged controls.
3. Required four-document driver compliance; private signed S3 document uploads, authenticated object evidence and administrative review.
4. Customer quotes, server-controlled versioned tariffs, request replay, trip operations, payment-intent preparation and history.
5. Geofenced matching, atomic offer acceptance with generations, expiry, suspension/disqualification recovery, verified GPS, assigned-trip events and SSE history.
6. Safety incidents, urgent escalation on in-progress eligibility loss, immutable evidence and operator-scoped incident queue.
7. M5 verified payment integration, zero-double-commission operator policy, recipient verification, payout reservation, one-shot transfer and independent reconciliation/reversal.
8. Unit and disposable PostgreSQL regression tests, generated OpenAPI contract gates, restricted DB grants, and one-command disposable acceptance launcher.

## Essential acceptance restrictions

- No tests were executed as part of the remote GitHub editing session. Source implementations are **not evidence of correctness**.
- The OpenAPI snapshot must be regenerated and committed after dependency installation, before running consolidated acceptance.
- Operator-controlled prerequisites include an approved M5 ride business with zero secondary commission, configured SigV4 private S3 storage, active dispatch zones and membership, versioned fares and sandbox gateways.
- Production document malware inspection and independent ID validity review are not certified by authenticated S3 metadata. Device GPS/background integration and external safety responder coverage are separately evidenced in client/operations acceptance.
- The initial fare distance source is geodesic rather than provider road-routing; production road fare and ETA policy requires explicit review. Backend SSE is supported; no WebSocket delivery acceptance is claimed.

## Local acceptance handoff

From an **unprivileged** account and a clean checkout of this branch:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @faji/api typecheck:m7
# First generate, review and commit a current OpenAPI snapshot.
bash tooling/export-m7-contracts-offline.sh
git diff -- packages/api_contracts/openapi.json
# After reviewing the diff, commit the snapshot before the one-shot acceptance.
bash tooling/run-m7-p1-disposable.sh
```

**Offline export:** the helper uses syntactically valid, non-functional loopback configuration values only to instantiate the NestJS API schema. It does not require or authenticate to real PostgreSQL, Redis, Keycloak or S3 services. If it fails, inspect the error and do not accept or commit the generated artifact without reviewing it.

The launcher verifies the exact source revision, creates an isolated PostgreSQL 16/PostGIS database, applies migrations and restricted roles, executes relevant tests/static checks/contract gates, produces a machine-readable acceptance report, then removes the cluster. A PASS requires all checks and cleanup to succeed. Do not present the branch as release-ready if any gate fails.

The development branch includes the approved changes from `main`, without merging M7 back into `main`. Merge only after a pinned, accepted local report and owner review.
