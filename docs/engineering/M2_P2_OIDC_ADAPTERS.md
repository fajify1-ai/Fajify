# M2-P2 configurable OIDC adapters — 2026-10-26

Historical adapter milestone. The [customer account journey report](M2_P2_ACCOUNT_JOURNEYS.md) records the subsequent registration, verification, recovery and HTTP journey work with current acceptance statuses.

## Native milestone: tasks 1–3

Published baseline verified: origin/feat/m2-p2-customer-auth = 749f7b9f7174718769b61029c60a413695412fae. The preferred working folder and branch remain C:\Users\omola\OneDrive\Desktop\Fajify-main and feat/m2-p2-customer-auth. No remote changes are made.

### Implemented

- Pinned flutter_appauth 12.1.0, a native bridge to Android/iOS AppAuth. SDK owns system-browser Authorization Code + PKCE, state/nonce, exchange and callback handling. No custom password request or raw callback acceptance.
- NativeOidcSettings reads explicit build environment values. Missing/invalid/disabled values use the existing unavailable repository. No client secret is supported. The client and custom callback must match the published Phase 1 mobile contract; issuer, API origin, scopes and logout approval remain operator supplied.
- NativeKeycloakRepository composes SDK, account verification and the existing secure store. Credentials never enter AuthSession, UI state, SharedPreferences, logs or route parameters.
- Only refresh token, ID-token logout hint, configuration binding and subject are persisted. Cached values never authorize: restoration always refreshes through AppAuth and checks UserInfo plus NestJS /api/v1/auth/me.
- UserInfo is obtained from HTTPS discovery with exact issuer and same-origin endpoint checks. Email must be verified; the backend must return the same subject with customer role and an active account. No unsigned JWT decoding is treated as identity proof. All requests reuse the bounded native JSON transport.
- Refresh preserves rotated refresh tokens; omission preserves the prior token per OAuth behavior. Refresh checks subject continuity, expiry, verification and active-account policy before persistence.
- AuthController schedules refresh 30 seconds before an eligible Keycloak access token expires and retains its expiry guard. Resume checks expiry and requests refresh through the controller.
- Serialized operations and logout generation invalidate late login/refresh results. Concurrent refresh calls share one request. Logout removes local credentials before browser RP end-session; provider failure is reported without claiming success. Stored hints can be used after restart. This is RP end-session, not a claim of separately verified native RFC 7009 revocation.
- iOS storage is explicitly device-only, accessible while unlocked and not synchronizable. Android backup remains disabled. Platform-backed behavior still needs device acceptance.
- Registered the already published com.faji.customer callback scheme in Android/iOS. Removed Android taskAffinity=\"\" as documented by flutter_appauth to avoid callback return failure. Exact native callback/device behavior is unverified.
- Browser-mode sign-in/registration reuse the existing form layout and primary button without local credential fields. Legacy form variants remain testable and retain pixel evidence. No colors, typography or navigation patterns were redesigned.

### Environment configuration

Copy oidc-config.example.json to a local ignored file, fill it with reviewed public settings and invoke Flutter with --dart-define-from-file. Keep FAJI_CUSTOMER_NATIVE_AUTH_ENABLED=false until settings and platform acceptance are approved. Do not put credentials in this file.

Required keys:
- FAJI_CUSTOMER_NATIVE_AUTH_ENABLED
- FAJI_CUSTOMER_OIDC_ISSUER (HTTPS, exact issuer, no trailing slash)
- FAJI_CUSTOMER_API_ORIGIN (HTTPS origin only)
- FAJI_CUSTOMER_OIDC_CLIENT_ID
- FAJI_CUSTOMER_OIDC_REDIRECT_URI
- FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI
- FAJI_CUSTOMER_OIDC_SCOPES (explicit space-separated scopes including openid and email)

The merged template identifies faji-customer-mobile and com.faji.customer:/oauth/callback. Those are contract constraints, not a deployed hostname or permission to enable production. The current adapter requires logout to return to the same registered mobile callback; coordinate a contract/native registration change if a different logout callback is approved.

Registration and recovery remain explicit browser-flow limitations: this milestone does not invent Keycloak registration/reset URLs or claim those actions succeeded. Recovery instructions direct users to the provider sign-in page. Existing local password fields are not used for Keycloak.

