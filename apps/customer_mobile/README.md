# faji_app

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## M2-P2 integration status

See [current OIDC adapter report](../../docs/engineering/M2_P2_OIDC_ADAPTERS.md).
Native AppAuth, secure storage, refresh/restoration and logout are connected
through environment-gated composition. Live authentication is disabled by
default until approved deployment settings and platform acceptance are supplied.
Customer data fallbacks do not fabricate live data.

`CustomerIdentityClient` consumes the merged Phase 1 `GET /api/v1/auth/me`
contract (`subject`, `roles`) through native HTTPS. Its native OIDC adapter
caller must supply a reviewed API origin, the verified provider subject and
access token. It performs a fresh active-account check, rejects redirected,
unauthorized, mismatched or malformed results, and requires the customer role.
The returned identity has no display name or photo fields. Profile UI remains
unavailable until a display-profile contract exists. Browser bearer transport
is unsupported; the customer website uses its separate server-only boundary.
Copy `oidc-config.example.json` to ignored `oidc-config.local.json`, supply only
reviewed public settings, and use `flutter run --dart-define-from-file=oidc-config.local.json`.
Do not put secrets in native build settings. Keep the enable flag false until
the deployment is approved. Native browser/device acceptance remains pending.

Registration, email-verification retry and provider-guided recovery now share the verified browser-session pipeline and AuthStatusView. See [current journey report](../../docs/engineering/M2_P2_ACCOUNT_JOURNEYS.md) for behavior, evidence and all eight acceptance statuses. Live settings remain pending.
