# M8 Administrative Operations — Operator Runbook

Status: M8-P1 implementation branch, **verification and production rollout pending**. No unreviewed production use.

## 1. Runtime and safe configuration
- Use the existing supervised NestJS API, application PostgreSQL role and configured Keycloak issuer/audience. Keep Keycloak's database isolated. TLS and secrets come from the deployment environment, never Git.
- M8 routes are all under `/api/v1/admin` and rely on `platform-admin`, `azp=faji-admin-web`, trusted `faji-mfa` ACR and `auth_time` no older than 5 minutes.
- Suspend/revoke inactive admins using existing M2 security operations. A UI role is never a backend authorization decision.
- Provision explicit `admin_scope_grants` for allowed duties **out-of-band using the migration-owner/DB operator role** after independently verifying the Keycloak identity and obtaining two-person approval. The API runtime has only SELECT on grants.

Example *transaction pattern* for an approved operator, with a verified subject and a separately approved `granted_by` identifier (never hardcode actual users in committed scripts):

```sql
BEGIN;
INSERT INTO admin_scope_grants(identity_subject,scope,granted_by)
VALUES ('<verified-keycloak-subject>', 'support.read', '<approver-identity>')
ON CONFLICT(identity_subject,scope)
DO UPDATE SET active=true,granted_by=EXCLUDED.granted_by;
COMMIT;
```

Use exact allowed scopes defined in migration `0023_m8_admin_operations.sql`. Revocation sets `active=false` with a recorded operator; never delete or rename grant identity rows. The trigger writes append-only history. The code has no public self-grant API.

## 2. Moderation and customer support
- Review the pending merchant queue; use the existing authoritative M3 business review command, not SQL updates to merchant status.
- Moderate customer reviews via M8; `hidden` reviews leave historical records intact. Restrictions use a clear reason and unique request key. Branch/catalogue restrictions prevent merchant reactivation until explicitly restored by governance, and restore the prior merchant enabled state.
- Support operators may list private cases, assign only active support-scoped admins, reply to open cases, close/reopen, and inspect incidents. The M8 trigger creates a durable in-app notice for each admin-authored support reply; customer-side `GET /api/v1/customer/support-notifications` and `PUT /api/v1/customer/support-notifications/{id}/read` are owner-scoped, and they don't imply successful FCM/email delivery. Admin replies are visible in customer support messages; neither an internal incident nor an audit reason should contain credentials, OTPs or unnecessary customer details.
- Every successful M8 privileged read request is attributed as `admin.read_requested` in immutable audit history; its static controller/handler name excludes raw PII. The event means **requested**, not necessarily returned successfully.
- Never direct-update bookings, payment records, holds, settlements, journals, trip states or identity permissions as a support shortcut. Escalate to owning domain APIs.

## 3. Finance reconciliation and reporting
- `GET /admin/finance/summary` and reports show persisted, verified evidence only. Values are NGN minor-unit strings; successful capture, processed refunds and successful settlements are distinct categories, not a single net-cash figure.
- Refund/payout/dispute commands remain in M5 `/api/v1/admin/finance`; use independent provider reconciliation rather than assuming a browser callback or a transfer response is final.
- The integration consistency endpoint reports anomalies; it does **not** repair or mutate finance/booking history.
- Revenue reporting requires both `reports.read` and `finance.read`. Review reconciliation issues with Finance before any payout.

## 4. Monitoring and alert review
- Finance health monitoring reads dead, overdue and expired-lease finance jobs plus open reconciliation cases. The unpublished-outbox indicator is a **diagnostic**, not proof that an event has failed delivery.
- Manually authenticated `POST /api/v1/admin/monitoring/check` takes an empty JSON object. To run the same read/incident check from a controlled scheduler, execute one monitored tick:

```bash
corepack pnpm --filter @faji/api build
corepack pnpm --filter @faji/api worker:monitor
```

Schedule only through reviewed operational orchestration, with managed secrets and minimum necessary database permissions. One tick has no automatic background schedule. Monitor signals are durable; repeated ticks do not create duplicate incidents while the signal stays active. Clearing a signal does not automatically close an incident. An active signal prevents a resolved state.
- `/admin/monitoring/alerts` shows durable high/critical alerts with acknowledgement. The worker also writes an outbox event for future delivery, but no external push/email notification is proven until its consumer is configured and accepted.
- Provider health reports `unverified`: independent authenticated provider probes, gateway outage policy and routing/notification delivery are further operational acceptance steps.

## 5. Rollout and recovery
- Before integration: regenerate and commit the **combined M7+M8** OpenAPI from a clean local branch, then run `bash tooling/run-m8-p1-disposable.sh`; inspect `acceptance.json`, all TAP counts, exact SHA and cleanup.
- Apply additive migrations using the approved migrator and restricted grants; back up first. Do **not** drop M8 tables during rollback while older application versions may still reference audit, case or restriction state.
- If a release fails, revert the application binary/configuration while retaining compatible additive schema, and investigate in an isolated environment. Never disable audit triggers, scopes or financial idempotency to make acceptance green.
- Do not enable GitHub Actions, deploy production, or merge a draft PR on the basis of this handoff alone.

Accepted M7-P1 ride/dispatch/fare contracts were merged into the M8 source tree at `d45215af3de7c7bb590c9486af728f5bebd22b6e`. Customers may associate **an existing ride** with an existing service reservation using M8's `/api/v1/customer/integrations/booking-rides` API. Require explicit `consent:true`, strict ownership and a geocoded venue destination within 250m; a link does not create/pay for a ride, alter driver dispatch or expose real-time GPS. Unlinking a historical association does not cancel the ride. M8 PostGIS schema `0102_m8_booking_ride_links.sql` follows M7 migration `0101`. Never treat the passenger ride state machine as delivery/courier fulfillment; that workflow needs its own domain contract.
