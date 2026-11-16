# Better Auth implementation

This implementation follows `docs/architecture/AUTH_AND_WEB_MIGRATION_DECISION.md` and supersedes the runtime instructions in historical OIDC milestone reports. Those dated reports remain historical evidence.

## Runtime and ownership

NestJS hosts Better Auth 1.7.25 at `/api/auth/*`, before Express body parsing. The existing versioned application API remains under `/api/v1`. Better Auth uses the Drizzle PostgreSQL adapter and the existing application connection pool. Migration `0104_better_auth.sql` adds the authentication tables, database rate-limit storage, and operator-managed `application_roles`.

Passwords are hashed by Better Auth. New account creation atomically provisions the application profile, active account record and **customer role only** through an owner-controlled database trigger. Optional customer registration metadata is validated, normalized on mobile and copied into the application profile. Clients cannot grant merchant, driver, dispatcher or admin roles. Coarse roles are read from application PostgreSQL on each authenticated API request. Existing account suspension, revocation cutoffs, session revocation, resource memberships, business approvals, driver eligibility and admin scope guards continue to apply.

Privileged operations require an operator-granted `platform-admin` role, a password sign-in within the last five minutes, and their existing resource/admin scopes and request budgets. Session renewal does not reset authentication time. This replaces the old provider client/ACR/MFA claim checks; it does **not** claim MFA assurance. Optional MFA enrollment and stronger operation-specific step-up remain separate work.

Sessions expire after seven days and are renewed after one day of use. Cookie caching is disabled so session deletion takes effect immediately. Sign-out deletes the server session. Application `revoke-current` deletes the Better Auth session and records revocation/audit atomically. Password reset uses a single-use expiring token and revokes all prior sessions. Rate limits live in PostgreSQL. Authentication request IPs come from the connection socket; client-supplied forwarding headers cannot bypass them. Behind a proxy, the proxy shares a rate bucket: configure reviewed ingress rate limiting before increasing traffic, rather than trusting arbitrary forwarding headers.

## Web

Customer, Admin, Business and Ride & Dispatch are Next.js workspaces. `packages/web_auth` supplies the Better Auth React client, embedded login/registration/recovery/reset forms, logout, fixed-upstream proxy and server session check.

Each app proxies `/api/auth/*` to NestJS and forwards host-only HttpOnly session cookies. Production cookies use Secure and SameSite=Lax. Mutation requests require the app's exact configured Origin; the backend independently checks trusted origins. The proxy strips bearer token response headers and JSON token fields. Browser code never stores an authentication token in localStorage. Protected dashboard server components validate `/api/v1/auth/me` on every request with `no-store`, then apply the workspace role gate. The backend remains authoritative for every resource request. Suspended/revoked accounts receive an access-unavailable page.

## Native mobile

`packages/flutter_core` provides an HTTP Better Auth client, secure token storage and embedded credential/recovery/reset forms. Customer's existing forms/controller use `BetterAuthRepository`; Business uses `BetterAuthIdentityService` with the shared forms for both standalone and embedded entry; Ride & Dispatch uses the shared forms and validates its account through the API.

The native clients submit email/password directly to the owned API, keep only the opaque session token in `flutter_secure_storage`, attach it as a bearer, and validate restored sessions and application access with the backend. They do not decode a token to grant roles. Logout revokes remotely before removing the local token; on network failure the token remains available for a revocation retry. Invalid sessions are removed from secure storage. AppAuth/browser OIDC adapters, callback registrations and Flutter web entrypoints were removed.

Recovery emails include a single-use token that users can paste into the native **Use recovery link** form. No browser handoff is required. The email also includes the owned web reset link. Automatic universal/app-link handling is not implemented.

## Local setup

