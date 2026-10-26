> Historical component milestone from commit 7565984. Reconciled with the migration; see [current reconciliation report](M2_P2_RECONCILIATION.md). All GitHub publishing requires the user's manual push. The historical delivery authorization below is superseded.

# M2-P2 reusable authentication components

## Milestone status

Component refactor: **IMPLEMENTED AND VERIFIED** on the committed customer-auth
baseline `9894a3e`. Live Keycloak and Android acceptance remain integration
dependencies, not completed by component reuse.

Working directory:
`C:\Users\omola\Projects\Fajify-m2-p2-components`
Branch: `feat/m2-p2-customer-auth`.

Concurrent edits were detected in the earlier checkout, including a separate
Firebase-removal migration. That work was preserved and excluded. This separate
clone contains only committed baseline code plus this component refactor.
Reconcile the independent migration before integrating these overlapping files;
do not overwrite its checkout or force-update its branch.

## Reusable Components

The existing codebase was searched before adding components. The
flutter_design_system and web_ui packages are declarations/planned modules, not
usable implementations. Existing application widgets were reused instead.

| Existing component / boundary | Reuse or extension |
| --- | --- |
| FajiAuthTextField | Kept its established name; reused in all three auth forms. Recovery appearance preserves existing field paint/padding/borders. Optional autofill metadata added. No duplicate AuthTextField implementation. |
| AuthPrimaryButton | Existing login/register variant retained; named recovery constructor preserves the existing 62px flat FilledButton instead of redesigning it. Both share content/loading and prevent actions while busy. |
| AuthDivider / GoogleAuthButton / AuthSegmentedControl | Reused unchanged in login/registration. |
| FajiColors / FajiTheme | Existing tokens and theme reused; no branding, spacing or typography tokens changed. |
| AuthController / AuthScope / CustomerAccessGate | One session source of truth and centralized protection retained. Gate now uses the shared loading indicator. |
| Next.js server authentication/session interfaces | Existing server-only boundaries retained; no browser token handling or duplicate request logic added. |

New reusable modules:

- `auth_form_layout.dart`: shared Form/Column composition for login,
  registration and recovery, leaving screen-specific spacing outside.
- `auth_loading_indicator.dart`: shared progress rendering and semantics,
  reused by both button variants and the route guard.
- `auth_error_message.dart`: accessible live-region text and one message
  presenter. Existing sheet/page snackbar visual variants remain.
- `domain/auth_input.dart`: centralized email normalization/validation,
  required fields and explicitly separate sign-in/registration password rules.
  Existing users are not subjected to new-account password-length requirements.

A separate AuthStatusView was not added: there is no second real composed
status screen yet. The existing route guard composes the shared loading
indicator. Likewise, Next.js has no login/recovery forms yet; creating unused
web form components now would add speculative abstractions. When approved web
flows are built, reuse typed components for repeated controls and keep all OIDC,
session and authorization logic server-side.

## Functional and security behavior

- Login, registration and recovery share email validation. Recovery no longer
  accepts malformed addresses that registration rejects.
- Provider operations stay in services/repositories. No Firebase, Keycloak or
  HTTP calls were introduced in UI widgets.
- Legacy Firebase remains in this refactor's committed baseline. No migration,
  backend contract, profile schema or security policy was changed here.
- Recovery still fails closed while its provider is unavailable. No reset email
  is claimed to have been sent.
- Error messages share accessible live-region rendering; progress indicators
  carry labels; busy buttons do not dispatch duplicate operations.
- No additional package dependencies were needed.

## Verification

Flutter 3.47.8 / Dart 3.13.7:

- `flutter analyze --no-pub`: passed, no issues.
- `flutter test --no-pub`: **28 passed**, including prior session/navigation
  tests and seven new component/validation tests.
- Three in-memory pixel comparisons passed against pre-refactor fixtures:
  recovery field, recovery button and login/register button.
- Form composition tests verify shared controls on login, registration and
  recovery; invalid recovery input, busy actions and accessible messages are
  covered.
- Dart formatting and `git diff --check`: passed.
- No device screenshot or full native Android acceptance is claimed.
- Android SDK remains unavailable. Package downloads/resolution work, but
  Windows symlink support still prevents normal plugin setup; resolved packages
  allow analysis/tests with `--no-pub`.
- Next.js source was unchanged in this milestone; its previously verified
  16 auth tests and build are recorded in AUTH_INTEGRATION.md.

Visual fixtures exist only in tests. Production UI does not contain copied
reference implementations. The screenshot comparison is in-memory and does not
commit generated images.

## Delivery and next task

Commit only the isolated refactor after checking the staged file list and
credential patterns. The user has reauthorized feature-branch pushes using the
repository's intended credentials. Do not use the previously connected GitHub
account. If shell credentials still receive HTTP 403, retain the local commit
and report delivery blocked; do not force-push or change another branch.

Next: reconcile the concurrent migration with this verified component commit,
then resolve native build tooling and consume accepted Phase 1 contracts.
