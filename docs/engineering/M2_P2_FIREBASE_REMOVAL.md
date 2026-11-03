> Preserved development record. The official working folder is now C:\Users\omola\OneDrive\Desktop\Fajify-main. See [workspace restoration](M2_P2_WORKSPACE_RESTORE.md) for current verification and manual push instructions. No GitHub push is authorized.

> This report records the earlier uncommitted migration snapshot. See [current reconciliation and verification report](M2_P2_RECONCILIATION.md) for the combined local commit and current status.

# FAJIFY M2-P2 PROGRESS REPORT — 2026-10-26

Branch: `feat/m2-p2-customer-auth`. Working checkout: `C:\Users\omola\Projects\Fajify-m2-p2`.
No remote publish, push, merge or rebase was performed. Existing commits: `e15e17f`, `9894a3e`.

## Current behavior

Firebase SDKs, initialization, provider auth implementation, UID mapping, Firestore reads/writes and Android Google Services plugin activation have been removed from the customer application. Flutter tooling regenerated the dependency lockfile and platform registrants. Other applications, packages and infrastructure had no active Firebase integrations in the repository search.

Startup uses the pending Keycloak repository. Sign-in, registration and recovery report unavailable until a maintained browser OIDC SDK and approved configuration are composed. Browser flows do not send the form passwords to an identity provider. AuthController retains session restoration, expiry, sign-out, race protection and customer access gates. No credentials or tokens are stored in SharedPreferences.

Discovery, profile, plans, wishlist and bookings have typed provider-independent repository interfaces. Their models describe existing presentation state, not proposed backend DTOs. The approved generated OpenAPI and backend integration document expose health endpoints only; no speculative customer HTTP requests were added.

Missing discovery and plan contracts raise ServiceUnavailable rather than returning fabricated results. Screens preserve layouts and navigation and display unavailable states. Profile preserves its header with an unavailable label. Wishlist has no retained account cache or optimistic writes; unsupported writes fail explicitly. Bookings show unavailable; reservation submission cannot charge a mock payment, fabricate a ticket, generate a QR token or navigate to confirmation. Existing demo fixtures remain for tests/design source but are no longer repository fallbacks.

## Shared components and boundaries

Reused the existing auth forms, validation, buttons, fields, loading/error widgets, AuthScope, AuthController and CustomerAccessGate, including pre-existing uncommitted component work. Added shared ServiceUnavailable and ServiceUnavailableView. BrowserOidcAuthorization now lives in the auth domain and is dispatched by the controller/forms.

