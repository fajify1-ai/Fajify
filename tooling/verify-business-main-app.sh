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
if "$android"; then flutter build apk --debug --no-pub; fi
if [[ -n "$device" ]]; then
  flutter test integration_test/business_entry_test.dart -d "$device" --no-pub
fi
printf 'PASS: all requested Business/main-app checks completed.\n'
printf 'Android build requested: %s; device test requested: %s\n' "$android" "${device:-no}"
printf 'Unrequested physical-device checks remain unverified.\n'
