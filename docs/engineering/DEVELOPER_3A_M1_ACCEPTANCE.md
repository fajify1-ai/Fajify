# Developer 3A — M1 implementation and verification

**Status:** Business scaffold implemented; platform/browser acceptance remains open.
**Branch:** `feat/m1-d3a-business-foundation`.

## Delivered behavior

The independent Business application now has the five screenshot-defined tabs,
merchant navigation guards, labelled demo login and wrong-role paths, calendar and
reservation details, local order lifecycle previews, menu forms/availability,
eight capability cards, sample earnings, business setup/profile, notifications
and separate guest/order scan previews. Mock data is isolated by business context;
logout clears session data and rejects stale in-flight completions. Empty, loading,
error/retry and failed-write cases are demonstrable from Demo controls.

Android/iOS/web runners, public configuration, offline fonts, original development
icons, launch assets, tests, setup documentation and a consolidated verification
script are included. No shared package, customer source or backend implementation
is changed by this work.

## Verification evidence

The exact source revision and commands are recorded in
[evidence/d3a-m1-consolidated.txt](evidence/d3a-m1-consolidated.txt).

| Check | Result |
| --- | --- |
| Flutter/Dart dependency resolution | Passed on Flutter 3.47.7 / Dart 3.13.5; committed lockfile |
| Dart formatting and Flutter analysis | Passed; no analyzer issues |
| Controller and widget tests | 36 passed, no skipped tests |
| Responsive layout | Widget checks at 375, 768, 1024 and 1440 logical pixels; 1.8× system text check passed |
| Flutter web compilation | Passed with local web renderer resources |
| Workspace structure and whitespace | Passed |
| Basic credential-pattern/diff review | No private keys or credential assignments found in the staged changes; not a comprehensive security audit |
| Visual review | 16 Flutter widget renders captured at 390/1440, including lower Dashboard/Services positions; manually inspected representative compact and wide screens |
| Android debug APK | **Blocked**: Gradle Kotlin dependency downloads returned HTTP 403; no APK pass is claimed |
| iOS simulator/device build | **Not run**: Linux environment has no macOS/Xcode |
| Browser interaction / real-device smoke | **Not passed**: local Chrome exited with SIGSEGV before page load; integration smoke file is prepared but no device/browser acceptance is claimed |

The web compiler emits a nonfatal Cupertino font-family lookup warning from the
framework. Application screens use Material icons, whose render assets were
inspected successfully. No Cupertino UI is implemented in this scaffold.

## Android attempt

Android command-line tools, platform 36, build tools 36.0.0 and platform tools
were installed in the verification workspace. `flutter build apk --debug --no-pub`
reached `assembleDebug`, then failed resolving Kotlin 2.2.21 compiler plugins from
Maven repositories with HTTP 403. Flutter retried once and failed again. This is
an unresolved dependency-download gate, not an accepted Android build.

The Android Gradle configuration limits the heap to 2 GiB and workers to two for
development laptops. Re-run the Android gate on a machine with working dependency
access. Any later native compilation failure must be fixed and reverified.

## Remaining acceptance work

1. Run `bash tooling/verify-d3a-m1.sh --android` with the Android toolchain and
   working Gradle dependency access; launch the resulting app on a device/emulator.
2. Run `bash tooling/verify-d3a-m1.sh --ios` on macOS/Xcode and launch the simulator.
3. Run the integration smoke on an available Android/iOS target and complete the
   browser walkthrough, including hash-route refresh and keyboard focus.
4. Confirm final logo artwork/application IDs and review the visual comparison.
5. Review D2 shared-widget extraction and D1 M2 auth/contracts before live adapters.

The development guide and all seven original screenshots are available in the
branch. [Visual reference and render index](../design/business-m1/README.md).

This branch builds on the customer-import integration branch while PR #1 is
pending. Review its Business-only diff against `feat/m1-import-customer-flutter`;
coordinate the final mainline integration after the import is accepted. No merge
or deployment is performed by this delivery.
