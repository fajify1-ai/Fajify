# Faji Business inside the main application

The product owner selected one installed application on 23 October 2026.
The existing role-selection screen remains the entry: **Faji Business** opens
a choice sheet matching the supplied Business entry reference: **Sign In** and
**Register Your Business**. Sign In opens the merchant login; Register opens the
public M1 setup preview. Neither choice grants a merchant session. The explicit
login demo action opens the five merchant workspaces.
Customer login and the Ride entry retain their separate destinations.

## Module and session boundary

`customer_mobile` consumes `business_mobile` through a local Flutter package
reference and the public `faji_business.dart` export. This intentionally replaces
the previous independent-app handoff for this user flow. The standalone Business
runner remains usable for development. Business implementation is reused rather
than copied into the customer application or shared UI packages.

The embedded mode supplies a scoped Theme, Router, Hero controller and
ScaffoldMessenger inside the host route. It does not create another MaterialApp,
initialize Firebase, inherit a customer login, or grant a merchant session on
entry. Business fonts use the dependency's package namespace. Business route
updates do not replace the host's browser location.

Android Back closes Business dialogs first, returns detail/form pages to their
section, and exits root workspace/login pages to role selection. Login and
introduction offer **Back to role selection**. Services' **Switch to Customer
App** clears the merchant demo session and returns to role selection; the user
then chooses customer login. It does not silently sign the user in as a customer.
Re-entering Business starts at login with fresh local fixtures. Logout within
Business stays at the merchant login and clears merchant data.

This integration remains an M1 synthetic workspace. Customer Firebase migration
and real Keycloak authorization remain pending the published API contracts.

## Verification and physical-device acceptance

From a checkout that includes the tested Developer 2 cleanup and this integration:

```bash
bash tooling/verify-business-main-app.sh --android --device <device-id>
```

This checks both workspaces and builds/tests the **main customer APK** that now
includes Business. The device test launches the real app entry point, selects
Business, opens the explicit demo, visits all five tabs, logs out, returns to
role selection, checks signed-out re-entry and switches back from Services.
Tests do not require or submit live merchant credentials. When both options are
used, the script then builds, hashes, installs and launches the normal main APK
so manual inspection uses the application rather than the integration-test runner.

Also manually check hardware Back from login, a detail page and a modal;
background/resume; scrolling, keyboard and larger system text; and offline use
of the demo. Record the exact source commit, device/OS, APK hash, commands,
results and screenshots. Automated widget tests do not establish physical-device
acceptance, and the original Developer 3A standalone evidence does not establish
acceptance of this embedded mode.


## Current mainline baseline

Developer 2 was merged through PR #6 at
`2533b29fbfeef35bf9b290d81e0c18b30e6dee40`. This Business branch incorporates
that baseline. The one conflicting customer widget test was replaced by the
three complete Business/role-selection integration widget tests, rather than
retaining the obsolete expectation that Business opens a placeholder.

Both applications now analyze with zero issues; 38 Business tests and 3 main-app
widget tests pass on the combined source. All backend files and other customer
implementation files retain their mainline versions.

The product owner reported the combined Android debug build, physical-device
integration test, installation and cold launch passed at
`8bbb47195d71acfe6ce6fe25cab3ff7447e51557` on 23 October 2026. This covers
the requested Business entry/tab/return scope; unrequested scenarios remain
unverified. See the [current acceptance record](DEVELOPER_3A_M1_ACCEPTANCE.md#combined-android-physical-device-result--23-october-2026)
for evidence provenance, missing metadata and remaining checks.

M1 scaffold review and M2 identity acceptance are separate. Firebase replacement
remains D2 migration work for the final combined application; it is not a blanket
prerequisite for accepting the explicitly synthetic 3A M1 scope. Repeat combined
verification after runtime changes. No merge or full-platform acceptance is
implied by the device result.


## Business entry correction — source checks passed; device verification pending

The new choice sheet includes a close control, primary Sign In action, outlined
Register Your Business action, and quick-setup helper text over a dimmed/blurred
brand background. Browser and phone chrome from the reference are excluded.
Closing the sheet or pressing Android Back returns to role selection. Existing
merchant logout/customer switching continues to clear the demo session.

Registration uses the existing setup preview through a public `/register` UI
route, without requiring demo login. Validation is local, with no account creation,
approval or backend write. Sign In on that preview leads to the login screen;
Android Back and Back to role selection exit to the main role selector. Real
Keycloak login and merchant registration remain M2/M3 implementation work.

The customer widget/device tests have been updated for the choice stage and
registration entry. Verification with Flutter 3.47.7 / Dart 3.13.5 passed:
dependency resolution, formatting, both full analyzers (zero issues), 38 Business
tests and 6 customer flow tests. Customer analysis and all 6 tests passed again
after the final typography/divider adjustment. A 390×844 widget render was
visually inspected; this is not a device screenshot. Compact 320×568 layout with
1.8× system text is covered by a passing widget test.

[Correction verification log](evidence/business-auth-choice-checks.txt).
Android APK compilation and physical-device checks for this correction remain
pending. The earlier `8bbb471` device pass applies to the previous entry flow.
Re-run the consolidated command above before accepting this update.
