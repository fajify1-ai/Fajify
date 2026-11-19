# Better Auth implementation and release boundary

Baseline: `edb2c94ddec5b1803650a204da0641ea5b59b738`. This continuation implements the approved [architecture decision](../architecture/AUTH_AND_WEB_MIGRATION_DECISION.md). Current acceptance results and the exact reviewed source revision are recorded in [current merge report](BETTER_AUTH_MERGE_READINESS.md); the earlier `BETTER_AUTH_RELEASE_ACCEPTANCE.md` is retained historical evidence.

## Backend and database

NestJS hosts Better Auth 1.7.25 at `/api/auth/*` before body parsing; the application API remains `/api/v1`. Drizzle uses the shared Faji PostgreSQL pool. Migration 0104 is unchanged. Additive migrations 0105–0107 historically introduced claims and add optional authenticator factors, verified phone identities, explicit step-up proofs, operator scopes and atomic session revocation on password changes.

New accounts atomically receive a profile, active account and customer role only. Clients cannot choose identity IDs, roles, verified-phone/MFA flags or administrative scopes. Authentication identity and domain ownership remain separate: every protected request validates the session/token, account suspension/revocation and current database roles; resource memberships, business approvals, driver eligibility and administrator scopes remain server-enforced.

Sessions last seven days, renew after a day, and have no cookie cache. Logout/revoke-current deletes the server session. Password mutation revokes existing sessions atomically in PostgreSQL; MFA enrollment/revocation also invalidates pre-change sessions. Email and verified-phone recovery use expiring, single-use proofs and preserve enrolled MFA.

Admin authorization does **not** infer password proof from a session creation timestamp. `/api/auth/faji/step-up` verifies the actual credential through Better Auth crypto, requires an enrolled authenticator or single-use recovery code where applicable, records proof/audit and expires after five minutes. SMS-only sessions do not establish this proof. Older identity/finance routes now require explicit operator-owned `identity.write`, `governance.write`, `finance.read` or `finance.write` scopes. The runtime can read grants but cannot issue them.

## Phone OTP and optional MFA

MFA is optional for Customer, Business, Ride/Dispatch and Admin. Enrollment returns an authenticator setup key and recovery codes; verification is required before enabling the factor. Sign-in challenges precede session creation. Recovery codes can complete sign-in or step-up, are single-use, and can be regenerated. Disabling/re-enrolling MFA, viewing provisioning secrets/recovery codes and changing a verified phone require recent password/factor proof. There is no public support bypass for lost factors.

Verified phone enrollment requires an existing session, recent step-up and an E.164 OTP. Profile phone input is stored separately and cannot reserve an unverified login identity. Verified users without enrolled MFA may sign in with phone OTP. Enrolled users must use the password-plus-factor flow, preventing the phone verification endpoint from bypassing MFA. Verified-phone password recovery does not disable an enrolled factor. Phone identities can be revoked with step-up.

SMS delivery uses an explicitly configured owned HTTPS webhook (`FAJI_SMS_WEBHOOK_URL`, bearer secret `FAJI_SMS_WEBHOOK_SECRET`) accepting `{phoneNumber,code,purpose}`. Tests use only a private authenticated sink. Codes expire after five minutes, have three attempts, and are protected by per-path/IP, per-phone hourly and provider/ingress budgets. MFA has endpoint limits and account-level lockout. Provider delivery and real devices require separate acceptance.

## Web and native clients

All four Next.js apps share `packages/web_auth`: embedded registration/login/recovery/reset/phone forms, optional MFA challenges and account security settings. Protected pages render dynamically and validate the backend account. The fixed-upstream proxy validates URLs, timeouts, size, origin and cookie policy; forwards only auth cookies; removes bearer credentials recursively (including session arrays); rejects redirects; and sanitizes upstream errors. Cookies are host-only, HttpOnly, Secure over HTTPS, SameSite=Lax. Reset tokens are removed from the address bar after capture; staging access logs omit queries and redact reset paths.

Flutter remains native-only. Customer preserves its existing forms/controller and adds a second-factor prompt; Business and Ride/Dispatch share embedded auth/security forms. Only opaque session tokens go into `flutter_secure_storage`. MFA challenge cookies stay in memory, rotated tokens are retained, restored sessions are validated, network failures never grant cached access, and revoked sessions close protected workspaces. There are no external browser/hosted-login flows.

## Pre-launch identity boundary

Fajify has no real users. Legacy import, account linking/claiming and Keycloak rollback are not required and are removed from active code, UI, tooling and release gates. Migration 0108 removes the dormant claim tables/functions/trigger without rewriting applied SQL checksums. Every account registers directly with Better Auth. Normal database backup, restore and secret escrow remain operational requirements. No production data was accessed.

## Setup and verification

Use Node 20+ and pinned pnpm 9.15.9; `pnpm install --frozen-lockfile`. Root `.env.example` supplies development settings; provide existing S3 settings too. Use a separate migration owner/runtime role, apply the complete migration chain, and grant auth permissions with `grant-auth-runtime.sql` or the reviewed application grant helpers. `tooling/verify-auth-database.sh` requires explicitly marked disposable PostgreSQL 16 targets. Never edit applied migration checksums.

Each standalone Next app needs its own `.env.local` with owned `FAJI_API_URL` and exact `FAJI_WEB_ORIGIN`. The unified public Customer/Business staging app uses `FAJI_API_URL=https://api.fajify.com` and `FAJI_WEB_ORIGIN=https://preview.fajify.com` in its Next.js service. The API separately uses `BETTER_AUTH_URL=https://api.fajify.com` and includes `https://preview.fajify.com` in `FAJI_WEB_ORIGINS`; add exact origins for any separately deployed web clients that remain enabled. `BETTER_AUTH_URL` is the Better Auth base URL; only browser origins belong in the trusted-origin list. Do not add the API hostname as a trusted browser origin. Configure an exact origin (scheme, hostname and port, without a path); trailing slashes are canonicalized in the API configuration. Customer and Business routes on the unified app share the preview origin. The API's `FAJI_REGISTRATION_ENABLED` must be explicitly true for approved staging self-registration; login does not depend on that flag.

Native apps use `--dart-define=API_BASE_URL=https://<owned API>` and `--dart-define=FAJI_RECOVERY_URL=https://<trusted web origin>/reset-password`. Mock services default off; existing demo UI tests explicitly enable them.

See [private staging preparation](../../infrastructure/deployment/staging/README.md), [reproducible browser/device acceptance](../../tests/auth/README.md), and the release acceptance report for commands, actual results and blockers. PostgreSQL backup/restore compares all table contents and the migration ledger. Native device tests are supplied but are not reported as passed without an Android/iOS execution environment. Public deployment, production credentials remain unauthorized.
