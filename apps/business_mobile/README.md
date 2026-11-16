# Faji Business Mobile

Flutter is native Android/iOS only. Better Auth is the sole provider; registration, login, password recovery, optional MFA and phone verification run inside the app. No external browser or hosted identity service is required.

```sh
flutter pub get
flutter run --dart-define=API_BASE_URL=https://YOUR-PRIVATE-API \
  --dart-define=FAJI_RECOVERY_URL=https://YOUR-TRUSTED-WEB/reset-password
flutter analyze --no-fatal-infos
flutter test
```

Only public endpoints belong in build defines. Keep SMTP/SMS/database credentials on the backend. Opaque session tokens use platform secure storage. Business approval, memberships, scopes and suspended accounts are checked by NestJS; client navigation never grants access. MFA remains optional; privileged operations require recent server-verified proof.

Mocks/sample business data are development fixtures, not another authentication provider. Native device acceptance is documented in [tests/auth](../../tests/auth/README.md) and must be executed on an approved device before a mobile release. See [current implementation](../../docs/engineering/BETTER_AUTH_IMPLEMENTATION.md), [merge report](../../docs/engineering/BETTER_AUTH_MERGE_READINESS.md) and the existing product/domain documentation for business features.
