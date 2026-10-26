# FAJIFY M2-P2 PROGRESS REPORT — reconciliation, 2026-10-26

## Completed implementation tasks

Reconciled the migration checkout at `C:\Users\omola\Projects\Fajify-m2-p2`, branch `feat/m2-p2-customer-auth`, base `9894a3e48dd7b9882a3ba1a096e62fee62d4b64a`, with the clean component checkout at `C:\Users\omola\Projects\Fajify-m2-p2-components`, source commit `7565984ca0a876b851767f639bd960b433e0e620` (developerEBA).

Used reviewed patch reconciliation, not a blind cherry-pick over a dirty tree. Before editing, saved the binary tracked migration patch, component patch, all untracked nonignored files and initial status in `C:\Users\omola\AppData\Local\Temp\fajify-reconcile-53220378a17447c88d8749f636ac7a7d`. The original checkout and its uncommitted migration were never reset, stashed or overwritten from the component checkout. The component checkout remains unchanged and clean. No merge, rebase, push or remote publish was performed.

Most component code already existed byte-for-byte in the migration. Reviewed every component-commit path. Kept all shared widgets, validation, access-gate and recovery work. Restored shared AuthInput.email validation and removed the redundant inline login email check. Preserved the migration's browser sign-in/registration dispatch and intentional deletion of its obsolete provider implementation. Brought over the missing component report and retained its source provenance, with current delivery instructions overriding historical push authorization.

The login/registration source from its first build method onward matches the component checkout exactly after line-ending normalization. Component widgets, recovery form, shared validators and visual tests are byte-identical to commit 7565984. No typography, color, layout or visual-variant changes were made during reconciliation. Dart formatting also normalized existing customer screen sources; these are formatting-only changes outside the migration features.

## Current task and independent authentication continuation

Implemented an AuthController callback handoff through BrowserOidcAuthorization. The SDK adapter must verify the complete authorization transaction, state, nonce, S256 PKCE, signed tokens and approved identity policy; a callback URI alone never grants access. Pending production composition remains unavailable. No callbacks, issuer, client, role mapping, HTTP endpoint or backend response schema were invented or enabled.

Callback operations reuse the controller's generation, expiry, verification and customer-access checks. Tests cover signed-out races, disposal, duplicate concurrent dispatch, unsupported repositories, expired/unverified/unauthorized results and generic SDK error redaction. This does not replace SDK replay protection or token verification.

SecureSessionStore operations now run in invocation order on one PlatformSecureSessionStore instance. A logout clear waits for earlier native writes and removes their result. Failures propagate to the caller without blocking later cleanup. Tests cover an in-flight write/clear race and cleanup after write failure. The future SDK lifecycle must share one store instance and cancel stale provider work before enqueueing new writes after logout. No plaintext fallback exists. Native keystore/keychain behavior remains unverified; the adapter is not yet composed into live OIDC.

## Reusable components created or reused

Reused AuthFormLayout, AuthInput, AuthPrimaryButton (sheet and recovery appearances), FajiAuthTextField, AuthLoadingIndicator, AuthErrorMessage/showAuthMessage, AuthScope, CustomerAccessGate, FajiTheme and FajiColors. Reused typed repositories and shared ServiceUnavailable/ServiceUnavailableView; the view now derives its message from ServiceUnavailable. Added no duplicate auth form or provider-specific UI.

## Firebase migration status

No active Firebase package dependencies, imports, initialization, Firestore repositories, UID mapping or Google Services build plugins remain in the approved customer app scope. Generated registrants and Flutter lockfile reflect removal. Other apps/packages/infrastructure contain no active SDK references in the repository scan. Missing discovery/profile/plan/wishlist/booking APIs remain typed and explicitly unavailable; local mutations cannot fabricate persistence or booking confirmation.

User confirmed on 2026-10-26 that ownership/deletion approval for `apps/customer_mobile/android/app/google-services.json` is unknown and directed that the file remain disconnected and undeleted. Its Google Services plugin is removed, and it has no consuming runtime SDK. No external Firebase data, projects, credentials or historical Git records were changed. Full configuration cleanup awaits owner approval; this does not block independent development or local commits.

## Verification

