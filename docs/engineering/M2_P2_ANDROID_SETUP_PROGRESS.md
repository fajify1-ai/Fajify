# Android setup and acceptance verification — 2026-10-27

Baseline: `7992d59` on `feat/m2-p2-customer-auth`.

## Local setup performed

- Downloaded the official Windows Android command-line tools archive identified in
  `M2_P2_ANDROID_VERIFICATION.md`. Its SHA-256 matched Google's published
  `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`.
- Installed into the previously absent local directory
  `C:\Users\omola\AppData\Local\Android\Sdk\cmdline-tools\latest`.
  Existing project files were preserved. SDK manager reports version **22.0**.
- Configured Flutter's local `android-sdk` to that SDK root and `jdk-dir` to
  `C:\Program Files\Java\jdk-24`. These are Flutter user settings, not committed
  project settings. No shared signing/release configuration changed.
- Flutter doctor confirms **Flutter 3.47.8 / Dart 3.13.7**. Flutter/Dart are still
  invoked through absolute paths; this work did not overwrite the user's PATH.
- The first download took time without streaming progress. It completed and passed
  verification. A redundant retry was stopped; it did not replace installed tools.

## Exact remaining Android blocker

| Component | Actual checked state |
| --- | --- |
| Command-line tools/sdkmanager | Installed, version 22.0 |
| `platform-tools/adb.exe` | Missing |
| `platforms/android-36/android.jar` | Missing |
| `build-tools/36.0.0/aapt.exe` | Missing |
| `ndk/28.2.13676358/source.properties` | Missing |
| `licenses/android-sdk-license` | Absent at verification |
| Android device/emulator | None listed by doctor |

Doctor still reports `Unable to locate Android SDK`: a command-line-tools-only
directory is not a complete build SDK. The requested debug build was actually
attempted with `--no-pub --debug` and
`--dart-define=FAJI_CUSTOMER_NATIVE_AUTH_ENABLED=false`. It exited **1** with:

```text
[!] No Android SDK found. Try setting the ANDROID_HOME environment variable.
```

No successful APK, Gradle/plugin compatibility result or Android authentication
smoke result is claimed. Windows Visual Studio tooling is also absent, which
affects Windows desktop builds rather than Android. No emulator/AVD was created.

## Developer interaction needed: license review

The setup guide requires interactive license review, rather than piping automatic
acceptance. An asynchronous request was presented to the developer. No acceptance
was inferred from elapsed time and no licenses were automatically accepted.

