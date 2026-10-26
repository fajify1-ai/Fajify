> Historical evidence below is superseded for current development by [M2-P2 Firebase removal](M2_P2_FIREBASE_REMOVAL.md). The product owner's 2026-10-26 instruction authorizes removal before customer APIs exist, using typed unavailable boundaries.

# FAJIFY M2-P2 customer authentication progress

Recorded 2026-10-26. Branch: `feat/m2-p2-customer-auth`.
Baseline: `0ff79d4110af4db4fc42e9e88cc987c6b7dfd366` (merged main,
including the customer analyzer cleanup and device-evidence branch).

**Delivery is local only. The user will push. Do not perform GitHub writes.**

## Completed independent work

### Flutter

- `apps/customer_mobile/lib/features/auth/domain/auth_session.dart`:
  typed session metadata, authentication states and safe error codes/messages.
  Credentials/tokens are not kept in presentation session state.
- `domain/auth_repository.dart`: repository, legacy-password and account-recovery
  contracts. Legacy registration fields explicitly remain Firebase fields, not
  an invented backend DTO.
- `application/auth_controller.dart`: restoration, refresh orchestration,
  expiry timers/resume checks, login, registration, logout and provider events.
  Generation checks prevent late asynchronous restoration from undoing logout.
  Failed logout and disposed controllers cannot grant access.
- `data/firebase_auth_repository.dart`: existing Firebase login, registration,
  display-name update and Firestore profile writes extracted from the screen.
  Existing collection/field names and the legacy customer journey are retained.
  Partially created accounts are rolled back when registration fails.
- `data/oidc_auth_boundary.dart`: system-browser/S256-PKCE/callback, secure store
  and provider session lifecycle interfaces. Pending Keycloak always denies
  access; configuration does not activate a fake provider.
- `presentation/auth_scope.dart`, `customer_access_gate.dart`, and
  `lib/main.dart`: injected application composition, named customer-entry guard,
  restoration-aware startup, and complete stack removal on session loss,
  including directly pushed customer pages.
- Existing auth and recovery screens call the controller. Recovery reports its
  missing integration explicitly, with no artificial delay or email-sent claim.
  Layouts, branding, routes and existing widgets remain.
- `test/auth/`: explicit test doubles for lifecycle, expiry, verification,
  stale operations, provider events, route protection, recovery and stack reset.

Legacy Firebase email-verification behavior is preserved by default.
Keycloak sessions always require verified email in the client controller.
The future provider must also apply accepted customer-role/active-account policy.
Client route protection never substitutes for backend authorization.

Firebase retains automatic legacy token refresh. App resume checks expiry
without forcing a network refresh that would discard a valid offline session.
Explicit refresh is available through the controller and tested independently.

### Next.js

See `apps/customer_web/AUTH_INTEGRATION.md` for modules, security constraints,
tests and adapter requirements. Server-only configuration, opaque session
cookies, callback prechecks and protected-handler/logout primitives are tested.
Public pages and design are unchanged. Production composition remains disabled;
no auth routes, SDK exchange or persistent production store are enabled.

## All eight assigned tasks

| Task | Status | Delivered / remaining |
| --- | --- | --- |
| 1. Flutter Authorization Code + PKCE | IMPLEMENTED, INTEGRATION PENDING | Browser/callback/configuration boundaries and denying adapter tested. Native SDK, approved settings/callback registration and live PKCE remain. |
| 2. Registration, verification and login | IMPLEMENTED, INTEGRATION PENDING | Legacy operations extracted; typed login/error/verification states tested. Real Firebase account flows were not exercised. Keycloak registration/email verification remain blocked. |
| 3. Secure password recovery | BLOCKED | Recovery orchestration/unsupported state tested. BLOCKED BY PHASE 1: accepted email/action flow, SMTP, reset policy and live provider adapter. |
| 4. Secure session lifecycle | IMPLEMENTED, INTEGRATION PENDING | Restoration, expiry, refresh/logout orchestration and race handling tested. Platform secure storage, Keycloak refresh rotation/revocation/logout require real adapters and acceptance. |
| 5. Customer profile via /auth/me | BLOCKED | BLOCKED BY PHASE 1: accepted active-account and profile contract. No fabricated DTO or endpoint use. |
| 6. Protected navigation/customer roles | IMPLEMENTED, INTEGRATION PENDING | Legacy entry/stack protection tested. Keycloak role/active-account decision must be supplied by a verified provider and enforced by backend. |
| 7. Next.js server authentication | IMPLEMENTED, INTEGRATION PENDING | Isolated server configuration/callback/session/cookie/logout guards verified. SDK, shared store, approved web client and live routes remain disabled. |
| 8. Automated/build/integration evidence | IN PROGRESS | 21 Flutter and 16 web auth tests pass; web build passes. Android SDK/device and live identity acceptance remain blocked. |

The independently testable primitives are IMPLEMENTED AND VERIFIED. The complete
M2-P2 identity integration is not complete.

## Precise Phase 1 integration dependencies