1. Use Node 20+ and the pinned `pnpm@9.15.9` (`corepack enable`). Run `pnpm install --frozen-lockfile`.
2. Copy the root `.env.example` into an ignored local environment file. Replace the auth secret with at least 32 random characters. Supply the existing S3 settings required by API configuration as well.
3. Start PostgreSQL/PostGIS, Redis and Mailpit with `docker compose --env-file .env -f infrastructure/docker/compose.yaml up -d`. Mailpit UI is at `http://localhost:8025`.
4. Run migrations using an owner connection: `FAJI_DATABASE_URL=<owner URL> pnpm --filter @faji/database migrate`. Keep old applied migrations unchanged; their checksums are enforced.
5. Grant the restricted API role the auth-table permissions in `packages/database/scripts/grant-auth-runtime.sql`, substituting the actual role. The existing disposable runtime grant helper also includes these grants. `application_roles` is SELECT-only for the runtime. Start the API with the runtime connection and `pnpm --filter @faji/api dev`.
6. Copy each web app's `.env.example` to `.env.local`. Start the apps with `pnpm --filter @faji/customer-web dev`, `@faji/admin-web`, `@faji/business-web`, and `@faji/ride-dispatch-web`. Default ports are 3000, 3002, 3003 and 3004; API is 3001. List their exact origins in `FAJI_WEB_ORIGINS`.
7. Run native apps with `--dart-define=API_BASE_URL=https://<owned API>` and `--dart-define=FAJI_RECOVERY_URL=https://<trusted web origin>/reset-password`. Release builds require HTTPS. `USE_MOCK_SERVICES` defaults to false; true is an explicit demo/test setting and must not be used for deployed builds.

Production/staging require HTTPS, a real SMTP transport (`SMTP_URL`) and `AUTH_EMAIL_FROM`. Use deployment secrets, distinct migration/runtime roles, backups and the existing resource/admin grant procedures. Never deploy the sample secret.

## Verification

The implementation was checked with the pinned pnpm version, real PostgreSQL 16, local SMTP/Mailpit, Chromium, Flutter 3.50.0 and Dart 3.14.0:

- Workspace TypeScript checks and API production build.
- All four Next.js production builds.
- 167 API unit tests, retaining domain authorization and cross-resource checks.
- Real Better Auth/PostgreSQL lifecycle test: registration, untrusted role input, profile provisioning, web cookie/native bearer, bad credentials/origin, suspension, recovery, single-use reset, reset revocation, logout and expiry.
- Chromium registration and protected-route checks on all four web apps, HttpOnly cookies, stripped browser bearer tokens, workspace role denial, and customer logout. Browser recovery was verified through SMTP delivery, embedded reset and subsequent sign-in.
- 66 Customer Flutter tests (explicit demo flag for existing merchant UI fixtures), 43 Business tests and six shared native auth tests. An additional native registration adapter test covers form normalization and backend authorization before granting customer access.
- Flutter analysis reports no errors or warnings; the newer SDK emits Material import deprecation notices.

The focused database test requires a **fresh**, disposable `fajify_auth_test*` database and local SMTP at port 11025:

```sh
FAJI_AUTH_TEST_DATABASE_URL=<disposable URL> pnpm --filter @faji/api exec tsx --test test/better-auth.database.test.ts
```

It installs only the auth/profile/authorization fixture, not the entire PostGIS domain schema. Existing domain database acceptance suites were not rerun in this migration. Native device builds, real keychain/keystore behavior, production SMTP and deployment ingress were not verified.

## Rollout boundary and remaining work

No old identities are silently linked by matching email, and no passwords, grants or sessions are automatically imported. Existing Keycloak subjects must be reconciled to Better Auth IDs through a separately reviewed migration that preserves application references and grants, with verified ownership, backup, rehearsal and rollback. This change must not be deployed over existing accounts without that plan. Old sessions must be invalidated; removed Keycloak services are not recreated by a rollback of application code alone.

The restricted-role probe in `tests/security/better-auth-runtime.sql` passed: owner-trigger customer provisioning succeeds while runtime admin self-grants are denied.

Before rollout: apply and verify the full migration chain on a disposable PostGIS database, exercise the deployment-specific grants, configure TLS/SMTP/ingress limits, provision approved application roles/scopes, and validate physical Android/iOS flows and storage. Phone OTP delivery, optional MFA enrollment, stronger step-up, and automatic recovery app links are additional architecture work; they are not implemented or represented as accepted here.
