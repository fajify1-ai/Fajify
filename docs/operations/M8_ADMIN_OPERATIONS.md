# M8 Administrative Operations — Operator Runbook

Status: M8-P1 implementation branch, **verification and production rollout pending**. No unreviewed production use.

## 1. Runtime and safe configuration
- Use the existing NestJS API, Better Auth session and application PostgreSQL role. Better Auth is the sole active authentication provider. TLS and secrets come from the deployment environment, never Git.
- M8 routes are under `/api/v1/admin` and require the server-side `platform-admin` role, active account/session, applicable privileged step-up policy, and explicit database-backed admin scopes.
- Suspend/revoke inactive admins using existing M2 security operations. A UI role is never a backend authorization decision.
- Configure exactly one grant-managing Platform Admin per environment using `FAJI_PLATFORM_ADMIN_OWNER_EMAIL` and the singleton `platform_admin_owner` database record. The account must have a verified email, an active account, and the `platform-admin` role. That owner can grant or revoke Platform Admin status and any supported scopes using the audited Admin Access screen. No second approver is required in development, staging, or production.
- The API runtime can invoke only the narrowly scoped database function for admin access changes; it cannot directly modify `application_roles`, `admin_scope_grants`, or the owner record. API requests verify the configured email and singleton owner row; the database function independently verifies the owner row and active admin role. The owner cannot modify their own access; bootstrap or recovery of the owner requires an out-of-band database operator.
- For a new environment, first register and verify the configured owner account. A database operator must then bootstrap that identity as `platform-admin` and grant the supported scopes once; after bootstrap, all routine admin-role and scope changes go through Admin Access. Confirm the target database/environment before bootstrapping. Review existing administrators and adjust their scopes in Admin Access so only deliberately selected administrators retain elevated access.

One-time bootstrap template for the configured Fajify owner (`fajify1@gmail.com`), to run only after confirming the target environment and verifying that the account is registered, active, and email-verified:

```sql
BEGIN;
DO $bootstrap$
DECLARE owner_id text;
BEGIN
 SELECT u.id INTO owner_id
 FROM auth_user u
 JOIN account_access a ON a.identity_subject=u.id AND a.suspended=false AND a.revoked_after IS NULL
 JOIN user_profiles p ON p.identity_subject=u.id AND p.suspended=false
 WHERE lower(u.email)='fajify1@gmail.com' AND u.email_verified=true;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Configured owner must be registered, active, and verified'; END IF;
 INSERT INTO platform_admin_owner(singleton,identity_subject,configured_by)
 VALUES(true,owner_id,owner_id);
 INSERT INTO application_roles(identity_subject,role)
 VALUES(owner_id,'platform-admin') ON CONFLICT DO NOTHING;
 INSERT INTO admin_scope_grants(identity_subject,scope,granted_by)
 SELECT owner_id,scope,owner_id FROM unnest(ARRAY[
  'operations.read','audit.read','governance.read','governance.write','identity.write',
  'finance.read','finance.write','support.read','support.write','integrations.read',
  'reports.read','monitoring.read','incidents.write','waitlist.read','business_waitlist.read'
 ]::varchar[]) AS scopes(scope)
 ON CONFLICT(identity_subject,scope)
 DO UPDATE SET active=true,granted_by=EXCLUDED.granted_by,granted_at=now();
END $bootstrap$;
COMMIT;
```

Use exact allowed scopes defined in migration `0114_business_waitlist.sql`. Scope revocation sets `active=false` with the owner as actor; never delete or rename grant identity rows. The trigger writes append-only history. Grant-management endpoints require an active, recently authenticated `platform-admin` session and are rate-limited.

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

## 6. Waitlist contact data
- Public signup accepts only an exact browser origin in `FAJI_WEB_ORIGINS`, validates email, Nigerian mobile number and explicit consent, and limits attempts using an HMAC of the trusted ingress IP. The rate-limit table contains no raw IP addresses. The unified app's public browser origins are `https://preview.fajify.com` and `https://fajify.com`; the same exact allowlist is enforced at the Next.js proxy and API.
- The Customer waitlist stores email and WhatsApp. The separate Faji Business interest list stores business name, category, email and WhatsApp; joining it does **not** create an account or a formal business application. Both use explicit contact consent and duplicate normalized email submissions do not overwrite existing records.
- Apply migrations `0113_waitlist_signups.sql` and `0114_business_waitlist.sql` together, with the matching runtime grants, before enabling either public form. The public Business page is available at `/businesswaitlist`; the apex Caddy route must explicitly forward that page, its assets and `/api/platform/waitlist/business` while continuing to redirect other paths.
- The configured owner may assign `waitlist.read` and `business_waitlist.read` through Admin Access. Platform-admin role alone does not grant access. Each Admin list is paginated, searchable, no-store, and read-audited; exports contain only loaded rows. Treat CSV files as sensitive personal data and distribute/store them only through approved secure channels.

Accepted M7-P1 ride/dispatch/fare contracts were merged into the M8 source tree at `d45215af3de7c7bb590c9486af728f5bebd22b6e`. Customers may associate **an existing ride** with an existing service reservation using M8's `/api/v1/customer/integrations/booking-rides` API. Require explicit `consent:true`, strict ownership and a geocoded venue destination within 250m; a link does not create/pay for a ride, alter driver dispatch or expose real-time GPS. Unlinking a historical association does not cancel the ride. M8 PostGIS schema `0102_m8_booking_ride_links.sql` follows M7 migration `0101`. Never treat the passenger ride state machine as delivery/courier fulfillment; that workflow needs its own domain contract.