PlatformSecureSessionStore adapts flutter_secure_storage for native Android/iOS only, with a dedicated customer-session key, scoped deletion and no plaintext/browser/desktop fallback. Android backup is disabled and minimum SDK is at least 23. This adapter is not yet composed into a live OIDC lifecycle; cached values must never grant access without provider verification. Native keystore/keychain behavior, iOS signing/keychain capabilities, encrypted backup/restore behavior and logout/revocation require device acceptance before enabling live storage. See the [package configuration guidance](https://pub.dev/packages/flutter_secure_storage).

## Remaining ownership and integration work

- `apps/customer_mobile/android/app/google-services.json` is an imported, potentially shared Firebase client configuration. AUTHORS.md attributes the original app to Temiloluwa Faith Kareem. Its build plugin is disconnected; the file is retained pending coordination with the original app owner/repository maintainer. No cloud resources, production data or external credentials were deleted. Do not claim complete repository Firebase cleanup until that ownership review is resolved.
- Agree Keycloak issuer, public mobile client, exact redirect/logout callbacks, web confidential client, scopes, account/email verification policy, native SDK and server-authorized subject mapping with the identity owner.
- Agree profile, discovery, plan, wishlist and booking API contracts with Developer 1. Booking requires server-authoritative availability, pricing, idempotency, payment and ticket issuance. Implement adapters through existing interfaces after contract publication.
- Finish SDK callbacks, refresh/revocation and secure-store composition; finish durable web session/transaction stores and OIDC SDK composition. Existing server-managed Next.js auth boundaries remain pending, not a working production login.
- Historical import/runtime/auth progress documents retain past observations; this document supersedes their instruction to retain the legacy runtime provider.

## Verification

- PASS: Flutter analyzer, zero issues (`flutter analyze --no-pub`).
- PASS: full Flutter suite, 37 tests (`flutter test --no-pub`), including startup/access gates, expiry/logout, recovery, shared controls, secure-storage failures/scoped deletion, missing data APIs, retained navigation and preventing local booking confirmation.
- PASS: Dart formatting on modified sources and tests; `git diff --check`.
- PASS: customer web TypeScript (`tsc --noEmit`), all 16 server-auth tests and production Next.js build. Invoked installed binaries directly because global pnpm tried incompatible workspace installation and failed with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. No pnpm lockfile was rewritten.
- PASS: built customer web started locally and GET / returned HTTP 200 with HTML; the temporary server was stopped.
- PARTIAL: Flutter pub resolution removed all Firebase packages and added flutter_secure_storage 11.2.0; generated lockfile and registrants updated. Pub exits at Windows symlink creation because Developer Mode/symlink support is unavailable. Analysis/tests used the resolved package graph with --no-pub.
- BLOCKED: Android debug build, no Android SDK configured in this environment. Device enumeration did not produce a result and was stopped. Physical-device startup and secure keystore/keychain checks were not run. iOS/macOS compilation was not run on Windows.
- NOT RUN: live Keycloak login/registration/recovery, SDK callback/refresh/revocation, customer API persistence, real bookings/payments, native encrypted backup/restore and production web session persistence. These remain integration dependencies, not verified features.
- SEARCH: no active Firebase imports, SDK dependencies, initialization, Firestore repositories, Google Services build plugins or generated Firebase registrants remain across apps/packages/infrastructure. The one retained Android JSON config is disconnected, pending ownership coordination. Historical documentation and migration test/report filenames retain the name intentionally.

Migration acceptance remains incomplete while native startup and live authenticated flows are unverified. No new local commit was created; current HEAD is `9894a3e48dd7b9882a3ba1a096e62fee62d4b64a`. Migration and pre-existing component changes remain in the working tree for review.

## Files changed

Customer mobile startup, auth domain/controller/browser boundary and forms; profile/discovery/plan/wishlist/booking repositories and screens; shared unavailable state; native secure session storage; Android build/manifest; pubspec manifest/lockfile and generated desktop registrants; auth/storage/migration tests. Architecture and migration documentation updated. The generated Next.js next-env.d.ts was refreshed by its production build; TypeScript incremental build cache is ignored. No web dependency changes were needed.

## Manual publish

To publish the two existing commits only, before committing additional work:

```powershell
Set-Location 'C:\Users\omola\Projects\Fajify-m2-p2'
git status --short
git log -2 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
```

Uncommitted migration changes are not included by git push. Review and commit them locally only after verification. Never infer that a remote push succeeded from this report.

Recommended next task: coordinate retained configuration ownership and implement the reviewed native OIDC SDK/lifecycle adapter, then run physical-device startup and secure-storage acceptance.
### Detailed changed files

- `.gitignore`
- `apps/customer_mobile/android/app/build.gradle.kts`
- `apps/customer_mobile/android/app/src/main/AndroidManifest.xml`
- `apps/customer_mobile/android/settings.gradle.kts`
- `apps/customer_mobile/lib/core/data/service_unavailable.dart`
- `apps/customer_mobile/lib/core/widgets/service_unavailable_view.dart`
- `apps/customer_mobile/lib/features/auth/application/auth_controller.dart`
- `apps/customer_mobile/lib/features/auth/data/firebase_auth_repository.dart`
- `apps/customer_mobile/lib/features/auth/data/oidc_auth_boundary.dart`
- `apps/customer_mobile/lib/features/auth/data/platform_secure_session_store.dart`
- `apps/customer_mobile/lib/features/auth/domain/auth_input.dart`
- `apps/customer_mobile/lib/features/auth/domain/auth_repository.dart`
- `apps/customer_mobile/lib/features/auth/domain/auth_session.dart`
- `apps/customer_mobile/lib/features/auth/presentation/customer_access_gate.dart`
- `apps/customer_mobile/lib/features/auth/presentation/screens/forgot_password_screen.dart`
- `apps/customer_mobile/lib/features/auth/presentation/screens/user_auth_screen.dart`
- `apps/customer_mobile/lib/features/auth/presentation/screens/user_auth_screen.dart.bak`
- `apps/customer_mobile/lib/features/auth/presentation/screens/user_home_screen.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/auth_error_message.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/auth_form_layout.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/auth_loading_indicator.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/auth_primary_button.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/faji_auth_text_field.dart`
- `apps/customer_mobile/lib/features/bookings/data/repositories/booking_repository.dart`
- `apps/customer_mobile/lib/features/bookings/presentation/screens/booking_reservation_screen.dart`
- `apps/customer_mobile/lib/features/home/data/models/home_business.dart`
- `apps/customer_mobile/lib/features/home/data/repositories/customer_profile_repository.dart`
- `apps/customer_mobile/lib/features/home/data/repositories/home_business_repository.dart`
- `apps/customer_mobile/lib/features/home/presentation/screens/temporary_home_destinations.dart`
- `apps/customer_mobile/lib/features/home/presentation/widgets/home_header.dart`
- `apps/customer_mobile/lib/features/plans/data/repositories/plan_repository.dart`
- `apps/customer_mobile/lib/features/plans/domain/services/plan_recommendation_service.dart`
- `apps/customer_mobile/lib/features/plans/presentation/screens/plan_results_screen.dart`
- `apps/customer_mobile/lib/features/wishlist/data/repositories/wishlist_repository.dart`
- `apps/customer_mobile/lib/main.dart`
- `apps/customer_mobile/macos/Flutter/GeneratedPluginRegistrant.swift`
- `apps/customer_mobile/pubspec.lock`
- `apps/customer_mobile/pubspec.yaml`
- `apps/customer_mobile/README.md`
- `apps/customer_mobile/test/auth/auth_components_test.dart`
- `apps/customer_mobile/test/auth/auth_controller_test.dart`
- `apps/customer_mobile/test/auth/customer_access_gate_test.dart`
- `apps/customer_mobile/test/auth/secure_session_store_test.dart`
- `apps/customer_mobile/test/firebase_removal_test.dart`
- `apps/customer_mobile/windows/flutter/generated_plugin_registrant.cc`
- `apps/customer_mobile/windows/flutter/generated_plugins.cmake`
- `apps/customer_web/next-env.d.ts`
- `docs/architecture/MONOREPO.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/engineering/M2_P2_CUSTOMER_AUTH_PROGRESS.md`
- `docs/engineering/M2_P2_FIREBASE_REMOVAL.md`
- `docs/migration/CUSTOMER_RUNTIME_AND_BACKEND.md`
- `docs/migration/IMPORT.md`
