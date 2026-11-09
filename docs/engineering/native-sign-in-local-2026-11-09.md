# Customer native sign-in configuration fix

## Root cause

The ignored `apps/customer_mobile/oidc-config.local.json` contains valid development settings for the `fajify` realm. It does not need a password, token, client secret, or a realm-name change.

`NativeOidcSettings.fromValues` previously split the `FAJI_CUSTOMER_OIDC_SCOPES` value with `RegExp(r'\\s+')`. In a Dart raw string this matches a literal backslash followed by `s`, rather than whitespace. Consequently `openid email` remained one scope. Validation rejected it, the catch block returned null, and `createCustomerAuthRepository` selected `PendingKeycloakRepository`. That repository does not implement `CustomerPasswordSignIn`. `AuthController.signIn` therefore produced `Account sign-in is not configured.` before making any network request. Enabling Direct Access Grants on Keycloak could not affect that client-side failure.

The fix uses `RegExp(r'\s+')`. Application composition now uses a strict parser and an explicit failure repository that reports missing, disabled, invalid, or unsupported configuration through normal authentication state. It no longer silently selects the pending integration stub. Dart defines are compile-time settings: changing the JSON requires restarting/rebuilding Flutter with `--dart-define-from-file`, not just hot reload.

A separate backend blocker was found in the ignored root `.env.local`: `KEYCLOAK_ISSUER` still used `http://localhost:8080/realms/fajify`. It was corrected to the phone's HTTPS issuer. The specific local NestJS process listening on port 3001 was identified and restarted with that configuration and the public development CA set in `NODE_EXTRA_CA_CERTS` **before starting Node**. A check confirmed Node's ordinary HTTPS client can now fetch discovery with status 200. Setting `NODE_EXTRA_CA_CERTS` only inside `--env-file` was insufficient on this Node installation; set it in the launching PowerShell environment as shown below.

## Local account and policy setup

The local realm has one enabled account, no email-verified accounts, and no SMTP host/from configuration. The user explicitly selected straightforward customer login without an email-verification step. SMTP setup was stopped; no email-verification flags were changed. The customer controller no longer automatically imposes email verification merely because the provider is Keycloak. UserInfo returns the actual verification metadata, and the session preserves false for an unverified address. An explicit requireVerifiedEmail policy remains available for consumers that opt into it. No backend token/account authorization check was removed.

The local API database was also uninitialized (PostGIS extension tables only). The repository's existing migration runner successfully applied its application migrations to the validated local 127.0.0.1:5433/faji_dev database. The sole local customer was provisioned with active profile/access rows without overriding any pre-existing suspended account. A local setup audit event was recorded. The missing customer realm role was assigned and the missing faji-api audience mapper was added to the local mobile client. No production realm or production database was changed.

The verification UI also hid its status view when a browser action started, concealing subsequent errors. That view now remains visible for pending and failed actions; native password sign-in shows its own progress text instead of browser instructions.

## Request and session path

`UserAuthScreen._signIn` validates the visible email/username and password fields and calls `AuthController.signIn`. The configured `NativeKeycloakRepository` calls `NativePasswordSignIn`, which posts a form directly to:

`https://localhost:8443/realms/fajify/protocol/openid-connect/token`

The form includes `grant_type=password`, the public mobile client ID, scopes, username, and password. Redirect following is disabled; there is no browser authorization call in this sign-in path. Passwords are cleared from the form after the attempt and are not written to session storage or logged.

Before granting access, the repository validates token fields/expiry, verifies the discovery issuer and UserInfo subject, preserves the actual email-verification metadata, and calls NestJS `/api/v1/auth/me` to require an active customer account with the matching subject. Only then does it store refresh/ID tokens in platform secure storage and create customer session metadata. The controller gates navigation to customer home. The user explicitly selected a customer policy with no separate email-verification requirement; the app does not claim unverified email is verified. Incorrect credentials, required setup/email verification, throttling, server unavailability, TLS failures, and connection failures remain distinct sanitized errors.

