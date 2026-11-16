# Better Auth implementation and release boundary

Baseline: `edb2c94ddec5b1803650a204da0641ea5b59b738`. This continuation implements the approved [architecture decision](../architecture/AUTH_AND_WEB_MIGRATION_DECISION.md). Current acceptance results and the exact reviewed source revision are recorded in `BETTER_AUTH_RELEASE_ACCEPTANCE.md`.

## Backend and database

NestJS hosts Better Auth 1.7.25 at `/api/auth/*` before body parsing; the application API remains `/api/v1`. Drizzle uses the shared Faji PostgreSQL pool. Migration 0104 is unchanged. Additive migrations 0105–0107 add legacy claims, optional authenticator factors, verified phone identities, explicit step-up proofs, operator scopes and atomic session revocation on password changes.

New accounts atomically receive a profile, active account and customer role only. Clients cannot choose identity IDs, roles, verified-phone/MFA flags or administrative scopes. Authentication identity and domain ownership remain separate: every protected request validates the session/token, account suspension/revocation and current database roles; resource memberships, business approvals, driver eligibility and administrator scopes remain server-enforced.

Sessions last seven days, renew after a day, and have no cookie cache. Logout/revoke-current deletes the server session. Password mutation revokes existing sessions atomically in PostgreSQL; MFA enrollment/revocation also invalidates pre-change sessions. Email and verified-phone recovery use expiring, single-use proofs and preserve enrolled MFA. Password recovery cannot create credentials for an unclaimed legacy identity.

Admin authorization does **not** infer password proof from a session creation timestamp. `/api/auth/faji/step-up` verifies the actual credential through Better Auth crypto, requires an enrolled authenticator or single-use recovery code where applicable, records proof/audit and expires after five minutes. SMS-only sessions do not establish this proof. Older identity/finance routes now require explicit operator-owned `identity.write`, `governance.write`, `finance.read` or `finance.write` scopes. The runtime can read grants but cannot issue them.

## Phone OTP and optional MFA

MFA is optional for Customer, Business, Ride/Dispatch and Admin. Enrollment returns an authenticator setup key and recovery codes; verification is required before enabling the factor. Sign-in challenges precede session creation. Recovery codes can complete sign-in or step-up, are single-use, and can be regenerated. Disabling/re-enrolling MFA, viewing provisioning secrets/recovery codes and changing a verified phone require recent password/factor proof. There is no public support bypass for lost factors.

Verified phone enrollment requires an existing session, recent step-up and an E.164 OTP. Profile phone input is stored separately and cannot reserve an unverified login identity. Verified users without enrolled MFA may sign in with phone OTP. Enrolled users must use the password-plus-factor flow, preventing the phone verification endpoint from bypassing MFA. Verified-phone password recovery does not disable an enrolled factor. Phone identities can be revoked with step-up.

SMS delivery uses an explicitly configured owned HTTPS webhook (`FAJI_SMS_WEBHOOK_URL`, bearer secret `FAJI_SMS_WEBHOOK_SECRET`) accepting `{phoneNumber,code,purpose}`. Tests use only a private authenticated sink. Codes expire after five minutes, have three attempts, and are protected by per-path/IP, per-phone hourly and provider/ingress budgets. MFA has endpoint limits and account-level lockout. Provider delivery and real devices require separate acceptance.

## Web and native clients

All four Next.js apps share `packages/web_auth`: embedded registration/login/recovery/reset/claim/phone forms, optional MFA challenges and account security settings. Protected pages render dynamically and validate the backend account. The fixed-upstream proxy validates URLs, timeouts, size, origin and cookie policy; forwards only auth cookies; removes bearer credentials recursively (including session arrays); rejects redirects; and sanitizes upstream errors. Cookies are host-only, HttpOnly, Secure over HTTPS, SameSite=Lax. Reset tokens are removed from the address bar after capture; staging access logs omit queries and redact reset paths.

Flutter remains native-only. Customer preserves its existing forms/controller and adds a second-factor prompt; Business and Ride/Dispatch share embedded auth/security forms. Only opaque session tokens go into `flutter_secure_storage`. MFA challenge cookies stay in memory, rotated tokens are retained, restored sessions are validated, network failures never grant cached access, and revoked sessions close protected workspaces. There are no external browser/hosted-login flows.

## Legacy accounts

See [identity migration and rollback runbook](../operations/IDENTITY_MIGRATION_RUNBOOK.md). Existing subjects become Better Auth user IDs; profile UUIDs and every domain reference remain unchanged. An owner-only rehearsal tool requires recent independently verified subject ownership, two reviewers and reviewed roles. It never links by matching email or imports password hashes. It issues 256-bit one-time claims, stores only digests, rejects collisions and preserves suspensions. Reissuance rotates pending claims; already claimed accounts cannot be reissued.

Registration is opt-in in staging/production and remains closed during reconciliation. The importer refuses non-disposable databases: no production execution path or production data mutation is authorized.

## Setup and verification

Use Node 20+ and pinned pnpm 9.15.9; `pnpm install --frozen-lockfile`. Root `.env.example` supplies development settings; provide existing S3 settings too. Use a separate migration owner/runtime role, apply the complete migration chain, and grant auth permissions with `grant-auth-runtime.sql` or the reviewed application grant helpers. `tooling/verify-auth-database.sh` requires explicitly marked disposable PostgreSQL 16 targets. Never edit applied migration checksums.

Each Next app needs its own `.env.local` with owned `FAJI_API_URL` and exact `FAJI_WEB_ORIGIN`. Native apps use `--dart-define=API_BASE_URL=https://<owned API>` and `--dart-define=FAJI_RECOVERY_URL=https://<trusted web origin>/reset-password`. Mock services default off; existing demo UI tests explicitly enable them.

See [private staging preparation](../../infrastructure/deployment/staging/README.md), [reproducible browser/device acceptance](../../tests/auth/README.md), and the release acceptance report for commands, actual results and blockers. PostgreSQL backup/restore compares all table contents and the migration ledger. Native device tests are supplied but are not reported as passed without an Android/iOS execution environment. Public deployment, real-user migration and production credentials remain unauthorized.
