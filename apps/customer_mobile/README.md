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

See [current integration report](../../docs/engineering/M2_P2_SYNC_AND_IDENTITY.md). Live identity and customer data integrations remain explicitly unavailable; repository fallbacks do not fabricate live customer data. Native secure session storage is implemented but not enabled for live authentication.

`CustomerIdentityClient` consumes the merged Phase 1 `GET /api/v1/auth/me`
contract (`subject`, `roles`) through native HTTPS. Its future OIDC adapter
caller must supply a reviewed API origin, the verified provider subject and
access token. It performs a fresh active-account check, rejects redirected,
unauthorized, mismatched or malformed results, and requires the customer role.
The returned identity has no display name or photo fields. Profile UI remains
unavailable until a display-profile contract exists. Browser bearer transport
is unsupported; the customer website uses its separate server-only boundary.
This client is tested in isolation, not connected to live OIDC composition.
