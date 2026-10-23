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

## Physical-device smoke test — pending

ADB reported no connected devices. Do not mark runtime acceptance complete from a build or widget test alone.

When an authorized physical device is connected, record device/Android version, APK version, and actual results for:

1. Install the debug APK and cold-launch it; check startup logs for Firebase initialization failures and crashes.
2. Observe splash completion and role selection; open Business and Ride login screens and return using Android back navigation.
3. Open customer authentication and check form rendering and keyboard behavior. Use a designated test account for authenticated checks.
4. With that account, navigate home, discovery/planning, wishlist, bookings and profile; verify back navigation and background/resume behavior.
5. Record unavailable flows and failures explicitly. Do not create paid orders or treat prototype payment/booking screens as settlement evidence.

## Developer 2 backend migration starting point

The local NestJS implementation currently exposes health only. `packages/api_contracts` and `packages/flutter_api_client` are placeholders. Customer endpoint paths and schemas must come from Developer 1's reviewed contracts before live integration.

| Existing Firebase boundary | Migration work |
| --- | --- |
| `lib/main.dart` Firebase initialization | Introduce explicit application configuration and dependency composition as replacement services become available. |
| `features/auth/presentation/screens/user_auth_screen.dart` | Move authentication/profile persistence out of UI; integrate agreed Keycloak OIDC/session boundary, subject mapping and error handling. |
| `features/home/presentation/widgets/home_header.dart` | Consume a profile/session abstraction rather than direct Firebase reads. |
| `features/home/data/repositories/home_business_repository.dart` | First proposed read-only API slice: reviewed discovery DTOs, fixtures and repository adapter. Preserve UI and make mock/live behavior explicit. |
| `features/plans/data/repositories/plan_repository.dart` | Map approved plan contracts; distinguish empty results, transport failures and mock fixtures. |
| `features/wishlist/data/repositories/wishlist_repository.dart` | Replace user-scoped Firestore persistence after session and wishlist contracts are agreed. |
| `features/bookings/data/repositories/booking_repository.dart` and reservation screen | Replace Firebase UID access and persistence with server-authorized booking operations; review capacity, pricing, idempotency and payment state with Developer 1. |

After the smoke test, start an isolated Developer 2 integration branch from the reviewed cleanup commit. Begin with the read-only discovery repository boundary and fixture-driven tests, then connect the published API contract. Follow with identity, wishlist, plans and bookings as their contracts become available. Do not invent backend routes or claim Firebase replacement from client scaffolding.

## Kotlin/Firebase warning investigation — outstanding migration work

The successful build warned that `firebase_auth` and `firebase_core` apply Kotlin Gradle Plugin and that future Flutter versions will reject this integration. It also reported deprecated SDK manager tooling, SDK XML version mismatch, and unchecked Java operations in Firestore.

During migration, inventory which Firebase features remain, check installed plugin changelogs and official Flutter migration guidance, and choose compatible plugin updates or removal once replacement services are verified. Validate any change separately with analysis, tests, APK compilation and physical-device startup/authentication. Record the selected versions and remaining warnings. Do not remove Firebase merely to silence warnings while live code still depends on it.