- PASS: `dart format --output=none --set-exit-if-changed lib test` — 77 files, zero changes required after formatting.
- PASS: `flutter analyze --no-pub` — zero issues.
- PASS: full `flutter test --no-pub` — 48 tests, including nine callback lifecycle tests and five secure-storage tests.
- PASS: the three visual pixel comparisons (recovery field, recovery button, sheet button) included in the full suite. Shared form composition and accessibility tests also pass. This is component visual evidence, not native screenshot acceptance.
- PASS: byte comparison of shared component paths to commit 7565984; normalized full login/registration layout source equality from its build method onward.
- PASS: customer Next.js `tsc --noEmit`; 16 authentication tests; `next build` production build. Used installed binaries directly, preserving the pinned workspace lockfile.
- PASS: Git diff whitespace checks and manifest/lockfile/runtime scans for obsolete Firebase dependencies/imports/initialization/plugins. Only the disconnected owner-pending client configuration remains, apart from historical documents and migration artifact names.
- BLOCKED: `flutter build apk --debug --no-pub` — no Android SDK found. No Android device, native storage, iOS/macOS build or real identity/API verification is claimed. Previous Windows symlink limitation still requires platform tooling setup; no new dependency resolution was needed for this reconciliation.
- PASS: follow-up after shared unavailable-message reuse — final analyzer zero issues and all six affected migration-screen tests passed.

The component checkout remains clean at its original commit. Full migration acceptance is incomplete until native and live backend integrations are verified.

## Outstanding backend dependencies and untested functionality

- Approved Keycloak clients, issuer, exact redirects/logout callbacks, scopes, account policy and immutable-subject mapping; maintained native/server SDK adapters with real transaction verification and refresh/revocation.
- Durable server-managed web session and transaction stores; approved live route composition. Existing server auth primitives are verified, not enabled production authentication.
- Published NestJS profile/discovery/plans/wishlist/bookings/payment contracts. The current OpenAPI exposes health endpoints; no speculative domain endpoints were added.
- Android SDK and native device acceptance; Windows plugin symlink support; iOS signing/keychain setup and native storage/backup checks. Native login, registration, recovery, refresh, logout/revocation, real customer persistence, payments and device screenshots remain untested.
- Confirm config ownership and obtain approval before deleting the retained JSON file.

## Local commit and manual delivery

The final reconciliation commit is created after the checks below; obtain its exact hash with `git rev-parse HEAD`. The user-facing delivery report records that hash. No push is performed.

```powershell
Set-Location 'C:\Users\omola\Projects\Fajify-m2-p2'
git branch --show-current
git status --short
git log -1 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
```

## Next task

Implement the native OIDC SDK/lifecycle adapter once the identity owner provides reviewed configuration and policy, and perform physical-device startup and secure-storage acceptance after installing/configuring the Android SDK. Keep missing integrations unavailable until verified. Retained configuration ownership review can proceed independently.
## Reviewed changed files

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
- `apps/customer_mobile/lib/features/bookings/presentation/screens/add_payment_card_screen.dart`
- `apps/customer_mobile/lib/features/bookings/presentation/screens/booking_reservation_screen.dart`
- `apps/customer_mobile/lib/features/bookings/presentation/screens/booking_ticket_screen.dart`
- `apps/customer_mobile/lib/features/bookings/presentation/screens/booking_time_placeholder_screen.dart`
- `apps/customer_mobile/lib/features/bookings/presentation/widgets/booking_date_sheet.dart`
- `apps/customer_mobile/lib/features/home/data/models/home_business.dart`
- `apps/customer_mobile/lib/features/home/data/repositories/customer_profile_repository.dart`
- `apps/customer_mobile/lib/features/home/data/repositories/home_business_repository.dart`
- `apps/customer_mobile/lib/features/home/presentation/screens/temporary_home_destinations.dart`
- `apps/customer_mobile/lib/features/home/presentation/widgets/floating_home_nav.dart`
- `apps/customer_mobile/lib/features/home/presentation/widgets/home_header.dart`
- `apps/customer_mobile/lib/features/onboarding/presentation/screens/splash_screen.dart`
- `apps/customer_mobile/lib/features/plans/data/repositories/plan_repository.dart`
- `apps/customer_mobile/lib/features/plans/domain/services/plan_recommendation_service.dart`
- `apps/customer_mobile/lib/features/plans/presentation/screens/plan_booking_screen.dart`
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
- `apps/customer_mobile/test/auth/oidc_callback_controller_test.dart`
- `apps/customer_mobile/test/auth/secure_session_store_test.dart`
- `apps/customer_mobile/test/firebase_removal_test.dart`
- `apps/customer_mobile/windows/flutter/generated_plugin_registrant.cc`
- `apps/customer_mobile/windows/flutter/generated_plugins.cmake`
- `apps/customer_web/next-env.d.ts`
- `docs/architecture/MONOREPO.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/engineering/M2_P2_CUSTOMER_AUTH_PROGRESS.md`
- `docs/engineering/M2_P2_FIREBASE_REMOVAL.md`
- `docs/engineering/M2_P2_RECONCILIATION.md`
- `docs/engineering/M2_P2_REUSABLE_COMPONENTS.md`
- `docs/migration/CUSTOMER_RUNTIME_AND_BACKEND.md`
- `docs/migration/IMPORT.md`
