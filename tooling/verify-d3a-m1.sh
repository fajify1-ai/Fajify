#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="$repo_root/apps/business_mobile"
run_android=false
run_ios=false
smoke_device=""
while (($#)); do
  case "$1" in
    --android) run_android=true; shift ;;
    --ios) run_ios=true; shift ;;
    --device)
      if (($# < 2)); then echo '--device requires a device ID' >&2; exit 2; fi
      smoke_device="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
command -v flutter >/dev/null || { echo 'Flutter must be on PATH.' >&2; exit 1; }
command -v dart >/dev/null || { echo 'Dart must be on PATH.' >&2; exit 1; }
export CI=true
export FLUTTER_SUPPRESS_ANALYTICS=true
cd "$repo_root"
git rev-parse HEAD
node tooling/check-workspace.mjs
git diff --check
cd "$app_dir"
flutter --version
flutter pub get
dart format --output=none --set-exit-if-changed lib test integration_test scripts
flutter analyze --no-pub
flutter test --no-pub --reporter expanded
flutter build web --no-pub --no-web-resources-cdn --dart-define-from-file=config/development.example.json
if "$run_android"; then flutter build apk --debug --no-pub --dart-define-from-file=config/development.example.json; fi
if "$run_ios"; then flutter build ios --simulator --no-pub --dart-define-from-file=config/development.example.json; fi
if [[ -n "$smoke_device" ]]; then
  flutter test integration_test/business_smoke_test.dart -d "$smoke_device" --dart-define-from-file=config/development.example.json
fi
printf 'PASS: all requested Developer 3A M1 checks completed.\n'
printf 'Android requested: %s; iOS requested: %s; device smoke requested: %s\n' "$run_android" "$run_ios" "${smoke_device:-no}"
printf 'Platform/device gates not requested here remain unverified.\n'
