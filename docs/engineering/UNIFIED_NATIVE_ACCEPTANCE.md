# Native acceptance for the preserved unified Flutter application

The application source and Android identity remain unchanged in this continuation. The single installable target is `apps/customer_mobile` (`faji_app`), which embeds `apps/business_mobile` (`faji_business`) through its path dependency. Do not install a second Business APK to stand in for testing the embedded experience. Admin remains separate; Ride must stay Coming Soon.

## Required environment

Use a Flutter-capable Linux/macOS/Windows workstation with a Flutter SDK whose bundled Dart satisfies **`^3.13.4`** in `apps/customer_mobile/pubspec.yaml`, and Flutter **>=3.35.0** for the embedded Business module. Verify the actual repository constraints rather than lowering them to fit an older SDK. Install the Android SDK/platform/build tools requested by the unchanged Gradle project, Java compatible with that Gradle version, an approved emulator or physical Android device, and sufficient space for Flutter, Gradle and Android caches (allow at least 20 GiB free for an emulator-based acceptance run). Keep the existing Gradle wrapper, package locks, `com.faji.app` application ID and signing configuration.

The supplied web execution environment has Java but no `flutter`, `dart`, `sdkmanager` or `adb`, and under 1 GiB free. Therefore none of the following native commands is represented as executed or passed here. Browser screenshots are not native evidence.

## Commands (from repository root)

```bash
flutter --version
flutter doctor -v
flutter devices

(cd packages/flutter_core && flutter pub get && flutter analyze && flutter test)
(cd apps/business_mobile && flutter pub get && flutter analyze && flutter test)
(cd apps/customer_mobile && flutter pub get && flutter analyze && flutter test)

(cd apps/customer_mobile && flutter build apk --debug \
  --dart-define=API_BASE_URL="$FAJI_NATIVE_TEST_API_URL" \
  --dart-define=FAJI_RECOVERY_URL="$FAJI_NATIVE_TEST_RECOVERY_URL")
```

Set the two URLs to approved private, disposable test services with a certificate trusted by the device. The API target must use Better Auth and a marked disposable PostgreSQL/PostGIS database. Do not use production identities, real funds, live messages or a global TLS bypass. Email/SMS workflows remain disabled when delivery is deferred; test those disabled states rather than enabling a live provider. A debug APK proves a development build only, not release signing or store acceptance.

Install the unified APK and test actual Android storage/session behavior:

```bash
adb install -r apps/customer_mobile/build/app/outputs/flutter-apk/app-debug.apk
adb shell pm list packages com.faji.app

(cd apps/customer_mobile && flutter test \
  integration_test/native_better_auth_acceptance_test.dart \
  -d "$FAJI_ANDROID_DEVICE_ID" \
  --dart-define=API_BASE_URL="$FAJI_NATIVE_TEST_API_URL" \
  --dart-define=FAJI_FIXTURE_SECRET="$FAJI_NATIVE_FIXTURE_SECRET")

(cd apps/business_mobile && flutter test \
  integration_test/native_better_auth_acceptance_test.dart \
  -d "$FAJI_ANDROID_DEVICE_ID" \
  --dart-define=API_BASE_URL="$FAJI_NATIVE_TEST_API_URL" \
  --dart-define=FAJI_FIXTURE_SECRET="$FAJI_NATIVE_FIXTURE_SECRET")
```

Also run the preserved embedded-entry UI test on the same device:

```bash
(cd apps/customer_mobile && flutter test integration_test/business_entry_test.dart \
  -d "$FAJI_ANDROID_DEVICE_ID" --dart-define=API_BASE_URL="$FAJI_NATIVE_TEST_API_URL")
```

That test exercises the existing demo entry and role navigation, so it is UI evidence only, not authentication or backend acceptance. Its existing expectations must be reconciled with native behavior in a Flutter-capable environment; it has not been executed here.

The authentication integration tests require the private acceptance fixture and reject ordinary staging/production targets. See `tests/auth/README.md` for fixture preflight. Running the Business integration harness separately does not replace testing Business embedded inside the unified Customer APK.

## Native visual and functional evidence

Record source commit, `flutter --version`, `flutter doctor -v`, device model/OS, physical dimensions, pixel ratio, text scale and orientation alongside raw command logs. Capture the original baseline and unified APK on the same device settings with the same disposable data. Cover every original native screen/state from the existing preservation matrix, including the approved role selector, Customer routes and the embedded eight-step Business flow. Never update baselines merely to accept a difference.

```bash
adb shell wm size
adb shell wm density
adb shell screencap -p /sdcard/faji-native-check.png
adb pull /sdcard/faji-native-check.png "$FAJI_NATIVE_EVIDENCE_DIR/"
```

Exercise registration/login/logout, background/resume, session restoration, embedded Business entry/exit, role changes, pending/rejected approval, scoped merchant operations and cross-account denial. Check optional authenticator MFA and authorized privileged-operation requirements using synthetic accounts. Verify that Ride has no activated booking/dispatch/driver routes and that Admin is not embedded. Repeat native layout checks at supported phone/tablet sizes, large text and reduced-motion settings. Keep runtime fixture secrets and credentials outside Git.

Acceptance requires clean analysis, all widget/integration tests, a successful Android build/install, original-to-unified native screenshots and manual device evidence. Missing tooling, failed tests or uncaptured screens remain explicit blockers. Do not change application ID, signing or deployment to clear a test.