## Android development HTTPS

The Samsung `RFCY508YB6X` was attached and authorized, but its reverse mappings were initially absent. Ports 8443 and 3443 were restored. Host-side HTTPS checks with the development root CA returned Keycloak discovery 200 with the expected `fajify` issuer, and API 401 without a token.

The first device integration test selected the native repository correctly, then failed with a TLS handshake error in Dart networking. The debug Android XML trusts user-installed roots for native Android networking; that did not provide the required trust to this Dart HTTP client on the device.

The fix reads the public development CA from `src/debug/res/raw/fajify_root_ca.crt` through a debug-only platform channel. Only Android debug requests to HTTPS `localhost:8443` and `localhost:3443` add that CA to a per-client `SecurityContext`. Default trusted roots, certificate-chain checks, and hostname checks remain enabled. No permissive certificate callback or HTTP fallback is used. The CA resource is ignored by Git and Android's debug source set excludes it from release packaging. The native channel is disabled when the application is not debuggable. Production configuration and trust settings are unchanged.

`tooling/run-customer-android-local.ps1` copies the public root certificate from the ignored local certificate directory, restores the reverse mappings, and starts Flutter with the correct JSON file. It never copies the private key. The existing Android user CA installation is still needed for local SDK-based registration, recovery, refresh, and logout flows that use Android networking.

## Rebuild and test

From PowerShell:

```powershell
cd "C:\Users\omola\OneDrive\Desktop\Fajify-main"
.\tooling\run-customer-android-local.ps1 -DeviceId RFCY508YB6X
```

Equivalent Flutter invocation after preparing the debug CA and ADB mappings:

```powershell
cd "C:\Users\omola\OneDrive\Desktop\Fajify-main\apps\customer_mobile"
& "C:\src\flutter\bin\flutter.bat" run --debug -d RFCY508YB6X --dart-define-from-file=oidc-config.local.json
```

Regression commands from `apps/customer_mobile`:

```powershell
& "C:\src\flutter\bin\flutter.bat" analyze --no-pub
& "C:\src\flutter\bin\flutter.bat" test --no-pub test/auth
& "C:\src\flutter\bin\flutter.bat" test integration_test/native_auth_connectivity_test.dart -d RFCY508YB6X --dart-define-from-file=oidc-config.local.json --no-pub
```

To restart the local API in a separate PowerShell after stopping the existing development API (the compiled `apps/api/dist/main.js` must already exist):

```powershell
cd "C:\Users\omola\OneDrive\Desktop\Fajify-main"
$env:NODE_EXTRA_CA_CERTS = (Resolve-Path 'infrastructure/certs/fajify-rootCA.crt').Path
node --env-file=.env.local apps/api/dist/main.js
```

The device integration test uses discovery and unauthenticated API access without storing real credentials. A successful real-user login must be confirmed separately on the phone.

## Deployment requirements and production blockers

