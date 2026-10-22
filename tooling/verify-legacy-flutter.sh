#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
EXPECTED="f4fc4ad64ede410a2f61ce281905a9a895285407"
PIN="b96cc1f294095627b8d2047647505de881fa2e4e"
[[ -z "$(git status --porcelain)" ]] || { echo "FAIL: worktree is dirty" >&2; exit 1; }
ACTUAL="$(git rev-parse 'HEAD:apps/customer_mobile')"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "FAIL: customer Flutter tree mismatch (found $ACTUAL)" >&2; exit 1; }
COUNT="$(git ls-tree -r --name-only 'HEAD:apps/customer_mobile' | wc -l | tr -d ' ')"
[[ "$COUNT" == 287 ]] || { echo "FAIL: expected 287 files, found $COUNT" >&2; exit 1; }
printf 'PASS: exact imported Flutter tree %s; %s tracked files.\n' "$ACTUAL" "$COUNT"
if git cat-file -e "$PIN^{commit}" 2>/dev/null; then
  echo "Upstream original commit exists locally."
else
  echo "NOTE: original upstream commit object is not included in this repository; provenance is documented."
fi
if ! command -v flutter >/dev/null 2>&1; then
  echo "SKIP: Flutter SDK unavailable. App analysis, tests and build NOT VERIFIED."
  if [[ "${FAJIFY_REQUIRE_FLUTTER_CHECKS:-0}" == "1" ]]; then exit 2; fi
  exit 0
fi
cd apps/customer_mobile
flutter --version
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
echo 'PASS: Flutter customer dependency, analysis, tests and debug Android build checks.'