Read-only inspection of candidate branch
`feat/m2-d1-keycloak-auth-authorization` at
`c47145ffcd5d40fc88993ab8baa36196ade415be` found realm/client templates,
mobile callbacks, customer role configuration, enrollment and `/api/v1/auth/me`.
Those changes are not merged here. Their documentation says consolidated
acceptance remains pending; this assessment does not certify them.

| Dependency | Expected integration point | Current behavior |
| --- | --- | --- |
| Accepted mobile issuer/client/scopes/callbacks | CustomerOidcConfiguration + native SDK adapter | BLOCKED BY PHASE 1; all optional values remain unset and PendingKeycloakRepository denies. |
| Accepted customer web client/HTTPS callbacks | loadAuthConfiguration + maintained SDK | BLOCKED BY PHASE 1; blank .env.example values; production composition disabled. |
| Active-account/customer-role and verification policy | Verified provider creates AuthSession / internal ServerSession | BLOCKED BY PHASE 1; no unverified claims or profile role fields authorize Keycloak. |
| Accepted /auth/me and customer profile schema | Future customer profile repository | BLOCKED BY PHASE 1; candidate {subject, roles} is not a full profile contract. No speculative client added. |
| Registration/enrollment and approval behavior | Browser account flow + agreed API adapter | BLOCKED BY PHASE 1; existing Firebase fields are not repurposed as backend DTOs. |
| Email verification/recovery/SMTP/action expiry | CustomerAccountRecovery / browser provider actions | BLOCKED BY PHASE 1; UI returns an unavailable result and sends no request. |
| Session lifetime/refresh rotation/logout/revocation | SecureSessionStore, ProviderSessionLifecycle, server store/revoker | BLOCKED BY PHASE 1 and adapter implementation; no insecure storage or process-local production fallback. |
| Shared server TTL/transaction store and credentials | SessionStore / atomic OidcTransactionStore | BLOCKED BY PHASE 1/shared-owner coordination; test Maps exist only in tests. |
| Test environment and synthetic identities | Browser/device/provider integration acceptance | BLOCKED BY PHASE 1; no real credentials, email delivery or token exchange exercised. |

## Verification

Official Flutter SDK installed separately at
`C:\Users\omola\develop\flutter`: Flutter **3.47.8**, Dart **3.13.7**.
The Dart version satisfies the existing `^3.13.4` constraint. No Flutter package
versions or dependency constraints were changed.

| Command/check | Result |
| --- | --- |
| Dart format on changed Flutter files | Passed |
| flutter analyze --no-pub | Passed, no issues |
| flutter test --no-pub | Passed, 21 tests, including existing navigation test |
| pnpm --filter @faji/customer-web test | Passed, 16 tests |
| pnpm --filter @faji/customer-web typecheck | Passed |
| pnpm --filter @faji/customer-web build | Passed |
| flutter build apk --debug --no-pub | Blocked/failed: No Android SDK found |
| flutter doctor -v | Flutter available; Android SDK absent; Windows C++ toolchain absent; Flutter/Dart not on global PATH |
| flutter pub get --enforce-lockfile | Download/resolution succeeded without lockfile changes; subsequent Windows plugin setup failed because symlink support/Developer Mode is unavailable |
| git diff --check | Passed |

Windows Developer Mode/admin symlink capability is required to finish normal
plugin setup. Tests/analysis successfully used the resolved package graph with
`--no-pub`; this is not proof of a native Android build. No OS security setting
was changed.

Initial controller type errors/lints were fixed before the passing checks.
The root `pnpm test` Windows wildcard issue remains pre-existing and outside
Phase 2 backend ownership. Earlier explicit baseline runs passed 13 API and
3 worker tests. Database/Redis and real identity integration are not certified.

Use Corepack pnpm **9.15.9**. This host has another pnpm version on PATH;
temporary Corepack shims were used for nested commands. Existing package
versions remain pinned; customer-web adds server-only and the workspace's
existing tsx runner only.

## Safety and handoff

- No Phase 1 code/security policy, branding/assets, wishlist/booking/discovery/
  plans repositories or existing customer data was modified.
- Firebase dependencies and initialization remain. Native Firebase flows and
  authenticated device/offline journeys still need runtime regression tests.
- No Keycloak passwords are collected by new code. Password arguments belong
  exclusively to the explicitly legacy Firebase boundary.
- No secrets or generated build outputs are committed. Existing machine-specific
  SDK/credential files must remain untracked.
- The extracted `Fajify-main` folder remains unchanged.
- Local code is ready for user review/push; no merge is authorized.

Next independent verification task: configure Android SDK/Java compatibility
and Windows symlink support, then run package setup, debug APK build and device
regressions. Next integration task: review the accepted Phase 1 commit and wire
the real native/server OIDC SDK and persistent-store adapters before enabling
any Keycloak flow.

## Reusable component reconciliation

Component commit 7565984 is preserved through a reviewed patch reconciliation with the migration. See [reusable components](M2_P2_REUSABLE_COMPONENTS.md) and [current reconciliation report](M2_P2_RECONCILIATION.md).
