# M2-P2 configurable OIDC adapters — 2026-10-26

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