Run in PowerShell and review each prompt:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-24'
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "--sdk_root=$env:LOCALAPPDATA\Android\Sdk" --licenses
```

After review is completed, report the result so installation/build can resume.
There is no need to repeat the tools download. The next package command is:

```powershell
$Sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
& "$Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "--sdk_root=$Sdk" --install 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'
```

Do not treat this documented command as an installation already executed.
After successful package installation, rerun doctor, locked package resolution,
Flutter tests/analysis and the debug build using the original setup guide. Keep
native authentication disabled until Phase 1 approves the public configuration.
Use a real device or approved emulator for browser return, secure-store, restart,
refresh, expiry and logout checks; desktop tests are not native-device evidence.

Local evidence logs:

- `%TEMP%\fajify-m2-p2-android-setup-doctor.log`
- `%TEMP%\fajify-m2-p2-android-setup-build.log`
- `%TEMP%\fajify-m2-p2-android-setup-flutter-tests.log`

## Regression results and existing security coverage

- **80 Flutter tests passed**; Flutter analysis reports no issues.
- **58 web tests passed**; TypeScript and Next.js production build passed.
- **Production HTTP smoke test passed** against the built, explicitly disabled
  routes; no live provider was used.
- **56 backend non-database tests passed**; backend typecheck, lint and build passed.
- Four backend database tests remain unexecuted without the separate disposable
  PostGIS target. No shared database or Phase 1 test guard was modified.
- The unchanged PostgreSQL adapters retain their previously verified real isolated
  11-scenario evidence; that suite was not rerun merely for local SDK installation.

The requested negative cases already have coverage; no duplicate tests or rebuilt
authentication components were added:

| Acceptance area | Existing test evidence | Limit |
| --- | --- | --- |
| Unauthorized/expired access | Mobile `test/auth/auth_controller_test.dart`; web `test/auth.test.ts`, `test/routes.test.ts` | Local state and HTTP/SDK fixtures, not live accounts |
| Customer role enforcement | Mobile controller/identity-client tests; web identity API tests; API `test/roles.test.ts` | Real issuer/account approval still pending |
| Callback cancellation | Mobile `test/auth/native_oidc_test.dart`; web `test/journey-http.test.ts` | Native browser/device handoff pending |
| Secure logout | Native tests cover storage clearing before remote failure; web session/route tests cover invalidation and CSRF | Native keystore and live provider revocation pending |
| Verification/recovery denial | Mobile `test/auth/browser_journeys_test.dart` covers unverified/expired results and late recovery after logout | Real SMTP/action-link expiry and old-password rejection pending |
| Cross-customer rejection | Native refresh rejects subject switching; identity clients bind expected subject; API `test/access.test.ts` denies missing resource membership | Live customer A/B resource ownership acceptance still required |
| Backend negative authorization | API account-revocation, session, roles, admin-access and access tests | Shared PostGIS/live Keycloak acceptance separate |
| Sensitive-data redaction | Mobile native/journey failure tests; web identity/route/storage tests; prior isolated PostgreSQL log scan | Deployment proxy/telemetry log configuration still needs approval |

## Concise Phase 1 request

Use the full `M2_P2_LIVE_CONFIGURATION_CHECKLIST.md` for handoff. Still needed:

1. Exact HTTPS issuer for realm `faji` and API HTTPS origin; trusted discovery,
   JWKS, UserInfo and API access with audience `faji-api`.
2. Deployment confirmation for existing mobile client `faji-customer-mobile` and
   callback `com.faji.customer:/oauth/callback`; explicit logout allowlist approval
   (current native adapter requires the same URI).
3. Exact approved scopes for both platforms; adapters require openid/email, but
   no complete deployed scope string has been supplied.
4. A dedicated confidential customer-web client ID and secret-manager reference;
   exact approved HTTPS callback ending `/api/auth/callback`, same-origin post-logout
   URL, and provider token/SSO logout expectations. No web client ID was invented.
5. SMTP/from-address/TLS settings and secret references, action-link TTL/policies,
   verified delivery and account-enrollment/approval workflow.
6. Two distinct active verified customers plus unverified, pending, suspended and
   non-customer identities, test mailboxes and approval operator access.
7. Production web database TLS/runtime grants, key custody/rotation, session and
   transaction TTLs, operational timeouts, backup/cleanup and log-redaction policies.

No live Keycloak, SMTP or deployed API was accessed. Additional display-profile
fields remain blocked on a published DTO; `/auth/me` still supports subject/roles.

## Reusable Components

No application source or UI changes. Reused the existing Flutter test suites and
auth components, Next.js routes/SDK/session services, PostgreSQL adapters and API
guards. Fajify branding and complete Firebase runtime removal remain unchanged.

## Eight M2-P2 acceptance tasks

| Task | Status | Remaining acceptance |
| --- | --- | --- |
| 1. Flutter OIDC + PKCE | PARTIALLY IMPLEMENTED | Approved settings plus Android SDK/device handoff |
| 2. Registration/login/email verification | PARTIALLY IMPLEMENTED | Live Keycloak/SMTP and account approval |
| 3. Secure recovery | PARTIALLY IMPLEMENTED | Live reset/link expiry/old-password rejection |
| 4. Secure session lifecycle | PARTIALLY IMPLEMENTED | Native secure-store and live provider acceptance |
| 5. Customer profile | PARTIALLY IMPLEMENTED | Live subject/roles endpoint and additional DTO contract |
| 6. Navigation/customer roles | PARTIALLY IMPLEMENTED | Live A/B customer authorization evidence |
| 7. Next.js server sessions | PARTIALLY IMPLEMENTED | Gated routes pass; approved deployment/live browser acceptance pending |
| 8. Tests/Android/integration evidence | PARTIALLY IMPLEMENTED | Regressions pass; SDK package/license step and debug/device verification blocked |