- Existing realm: `fajify`; public client: `faji-customer-mobile`; Direct Access Grants enabled, with no client secret in Flutter. Keep brute-force protection and the API customer-access checks enabled. Customer sign-in does not require email verification under the explicitly requested product policy.
- API: configured issuer must exactly match `https://localhost:8443/realms/fajify` in local development; its audience must match the token's API audience mapper. Its own JWKS networking and certificate trust must work independently of the phone. The user must map to an active customer account.
- Required actions, federation/SSO-only accounts, and MFA/passkeys that need interactive steps cannot be completed by this two-field password grant. These need a separate account journey. An unverified email address now remains metadata and does not block ordinary customer sign-in. Do not use email ownership for identity merging or sensitive actions without separate proof.
- OAuth Security BCP RFC 9700 section 2.4 says Resource Owner Password Credentials MUST NOT be used. Keycloak documents the same guidance and the loss of interactive authentication features. Shipping this grant is an unresolved production security/design blocker, rather than something TLS alone fixes. Sources: [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html#name-resource-owner-password-cre) and [Keycloak guidance](https://www.keycloak.org/securing-apps/oidc-layers).
- Production needs reachable service hostnames, publicly trusted TLS (or an explicitly managed trust model), production secrets on the backend only, and proper Android release signing. The repository's pre-existing release build currently selects the debug signing configuration; this task does not change that setting.

## Files changed by this follow-up

- `apps/customer_mobile/lib/features/auth/data/native_oidc_settings.dart`: corrected scopes and explicit configuration diagnostics.
- `apps/customer_mobile/lib/features/auth/data/customer_auth_composition.dart`: deterministic native repository selection and actionable failure repository.
- `apps/customer_mobile/lib/features/auth/data/identity_http_io.dart`: TLS/network/timeout errors and bounded nonredirecting transport.
- `apps/customer_mobile/lib/features/auth/data/identity_http_client.dart`: narrowly scoped Android debug CA trust.
- `apps/customer_mobile/lib/features/auth/data/native_password_sign_in.dart`: server-unavailable response handling.
- `apps/customer_mobile/lib/features/auth/data/native_account_verifier.dart`: subject/API verification with accurate email-verification metadata, without a customer email gate.
- `apps/customer_mobile/lib/features/auth/data/native_keycloak_repository.dart`: preserves actual verification metadata in the session.
- `apps/customer_mobile/lib/features/auth/application/auth_controller.dart`: applies an email-verification gate only when explicitly requested.
- `apps/customer_mobile/lib/features/auth/presentation/screens/user_auth_screen.dart` and `widgets/auth_status_view.dart`: visible inline progress/errors.
- `apps/customer_mobile/android/app/src/main/kotlin/com/faji/app/MainActivity.kt`: debug CA platform channel.
- `.gitignore`: local debug public CA exclusion; public CA copied locally under `src/debug/res/raw`.
- `.env.local` (ignored, local only): matching HTTPS API token issuer and public CA location. Runtime Node CA trust was set explicitly in the launch environment.
- `apps/customer_mobile/test/auth/customer_auth_composition_test.dart`: development config, missing/disabled/invalid config and repository selection.
- `apps/customer_mobile/test/auth/identity_http_client_test.dart`: release/platform/hostname/port trust isolation.
- `apps/customer_mobile/test/auth/native_password_sign_in_test.dart`: native form invalid/valid credential journey, session and navigation, no browser call.
- `apps/customer_mobile/test/auth/customer_access_gate_test.dart`: actionable configuration error expectation.
- `apps/customer_mobile/test/auth/native_oidc_test.dart`, `auth_controller_test.dart`, `oidc_callback_controller_test.dart`, and `browser_journeys_test.dart`: customer email policy, preserved verification metadata, retained API denial and verification-feedback regressions.
- `apps/customer_mobile/integration_test/native_auth_connectivity_test.dart`: real-device configuration and HTTPS endpoint checks.
- `tooling/run-customer-android-local.ps1`: repeatable local phone launch.
- This report. The local JSON settings remain unchanged.

## Verification results

- Authentication regression suite: **83 passed**.
- `flutter analyze --no-pub`: **no issues found**.
- Samsung SM-A366B / `RFCY508YB6X` integration test: **passed** after the debug CA fix; native repository selected, issuer/token endpoint matched, HTTPS discovery returned 200, unauthenticated HTTPS API returned 401.
- PowerShell launcher: parser check passed. ADB reverse mappings for 8443 and 3443 confirmed.
- Normal debug app rebuilt, installed, and launched on the Samsung with `oidc-config.local.json`.
- The first real-account attempt reached the old UserInfo email gate. The user then explicitly requested customer login without separate email verification; that product policy was implemented without changing the account's emailVerified flag.
- **Live acceptance confirmed:** after the updated app was installed and the local customer role, API audience, schema, and account rows were configured, the user retried on Samsung `RFCY508YB6X` and reported **"it signed in"** in response to the native-login/home/no-browser check. No password was supplied to the agent or stored in the report.
