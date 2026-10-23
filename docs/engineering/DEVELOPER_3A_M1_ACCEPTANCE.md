# Developer 3A — M1 implementation and verification

**Status:** M1 Business scaffold implemented. Requested Android device checks passed at `8bbb471`; the subsequent Business login/registration choice correction requires fresh runtime verification. M2 live authentication is not accepted.
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

## Historical standalone verification evidence

**Verified source commit:** `768a17f1997c69a4c8b566f2b4304acfb973b848`.
The following evidence commit changes documentation only.

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

## Historical standalone follow-up checklist

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


## Main-app integration follow-up — 23 October 2026

The product owner selected Business inside the same installed Faji application.
The main role-selection Business entry now uses the merchant login and workspace
through a public local package entry point, with scoped routing/theme and session
cleanup on return to role selection. The standalone runner remains available.

Verification of the integration implementation: Business analysis passed and
**38 Business tests plus 3 main-app widget tests passed**. The new customer entry
and test sources analyze without issues. Full customer analysis still reports
35 diagnostics in 16 unchanged imported files; the tested D2 cleanup branch has
not yet been pushed to GitHub. These diagnostics are not accepted as a passing
full-customer check. Formatting, shell syntax, structure and whitespace passed.

The main APK must be built and the combined flow tested on the physical Android
phone after integrating D2's tested cleanup. The earlier standalone evidence
above remains historical and does not establish acceptance for the embedded
flow. No new Android/iOS or real-device acceptance is claimed.

[Integration and device command](BUSINESS_MAIN_APP_INTEGRATION.md) ·
[Implementation test log](evidence/business-main-app-checks.txt)


## Developer 2 mainline baseline incorporated — 23 October 2026

Developer 2's verified baseline was merged through PR #6 at
`2533b29fbfeef35bf9b290d81e0c18b30e6dee40` and incorporated into this branch.
The prior 35 customer analyzer findings above are now resolved by that cleanup.
The combined verification script passes dependency resolution, formatting,
**zero issues in both application analyzers**, **38 Business tests and 3 main-app
widget tests**, structure and whitespace checks. See
[combined verification log](evidence/business-mainline-consolidated.txt).

The earlier local environment did not run Android compilation or the combined-app
physical-device checks. The later product-owner report below supersedes that
pending status for the requested combined Android scope only.


## Combined Android physical-device result — 23 October 2026

The product owner supplied a passing verification report for source commit
`8bbb47195d71acfe6ce6fe25cab3ff7447e51557`, the PR #5 implementation head
at the time of testing. The report was supplied by the owner; the reviewer did
not independently operate the phone.

| Check | Reported result |
| --- | --- |
| Connected Android device detected through ADB | Passed |
| Business static analysis | Passed |
| Business controller/widget tests | 38 passed |
| Customer static analysis | Passed |
| Customer/Business embedding tests | 3 passed |
| Combined Android debug APK build | Passed |
| Physical-device integration test | Passed |
| APK installation and cold launch | Passed |

The reported device flow opened Business from the main application, visited its
tabs and returned safely. The submitted summary does not provide the device/OS,
APK hash or raw log attachment location; those details are not inferred from the
earlier Developer 2 smoke test. Unrequested scenarios remain unverified.

The standalone Android dependency-download failure above is historical. This
combined APK pass does not assert a new standalone APK, iOS build or browser
walkthrough pass. Manual hardware Back, background/resume, offline demo,
keyboard/scrolling and large-text device coverage remain unverified unless the
underlying evidence explicitly demonstrates them. The prior automated widget
coverage remains separate from physical-device evidence.

### Acceptance boundary and remaining review

[M1 scope](../roadmap/MILESTONE_1.md) assigns 3A scaffolding and auth hooks;
[M2](MILESTONES.md) owns working OIDC, secure sessions and authorization.
Customer Firebase removal is a separate D2 migration dependency for the final
combined application. It does not, by itself, invalidate the passing 3A M1 demo
checks or require all M2 engineering to finish before reviewing the M1 scaffold.

PR #5 remains open and draft pending the team's scope/remaining-check review.
No merge is performed or implied by this record. After a runtime change such as
Firebase replacement, repeat combined-app verification at the new source commit.


## Business choice correction — verification pending

The subsequent runtime update replaces direct login entry with the supplied
Sign In / Register Your Business choice sheet and adds public registration-preview
navigation. The existing device report does not cover this change. Dependency resolution,
formatting, both application analyzers (zero issues), 38 Business tests and 6
customer tests passed on the correction source. Customer analysis/tests also
passed after the final visual adjustment; a 390×844 widget render was inspected.
APK compilation and device checks remain pending. See the
[integration guide](BUSINESS_MAIN_APP_INTEGRATION.md#business-entry-correction--source-checks-passed-device-verification-pending)
and [verification log](evidence/business-auth-choice-checks.txt).