### Reusable Components

Reused AuthController, AuthSession, CustomerAuthRepository, BrowserOidcAuthorization, AuthFailure, CustomerIdentityClient, PlatformSecureSessionStore, AuthScope, CustomerAccessGate, AuthFormLayout, AuthPrimaryButton and existing loading/error/validation widgets. New SDK/settings/account/repository modules remain in the data layer. No new UI component or second application auth state was introduced.

### Verification

- Flutter analysis: zero issues.
- Full Flutter suite: 70 passed (previous 55 plus 13 native settings/SDK/lifecycle/account tests, one scheduled-refresh test and one browser UI test).
- Existing three component pixel comparisons remain in the passing suite.
- Dependency resolution added only flutter_appauth and its platform interface. The pub command reports the Windows plugin symlink/Developer Mode limitation after resolving dependencies; native package/build acceptance is not claimed.
- Native OAuth tests use an injected SDK double; they verify request/lifecycle plumbing, not actual Android/iOS PKCE or browser execution.
- Android/iOS builds, device keychain/keystore, real callback/login/refresh/logout, live Keycloak and live NestJS requests were not executed. Android SDK is still unavailable in this environment.

### Sources

- [flutter_appauth SDK, refresh, end-session and platform setup](https://pub.dev/packages/flutter_appauth)
- [AppAuth Android](https://github.com/openid/AppAuth-Android)

### Remaining blockers

Reviewed issuer/API/scopes/logout settings; real Keycloak deployment and isolated accounts; pending-account policy/UX acceptance; registration/recovery handoff approval; Android SDK and device verification; iOS toolchain/signing/callback and storage acceptance. Native SDK token revocation beyond RP end-session remains a separate reviewed integration.

The implementation is committed locally after verification. Obtain its exact hash with git rev-parse HEAD; the user-facing progress message records it. No push is performed.

~~~powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main'
git status --short
git branch --show-current
git log -5 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
~~~


## Web milestone: task 4

Native milestone committed as 9d89b954647a09a59c393f30c554c18eacd86a75. This web milestone follows it as a separate local commit.

### Implemented

- Added maintained openid-client 6.8.8 with its jose/oauth4webapi dependencies; existing dependency versions were not changed.
- OpenIdClientAdapter uses SDK discovery, random state/nonce, S256 PKCE, authorization-code exchange and explicit non-repudiation/JWS checks. UserInfo email verification and NestJS /me active-customer checks are mandatory.
- Initiation stores the verifier/nonce/state server-side and returns a host-only Secure/HttpOnly/SameSite browser-binding cookie. Callback reuses the existing atomically consumed, browser-bound transaction checks, then SDK signature/issuer/audience/expiry/nonce validation.
- Provider tokens are never included in ServerSession or browser cookies. ServerSession contains an opaque vault reference. The vault record binds credentials to issuer, client, API origin, callback/logout and scopes.
- A supplied ProviderCredentialStore must use encrypted durable storage and serialize refresh/logout across all server instances. No production in-memory store is implemented or selected. Test-only stores demonstrate the required locking semantics.
- SessionService now requires a validator for provider-backed records. Every validated read checks current provider email status and backend account access; near-expiry tokens refresh/rotate through the SDK. Refresh does not extend the approved absolute browser-session lifetime.
- Provider token revocation attempts both refresh and access token revocation using the discovered SDK endpoint. Vault records are removed even if revocation fails; callers do not claim remote success.
- Local session deletion is attempted even when session retrieval fails. completeOidcLogin cleans up the provider session if durable browser-session creation fails, and returns an expired transaction-binding cookie on success.
- No auth routes are mounted, no customer web client is invented, and public Next.js pages remain unchanged. Browser SSO RP end-session routing remains pending; token revocation alone is not claimed to clear the provider's browser cookie.

### Web environment and composition

The server-only .env.example adds FAJI_CUSTOMER_WEB_AUTH_ENABLED=false plus explicit API origin, scopes, session maximum age and transaction maximum age fields. Issuer/client/secret/callback/logout placeholders remain blank. Both lifetimes require approved positive integer seconds; no live duration or hostname is invented. Never use NEXT_PUBLIC_ for these secrets.

loadWebOidcSettings returns null unless enabled and all required values validate. Valid values alone do not mount application routes: approved durable session, transaction and encrypted provider-credential stores must also be composed. The existing customer.server.ts remains disabled. Once approved, construct the adapter and SessionService with the adapter as both revoker and validator; reuse the callback service, completeOidcLogin, guarded handlers and POST/exact-Origin logout. Append both returned cookie headers; never return provider/session records to browser JavaScript.

### Reusable Components

No new Next.js UI or duplicate forms were introduced. Reused loadAuthConfiguration, OidcCallbackService, SessionService, SessionRevoker, guarded-handler/logout helpers and CustomerIdentityClient. Authentication remains server-only. New durable-store interfaces supply token custody/rotation without duplicating application auth state or introducing Firebase.

### Web verification

- Full web suite: 32 passed (previous 20 plus 12 SDK/configuration/lifecycle/session tests).
- The real openid-client SDK processes synthetic RSA-signed ID tokens through mocked HTTPS provider endpoints. Tests reject bad signature, wrong nonce/issuer/audience/expiry, replay, unverified email and denied customer account.
- Refresh rotation, serialized concurrent refresh/logout, changed configuration, session expiry, vault cleanup, provider revocation failure and failed cookie-session creation are tested.
- Web TypeScript check and Next.js production build passed.
- Frozen/offline pnpm 9.15.9 install passed; new lockfile entries are limited to the SDK and its two dependencies.
- pnpm audit returned exit 1 with the same two pre-existing high advisories in zod and multer. No new advisory was reported for the SDK additions. Audit evidence: C:\Users\omola\AppData\Local\Temp\fajify-oidc-sdk-audit.json. Shared dependency remediation remains coordinated Phase 1 work.
- Live browser OIDC/Keycloak, durable-store adapters and distributed locking under a real database, native devices and real provider revocation were not exercised. Synthetic fixtures are not live acceptance.
- No backend source, shared security policies, production credentials or other checkout was changed.

## Updated eight-task checklist

| Task | Current implementation and remaining acceptance |
| --- | --- |
| 1. Flutter OIDC Code + PKCE | Native AppAuth gateway/composition and callback registrations implemented; disabled until explicit valid settings; device/browser acceptance pending |
| 2. Registration, verification, login | Browser login and UserInfo/email + backend customer verification implemented; local password fields removed in browser mode; direct registration/enrollment UX and live account-policy acceptance pending |
| 3. Recovery | Existing shared recovery UI retained; explicit provider sign-in-page guidance; no fabricated recovery success; direct approved handoff pending |
| 4. Secure session lifecycle | Device secure store, verified restoration, rotation, pre-expiry/resume refresh and local-first RP logout implemented/tested; native revocation policy/device acceptance pending |
| 5. /api/v1/auth/me | Existing typed clients now composed into native and server adapters; live integration and separate display-profile DTO remain pending |
| 6. Navigation/roles | Existing route protection reused; verified email/subject/customer account policy enforced by adapters; server authorization remains authoritative |
| 7. Next.js server-managed auth | Maintained SDK, cookie/session validation, vault contract, refresh/revocation and cleanup implemented; durable store implementations, approved web client and mounted routes pending |
| 8. Evidence | 70 Flutter tests and 32 web tests pass, plus analysis/typecheck/build; Android/iOS/live distributed integration and existing dependency audit gates remain open |

## Delivery and next step

The preferred folder, origin and feat/m2-p2-customer-auth remain unchanged. Changes are committed locally; the final delivery message records the web commit hash and clean status. No automatic push or main merge occurs.

The next independent work is implementing an owner-approved encrypted durable store and reviewed route composition, followed by approved provider registration/recovery handoffs. Deployment settings are explicitly pending per the user. Do not invent production values, a web client, database credentials, account policy or successful backend responses. Native device checks require the Android SDK or an iOS build environment.

Manual delivery commands from the preferred folder:

~~~powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main'
git remote get-url origin
git status --short
git branch --show-current
git log -5 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
~~~

SDK source: [openid-client documentation](https://github.com/panva/openid-client).

Final source checks: no active Firebase matches, common secret-pattern findings, conflict markers or tracked local settings were found. Phase 1 sources and the retained Google configuration are unchanged from 749f7b9. Dart formatting checked 87 files with zero changes. These are scoped source checks, not native or live-provider acceptance.
