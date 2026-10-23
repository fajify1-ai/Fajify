# Faji Business — Developer 3A, Milestone 1

A runnable Flutter merchant scaffold with five workspaces: **Home, Reservations,
Orders, Menu and Services**. It includes onboarding/login, setup, earnings,
profile, notifications, contextual QR previews and development scenarios.

## Requirements and setup

Verified with **Flutter 3.47.7 / Dart 3.13.5**. The application declares Flutter
>=3.35 / Dart >=3.9; earlier compatible SDKs have not been acceptance-tested.
Dependencies are locked in `pubspec.lock`. Install Android SDK/JDK for Android,
and macOS/Xcode for iOS. Use a device/emulator or Chrome for the interactive demo.

```bash
git fetch origin
git switch feat/m1-d3a-business-foundation
cd apps/business_mobile
flutter pub get
flutter devices
flutter run -d <device-id> --dart-define-from-file=config/development.example.json
```

For Chrome use `-d chrome`. The Flutter browser build uses hash routes, for example
`/#/reservations`. Direct protected links return to login first and restore a
validated local destination after the explicit demo login. A browser refresh
starts a fresh signed-out session; sample state is intentionally in memory.
No PostgreSQL, Redis, Keycloak or Docker service is needed for this M1 demo.

`dev.faji.faji_business` is the **provisional development identifier** for Android
and iOS. It is not an approved store identifier. Runners were generated using
Flutter 3.47.7 with Android/iOS/web selected. Launch assets and original geometric
B icons are included; regenerate the development icons using
`python3 scripts/generate_development_icons.py` with Pillow installed. Final brand
artwork and distribution identifiers need product-owner confirmation.

## Demo walkthrough

1. Open the introduction, then login; choose **Enter demo merchant session**.
2. Home shows synthetic revenue, table capacity, linked task counts, quick actions,
   a weekly revenue chart and upcoming bookings.
3. Reservations supports calendar month/day selection, all/pending bookings,
   guest capacity and detail pages. The sample clock is Sunday 30 August 2026.
4. Orders supports Active/New/Preparing/Ready/Completed filters. Accept → Mark
   Ready → Complete changes local state, updating counts and dashboard summaries.
5. Menu starts with six items. Add/edit an item, enter an exact NGN price and
   toggle availability. Category icons provide a reliable offline image fallback.
6. Services starts with eight capability cards, four active. Confirm/cancel local
   activation previews and check the derived active count. All cards and account
   actions are reachable by scrolling.
7. **View balance** / **Withdraw** open sample earnings. Settings opens profile
   and business setup. The bell opens sample notifications.
8. Reservation and order scan screens have separate contexts. Try `booking-1`
   for guest check-in or `order-1` for recipient verification. `INVALID`, `USED`
   and `FAIL` demonstrate failure cases. Repeating a valid code reports used.
9. Use **Demo controls** for populated/empty/error data, next-write failure, reset
   and logout. The business-name dropdown switches independent synthetic contexts.
10. Log out and verify private data is cleared. Login also includes a wrong-role
    demo to check the access-denied route.

All financial amounts, approvals, scans and service activations are previews.
There are no live merchant/auth/payment calls, camera permissions or durable
business writes. Logout and reset restore fixtures. Customer-app switching opens
an explanatory handoff until D2 publishes an approved app/web destination.

## Configuration

The committed `config/development.example.json` contains public build settings.
The default build also uses development mocks. An optional
`config/development.local.json` is ignored. Build definitions are visible in the
compiled app and must never contain credentials.

| Define | M1 setting |
| --- | --- |
| `APP_ENV` | `development` |
| `USE_MOCK_SERVICES` | `true` |

Other environments or `USE_MOCK_SERVICES=false` display a configuration error;
they cannot silently open a demo session. API URLs, issuer/client IDs and redirect
URIs will be added only with agreed M2 adapters. Client secrets do not belong here.

## Code boundaries

- `lib/app/`: router, guarded merchant shell, responsive rail/bottom navigation.
- `lib/core/`: configuration, UI models, session/data controller, repository and
  identity interfaces, deterministic mocks.
- `lib/features/`: dashboard, reservations, orders, menu, service and account UI.
- `lib/shared/business_ui.dart`: Business-local component adapter pending D2's
  reviewed shared Flutter exports. No imports from another application.
- `assets/fonts/`: bundled Roboto Regular/Medium/Bold plus its license, providing
  consistent offline typography. Material icon assets come from Flutter.
- `test/`: controller and widget behavior, including races, guards, write failures,
  context isolation, forms, responsive widths and enlarged system text.
- `integration_test/`: opt-in device/browser walkthrough.
- `scripts/render_review_test.dart`: opt-in labelled visual review renders.

Future API adapters implement `BusinessRepository`; future Keycloak integration
implements `IdentityService` and extends session handling for real OIDC lifecycle.
The UI model classes are fixture models, not published backend contracts. Use
Authorization Code + PKCE and immutable Keycloak `sub` in M2; backend role,
resource-membership checks and approved DTO mappings come from D1. The client
never connects directly to PostgreSQL.

## Verification

From the repository root:

```bash
bash tooling/verify-d3a-m1.sh
# On a machine with the Android toolchain:
bash tooling/verify-d3a-m1.sh --android
# On macOS/Xcode:
bash tooling/verify-d3a-m1.sh --ios
# Add an interactive integration target when available:
bash tooling/verify-d3a-m1.sh --device <device-id>
```

The default script runs dependency resolution, format checks, analysis, all
controller/widget tests, the web build, workspace structure and whitespace checks.
Optional requested gates fail rather than being silently skipped. Web integration
may require a configured browser driver; the device smoke file is also usable on
Android/iOS. See [acceptance evidence](../../docs/engineering/DEVELOPER_3A_M1_ACCEPTANCE.md)
for what has actually run and the remaining platform/browser gates.

Generate visual review PNGs separately with
`flutter test scripts/render_review_test.dart`. These renders are checked in under
`docs/design/business-m1/implementation/` and labelled as widget renders.

## Troubleshooting

- Run commands inside this app; the imported customer workspace has its own
  dependencies and SDK requirements.
- If the app reports configuration errors, use the committed development example.
- An Android SDK, accepted SDK licenses and a compatible JDK are needed for APK
  builds; `flutter doctor -v` identifies missing prerequisites.
- iOS cannot be built or signed from Linux.
- Error data intentionally fails until Retry sample data or a populated scenario
  is selected. A failed write leaves displayed data unchanged and can be retried.
- In container-based automated verification, `CI=true` skips Flutter's cloud
  metadata environment probe. `FLUTTER_SUPPRESS_ANALYTICS=true` disables analytics.
  Some restricted filesystems need `TAR_OPTIONS=--no-same-owner` during SDK setup.

[Execution guide](../../docs/engineering/DEVELOPER_3A_M1_BUSINESS_GUIDE.md) ·
[Original screenshot index](../../docs/design/business-m1/README.md)
