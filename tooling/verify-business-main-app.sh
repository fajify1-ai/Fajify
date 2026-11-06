#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
android=false
device=""
while (($#)); do
  case "$1" in
    --android) android=true; shift ;;
    --device)
      (($# >= 2)) || { echo '--device needs a device ID' >&2; exit 2; }
      device="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
command -v flutter >/dev/null || { echo 'Flutter must be on PATH.' >&2; exit 1; }
command -v dart >/dev/null || { echo 'Dart must be on PATH.' >&2; exit 1; }
export CI=true FLUTTER_SUPPRESS_ANALYTICS=true
cd "$repo_root"
git rev-parse HEAD
git diff --check
cd apps/business_mobile
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze --no-pub
flutter test --no-pub --reporter expanded
cd ../customer_mobile
flutter pub get
dart format --output=none --set-exit-if-changed lib/features/auth/presentation/screens/business_login_screen.dart test integration_test
flutter analyze --no-pub
flutter test --no-pub --reporter expanded
if [[ -n "$device" ]]; then
  flutter test integration_test/business_entry_test.dart -d "$device" --no-pub
fi
if "$android"; then
  # Restore the normal app after the device test replaces it with a test runner.
  flutter build apk --debug --no-pub
  sha256sum build/app/outputs/flutter-apk/app-debug.apk
  if [[ -n "$device" ]]; then
    command -v adb >/dev/null || { echo 'ADB must be on PATH.' >&2; exit 1; }
    flutter install --debug -d "$device"
    adb -s "$device" shell am start -W -n com.faji.app/.MainActivity
  fi
fi
printf 'PASS: all requested Business/main-app checks completed.\n'
printf 'Android build requested: %s; device test requested: %s\n' "$android" "${device:-no}"
printf 'Unrequested physical-device checks remain unverified.\n'
