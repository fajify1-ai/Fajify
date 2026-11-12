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
cd apps/business_mobile
flutter pub get
flutter devices
flutter run -d <device-id> --dart-define-from-file=config/development.json
```

For Chrome use `-d chrome`. The Flutter browser build uses hash routes, for example
`/#/reservations`. Direct protected links return to login first and restore a
validated local destination after explicit sample login. The development
configuration enables `MockBusinessRepository` and `MockIdentityService` for
offline sample mode. A browser refresh starts a fresh signed-out session;
sample state is intentionally in memory. No PostgreSQL, Redis, Keycloak or
Docker service is needed for sample mode.

For Android/iOS identity integration, create an ignored
`config/development.local.json` and set `USE_MOCK_SERVICES` to
`false`, `OIDC_ISSUER` to the realm issuer (for example
`https://identity.example.test/realms/faji`) and `API_BASE_URL` to the API origin.
The public client ID defaults to `faji-business-mobile`; the redirect defaults
to `com.faji.business:/oauth/callback` and must match the Keycloak client and
platform registration. Then run with
`--dart-define-from-file=config/development.local.json`. These settings are
public endpoints/identifiers, not credentials; never add a client secret or
password to the app or build defines. Keycloak handles sign-in, identity
registration and password recovery in its system-browser page. Identity
registration does not apply for, approve, or grant access to a merchant account.

`dev.faji.faji_business` is the **provisional development identifier** for Android
and iOS. It is not an approved store identifier. Runners were generated using
Flutter 3.47.7 with Android/iOS/web selected. Launch assets and original geometric
B icons are included; regenerate the development icons using
`python3 scripts/generate_development_icons.py` with Pillow installed. Final brand
artwork and distribution identifiers need product-owner confirmation.

## Demo walkthrough

1. Open the introduction, then login; in sample mode choose **Enter sample merchant session**.
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
Sample business workflows do not call live merchant or payment APIs. Live
identity mode uses Keycloak and the Faji session endpoint only; it does not make
the sample records authoritative. No camera permissions or durable business
writes are implemented. Logout and reset restore fixtures. In embedded mode,
customer switching clears the merchant demo session and returns
to the main role-selection screen. The standalone runner retains an explanatory
handoff. See [main-app integration](../../docs/engineering/BUSINESS_MAIN_APP_INTEGRATION.md).

## Configuration

`config/development.json` enables the offline sample services. An unconfigured
live build fails closed. An optional
`config/development.local.json` is ignored. Build definitions are visible in the
compiled app and must never contain credentials.

| Define | Setting |
| --- | --- |
| `APP_ENV` | `development` |
| `USE_MOCK_SERVICES` | `true` for offline sample mode; `false` for Keycloak |
| `OIDC_ISSUER` | Keycloak realm issuer; required when mocks are disabled |
| `OIDC_CLIENT_ID` | Public Keycloak client; defaults to `faji-business-mobile` |
| `OIDC_REDIRECT_URI` | Registered callback; defaults to `com.faji.business:/oauth/callback` |
| `API_BASE_URL` | API origin; required to validate `/api/v1/auth/me` |

Live configuration requires HTTPS endpoints (HTTP is allowed only for localhost)
and fails closed when required identity settings are absent. Access, refresh and
ID tokens use platform secure storage. New and restored sessions are validated
through `/api/v1/auth/me`. The response must include an approved business
membership with an `owner`, `manager` or `staff` role; a realm-level `merchant`
role alone does not grant workspace access. Access is revalidated by the API,
and an API `401` clears the local session.

## Live Business operations (M3-P3)

With live configuration, the app uses the authenticated Business API for
branches and branch selection, the catalogue (products, services, packages and
events), availability slots, reservations and their permitted status changes,
orders and their server-validated lifecycle, branch hours, event configuration,
package components, owner-managed staff grants, and operational overview
counts. The live dashboard's fulfilled-order total is explicitly not payment
settlement or withdrawable revenue. Customer identities are not displayed in
the list UI.

Branch operations are available from the dashboard. Business owners can
configure staff grants from branch operations; identities must already exist,
and the server verifies scope and role on every call. Managers can manage
branches and operational configuration but cannot grant staff access. Staff
actions remain restricted to server-authorized branch scopes. Branch hours use
the server contract's weekday numbering (Sunday `0` through Saturday `6`) and
minutes from midnight in the branch timezone.

Sample mode remains deterministic and local. Earnings, profile/setup previews,
QR scan previews and synthetic metrics are not live financial, identity,
admission or fulfillment operations; QR routes explain that live verification
is not available instead of simulating success. The client never connects
directly to PostgreSQL and does not replace server-side authorization or
business validation. Event/package writes and live authentication require a
configured API and identity provider. Physical Android acceptance still
requires the configured realm, API and a device; this README does not claim
that live-device acceptance has run.

## Code boundaries

- `lib/faji_business.dart`: public host-app entry point.
- `lib/app/`: router, embedded host mode, guarded merchant shell and responsive navigation.
- `lib/core/`: configuration, UI models, session/data controller, repository and
  identity interfaces, deterministic mocks.
- `lib/features/`: dashboard, reservations, orders, catalogue, branch operations,
  staff management and account UI.
- `lib/shared/business_ui.dart`: Business-local component adapter pending D2's
  reviewed shared Flutter exports. The main customer app now consumes the public Business entry point under the
  product-owner-approved integration; Business does not import customer internals.
- `assets/fonts/`: bundled Roboto Regular/Medium/Bold plus its license, providing
  consistent offline typography. Material icon assets come from Flutter.
- `test/`: controller and widget behavior, including races, guards, write failures,
  context isolation, forms, responsive widths and enlarged system text.
- `integration_test/`: opt-in device/browser walkthrough.
- `scripts/render_review_test.dart`: opt-in labelled visual review renders.

`KeycloakIdentityService` implements Authorization Code + PKCE using the system
browser, secure token storage, token refresh, `/api/v1/auth/me` membership
validation, current-session revocation and Keycloak logout. `BusinessApiClient`
adds the current bearer token to each versioned API request and parses server
responses into UI models. `MockBusinessRepository` remains the explicit sample
mode adapter; live screens use the Business API repository.

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
