> Historical evidence below is superseded for current development by [M2-P2 Firebase removal](../engineering/M2_P2_FIREBASE_REMOVAL.md). The product owner's 2026-10-26 instruction authorizes removal before customer APIs exist, using typed unavailable boundaries.

# Customer runtime acceptance and backend migration

Status recorded 2026-10-23: Flutter customer app builds locally. Full application migration and runtime acceptance remain outstanding.

## Verified cleanup

Branch: `feat/m1-d2-customer-analyzer-cleanup`.

- Flutter analysis: zero issues, exit 0.
- Flutter tests: one widget test passed, exit 0. The test now waits for splash and navigation animations with `pumpAndSettle` instead of checking after 1.2 seconds during the existing 3.5-second splash.
- Android debug APK: built successfully, exit 0; `apps/customer_mobile/build/app/outputs/flutter-apk/app-debug.apk` (approximately 174 MB).
- `git diff --check`: passed.
- Legacy results widget retained with a targeted unused-element suppression. Conditions and bodies of the two remaining brace corrections are preserved.
- Original import branch and `tooling/verify-legacy-flutter.sh` remain baseline migration evidence. Exact imported-tree equality is not the acceptance gate for deliberately corrected source.

The first Android build installed Gradle, the NDK, Build Tools 36 and Android Platform 34. Available root disk space after the build was 6.8 GB. No emulator was installed.

## Physical-device smoke test — partial; acceptance incomplete

Recorded 2026-10-23 against cleanup commit `1a4a497eb4b589605a44bc4a46767ba65372a474` on `feat/m1-d2-customer-analyzer-cleanup`.

- Device: `2505DRP06G`, Android 15 / API 35.
- Installed APK: `com.faji.app`, version `1.0.0`, 181,406,552 bytes.
- Installation and cold launch succeeded after USB installation was enabled on the phone. The startup log reported `FirebaseInitProvider: FirebaseApp initialization successful`; no fatal exception was found in the captured startup log window.
- Splash completed and role selection rendered. Business and Ride navigation opened branded placeholder screens; Android Back returned to role selection. These are not functional Business/Ride login flows.
- Customer sign-in and registration forms rendered. The email field focused and displayed the keyboard; the registration form scrolled to its lower fields and submit controls. No credentials were entered, and no account was created.
- Android Back closed the authentication sheet. Backgrounding and relaunching returned to the running app with its process intact.
- With Wi-Fi off and mobile data temporarily disabled, the unauthenticated sign-in sheet remained available. Mobile data was restored afterward (`mobile_data=1`).
- No authenticated session was used. Home, discovery/planning, wishlist, bookings, profile, authentication requests, and authenticated offline behavior remain untested. No booking or payment was attempted.

This is partial device evidence only. Do not mark full runtime acceptance complete from this smoke test, an APK build, or widget tests alone.

## Developer 2 backend migration starting point

Migration is blocked pending Developer 1's reviewed Keycloak and customer API contracts. The published backend contracts currently expose health only; `packages/api_contracts` and `packages/flutter_api_client` remain placeholders. Do not invent customer routes or schemas.

| Existing Firebase boundary | Migration work |
| --- | --- |
| `lib/main.dart` Firebase initialization | Introduce explicit application configuration and dependency composition as replacement services become available. |
| `features/auth/presentation/screens/user_auth_screen.dart` | Move authentication/profile persistence out of UI; integrate agreed Keycloak OIDC/session boundary, subject mapping and error handling. |
| `features/home/presentation/widgets/home_header.dart` | Consume a profile/session abstraction rather than direct Firebase reads. |
| `features/home/data/repositories/home_business_repository.dart` | First proposed read-only API slice: reviewed discovery DTOs, fixtures and repository adapter. Preserve UI and make mock/live behavior explicit. |
| `features/plans/data/repositories/plan_repository.dart` | Map approved plan contracts; distinguish empty results, transport failures and mock fixtures. |
| `features/wishlist/data/repositories/wishlist_repository.dart` | Replace user-scoped Firestore persistence after session and wishlist contracts are agreed. |
| `features/bookings/data/repositories/booking_repository.dart` and reservation screen | Replace Firebase UID access and persistence with server-authorized booking operations; review capacity, pricing, idempotency and payment state with Developer 1. |

Keep the verified cleanup and this device-test record on `feat/m1-d2-customer-analyzer-cleanup`. Do not remove Firebase or begin live customer API integration until the reviewed contracts are available. Once they are, start an isolated Developer 2 integration branch from the cleanup commit, begin with the read-only discovery repository boundary and fixture-driven tests, and connect only to approved contracts. Follow with identity, wishlist, plans and bookings as their contracts become available. Do not claim Firebase replacement from client scaffolding.

## Kotlin/Firebase warning investigation — outstanding migration work

The successful build warned that `firebase_auth` and `firebase_core` apply Kotlin Gradle Plugin and that future Flutter versions will reject this integration. It also reported deprecated SDK manager tooling, SDK XML version mismatch, and unchecked Java operations in Firestore.

During migration, inventory which Firebase features remain, check installed plugin changelogs and official Flutter migration guidance, and choose compatible plugin updates or removal once replacement services are verified. Validate any change separately with analysis, tests, APK compilation and physical-device startup/authentication. Record the selected versions and remaining warnings. Do not remove Firebase merely to silence warnings while live code still depends on it.
