# M2 · Phase 3 — Faji Business Authentication

## Status

Implementation is present on the feature worktree but is **not fully accepted**.
Live Keycloak/API, device authentication, and merchant-resource membership checks
remain blocked by external integration requirements listed below.

## Scope and implementation

Changes are limited to `apps/business_mobile/`. The Business app now includes
Keycloak Authorization Code + PKCE through the system browser, secure token
storage and refresh, `/api/v1/auth/me` session validation, route revalidation,
current-session revocation, Keycloak logout, and identity registration/recovery
handoffs. Sample merchant workflows remain local fixtures and are not treated as
live business records. No Phase 1 or Phase 2 implementation was changed.

## Verification

- Updated from `origin/main` by fast-forwarding the existing
  `features/business-auth` branch to base commit `fc7be475933250bcafcb8ac58c7a81adb34669b3`.
- `flutter pub get` — passed; Flutter dependencies resolved.
- `flutter analyze` — passed with no issues.
- `flutter test --reporter expanded` — passed (42 tests).
- `flutter devices` — Windows and browser targets only; no Android device or
  emulator is connected.
- `flutter build apk --debug --dart-define-from-file=config/development.example.json`
  — passed; APK created at
  `apps/business_mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- Android merged manifest includes AppAuth's redirect receiver with the
  registered `com.faji.business` scheme.
- No live Keycloak realm/API configuration was available for sign-in, recovery,
  refresh, revocation, or authorization integration tests.

## Acceptance blockers

1. The current Phase 1 `GET /api/v1/auth/me` contract returns only `subject` and
   `roles`; it does not return merchant membership/resource IDs. A role is not
   proof of membership in an approved business workspace. The app therefore
   keeps business workflows sample-only and cannot claim membership-scoped
   workspace acceptance without a Phase 1 contract.
2. No configured Keycloak/API environment or Android device was available to
   verify live OIDC callbacks, email registration/recovery, session expiry,
   revocation, suspended access, or cross-merchant isolation.
3. iOS device/build verification requires macOS and Xcode.

The feature branch was not merged to `main`.
