# FAJIFY M2-P2 DEVELOPMENT REPORT — synchronization and identity client

Date: 2026-10-26 (Africa/Lagos). Scope: official upstream synchronization plus independently testable current-customer identity clients. No push or remote write was performed.

## A. GitHub access

- Official target remains https://github.com/fajify1-ai/Fajify; fetch and push remote URLs are unchanged.
- Codex connector reports authenticated login Faith-loves, repository push permission true and collaborator permission write.
- A read-only GitHub API request using the credential returned by local Git's credential helper independently reports Faith-loves and push permission true. The credential was held only in process memory and never printed, persisted by our code or included in the repository.
- Git Credential Manager lists an entry labelled developerEBA. That label alone was misleading: developerEBA has read access according to the collaborator API, but it is not the account returned by the actual current credential.
- Codex connector authentication and local Git Credential Manager are separate credential mechanisms. Both currently resolve to Faith-loves; no credential/account settings were changed.
- No collaborator invitation or account switch is currently needed. Repository-level write access is confirmed; an actual push and any branch-rule enforcement were deliberately not tested.
- If permissions are later removed, the repository owner can open repository Settings → Collaborators → Add people, select Faith-loves and grant write access; Faith-loves must accept the invitation. Do not create a personal duplicate or change origin.

## B. Partner's latest changes and integration

Fetched official branch references and checked live remote heads, rather than assuming main contained the update.

- Relevant Phase 1 branch: feat/m2-d1-keycloak-auth-authorization.
- Feature tip: 36f7ad798aabfb170873fd2d67985d99a6b55e70.
- Approved integration baseline: official main ab80a3e00fac4bd80f8735b4ba0846140455f56a, merged through [PR #8](https://github.com/fajify1-ai/Fajify/pull/8).
- Local normal merge commit: d3dce51891f21525edacf6e88e7e7ef663642d4d. All 45 integrated paths match upstream main exactly; no Phase 1 implementation or policy was rewritten.
- Affected paths: apps/api/package.json; apps/api/src/auth/{access.service,account.guard,admin-access.controller,admin-rate.guard,identity.module,identity.types,keycloak.verifier,onboarding.controller,privileged.guard,resource.guard,roles.guard,session.controller}.ts; API auth/account/access/role/Keycloak tests; five Phase 1 engineering evidence files plus the auth contracts file; infrastructure/keycloak/M2_SETUP.md and realm-faji-m2.json; database identity migrations 0002/0003 and disposable-target.ts; seven Keycloak/database acceptance tooling scripts. Exact filenames: git diff --name-status 5694b45 ab80a3e -- apps/api packages/database infrastructure/keycloak tooling docs/engineering.
- No customer source overlap or merge conflicts. The update directly affects customer integration through identity verification, account state, revocation, customer roles and OIDC contracts. Shared database code changed; no shared Flutter/UI package changes were present.
- Only merged main was integrated. Other newer/unmerged feature branches were not selected by timestamp. Partner authorship itself was not inferred from a username; PR #8 and its source branch are the verified relevant update.
- The old origin/feat/m2-p2-customer-auth reference came from the local metadata clone, not an existing remote branch. Pruning removed that stale local tracking reference; origin/HEAD now targets origin/main. No GitHub branch was deleted or created.
- Main was rechecked after integration and remained ab80a3e.

PR #8 reports consolidated acceptance on feature tip 36f7ad7. The committed Phase 1 documents also retain older pending/separate-run statements. Those are historical evidence discrepancies, not grounds to claim a live environment is available here. This workstation did not repeat disposable Keycloak acceptance.

## C. Preserved development and new milestone

All three checkouts were inspected and clean before integration:

| Folder | Preserved head |
| --- | --- |
| C:\Users\omola\OneDrive\Desktop\Fajify-main | 5694b456835e33de8f54064bf27563abcb0f66be |
| C:\Users\omola\Projects\Fajify-m2-p2 | 2cd453513dd6a51048bf7dd3bb153197e54c946d |
| C:\Users\omola\Projects\Fajify-m2-p2-components | 7565984ca0a876b851767f639bd960b433e0e620 |

The desktop checkout already contained e15e17f, 9894a3e, 7565984 and the completed Firebase-removal commit 2cd4535 through merge 315b62c. It was the latest consolidated implementation, so no migration or Git initialization was repeated. Other checkouts were not modified. Additional independent Git bundles of all three histories were created at C:\Users\omola\AppData\Local\Temp\fajify-sync-c8a4200961d34d4b86ddb715aba0b4bc. Earlier full source snapshots and original-file archives remain at C:\Users\omola\Projects\Fajify-preservation-20261026-1793011187900.

Existing authentication abstractions, state/controller, expiry/logout, guarded navigation, native secure-store adapter, Next.js server-session/OIDC boundaries and reusable controls remain intact.

### New identity clients

Flutter:
- apps/customer_mobile/lib/features/auth/data/customer_identity_client.dart
- apps/customer_mobile/lib/features/auth/data/identity_http_io.dart
- apps/customer_mobile/lib/features/auth/data/identity_http_stub.dart
- apps/customer_mobile/test/auth/customer_identity_client_test.dart

Next.js:
- apps/customer_web/lib/auth/identity-api.server.ts
- Extended apps/customer_web/test/auth.test.ts.

Both consume the published GET /api/v1/auth/me response {subject, roles}, validate its shape, require the response subject to match the SDK-verified subject, require the published customer role and refuse denied/malformed responses. API origin must be explicitly supplied over HTTPS, without user info, query, fragment or path. No issuer, API hostname or web client ID is invented.

The native transport does not follow redirects, bounds response bytes and time, closes its connection, and never retains tokens. Web requests remain server-only, omit browser credentials, disable caching and redirects, and bound response bytes/time. Failure messages do not expose HTTP bodies, bearer tokens or transport diagnostics. Each call checks the backend afresh, so a local cached identity cannot mask account suspension.

These clients are not wired into an enabled OIDC composition. Tests use injected transport fixtures; no live TLS/backend/native device request is claimed. They do not derive email verification from /me, generate a display name/photo or turn enrollment into approval. Display-profile integration remains unavailable.

Package resolution regenerated tracked Linux/macOS/Windows registrants for the existing flutter_secure_storage dependency and its FFI support. Those dependency-consistent registrants are included; no dependency version or lockfile change was needed. Their native compilation remains unverified.

### Firebase and customer functionality

The active-runtime reference scan found no Firebase SDK/import/initialization/Google Services plugin references in app source and manifests, excluding historical Markdown and the retained disconnected google-services.json. No Firebase dependency was reintroduced. That Android configuration is retained exactly as requested, pending ownership approval. External cloud resources and data were untouched.

Customer layouts, theme, auth presentation, routes and web pages are unchanged from 5694b45; exact Git diff comparison passed. Existing unavailable states for discovery, plans, wishlist, bookings and profile remain explicit until approved services exist. This is not a claim of restored live customer functionality.

## Reusable Components

No new UI component was needed or created. Existing FajiAuthTextField, AuthPrimaryButton, AuthFormLayout, AuthLoadingIndicator, AuthErrorMessage, AuthInput, CustomerAccessGate and ServiceUnavailableView remain shared and covered by existing tests. There is no separate AuthStatusView widget.

New request logic is centralized in one identity client per platform and kept outside widgets/components. Flutter reuses AuthFailure and AuthErrorCode. The native/browser transport split avoids adding a browser token-storage path. No duplicate login, registration, recovery UI, credential store or application auth state was added.

## D. Verification

| Check | Executed result |
| --- | --- |
| Corepack pnpm 9.15.9 frozen offline install | Passed, lockfile unchanged |
| Flutter pub get --enforce-lockfile | Passed, explicit exit 0; earlier symlink failure did not recur |
| Dart format --output=none --set-exit-if-changed lib test | Passed, 81 files / 0 changes |
| Flutter analyze --no-pub | Passed, zero issues |
| Full flutter test --no-pub | 55 passed, including seven new identity tests, existing auth/widget and three pixel comparisons |
| Web auth/protected-handler tests | 20 passed, including four new identity tests |
| Web TypeScript check and production build | Passed |
| Backend TypeScript, lint and build | Passed |
| Backend standard test script | Failed before execution: Node 20 Windows treats test/*.test.ts literally |
| Backend test suite with explicit filenames | 56 passed, 4 failed; all four fail the disposable-database prerequisite hook |
| Workspace structure check | Passed; not runtime evidence |
| New milestone diff whitespace check | Passed |
| Imported Phase 1 diff whitespace check | Two inherited warnings, left unchanged: Markdown hard-break whitespace and final blank line in privileged acceptance script |
| Conflict markers/common secret patterns/sensitive local settings scan | No findings in tracked/new text source; this is a scoped pattern check, not a guarantee about all historical credentials |
| Active Firebase reference audit | No active runtime matches; disconnected owner-pending JSON retained |
| pnpm audit | Failed with 2 high advisories: zod GHSA-mrhx-c7xc-m3w5 and multer GHSA-q7qp-rjg7-q26m; existing shared backend dependency graph, not introduced by this milestone |

Backend failures originate at apps/api/test/authorization.database.test.ts:23: “M2 database integration requires explicitly disposable migration/runtime URLs”. No existing database was selected, no migration was applied and the guard was not bypassed. Logs: C:\Users\omola\AppData\Local\Temp\fajify-sync-backend-tests.log. Registry audit JSON: C:\Users\omola\AppData\Local\Temp\fajify-sync-dependency-audit.json. Dependency fixes require a reviewed Phase 1 change, not uncoordinated version bumps.

Flutter Doctor still reports no Android SDK and no Visual Studio C++ workload. Flutter/Dart were invoked from C:\Users\omola\develop\flutter and are not globally on PATH. Android APK/device, native secure-storage/TLS acceptance, iOS/macOS builds, real browser login, Keycloak refresh/revocation and live NestJS/database end-to-end checks were not executed. No deployment origin, running Keycloak instance or test-account configuration was supplied.

## E. Git status and manual delivery

Official working directory remains C:\Users\omola\OneDrive\Desktop\Fajify-main, branch feat/m2-p2-customer-auth, origin https://github.com/fajify1-ai/Fajify. The verified identity-client milestone is committed locally after this report; obtain its exact hash with git rev-parse HEAD. Final delivery reports the hash and status. No push is performed.

Run manually:

~~~powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main'
git remote get-url origin
git status --short
git branch --show-current
git log -5 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
~~~

Do not force-push if remote history has changed; fetch and review it. Do not print credentials or switch accounts merely because the cached entry label differs from the verified login.

## F. Eight-task progress and next work

| M2-P2 task | Current position |
| --- | --- |
| 1. Flutter Code + S256 PKCE | Partial: tested SDK boundary/callback lifecycle; merged mobile client/redirect template available. Live issuer and deployment approval, SDK selection/composition and platform callback registration pending |
| 2. Registration, verification and login | Partial: shared UI/state ready; merged Keycloak policies exist; live browser provider handoff and pending-account UX still need integration |
| 3. Password recovery | Partial: shared recovery UI/unavailable behavior; merged provider reset policy exists; real SDK/browser handoff pending |
| 4. Secure token/session lifecycle | Partial: native store serialization, expiry/logout tests and boundaries ready; actual OIDC refresh, rotation, provider revocation and device acceptance pending |
| 5. /api/v1/auth/me | Identity contract clients and 11 new platform tests implemented; live composition pending. Display-profile fields are absent from the published contract |
| 6. Protected navigation and roles | Shared gates/tests preserved; new /me clients enforce subject/customer checks. API authorization remains authoritative |
| 7. Next.js server sessions | Server-only session/OIDC/API foundations tested; customer web client, durable stores, SDK and mounted live routes pending |
| 8. Testing/evidence | 55 Flutter and 20 web tests pass; backend 56/60 with four environment failures; Android, live integration and dependency audit gates remain open |

Next development milestone: select a maintained native OIDC SDK and connect the approved mobile deployment issuer/client/callback to the existing repository, secure store and identity client. The merged template provides faji-customer-mobile and com.faji.customer:/oauth/callback, but it explicitly requires environment-specific review; template presence alone is not deployed approval. Preserve email verification and pending-account denial. For web, Phase 1 must provision the customer web confidential client, callbacks/logout policy and API origin, and approve durable session/transaction storage before enabling routes. Obtain a running isolated environment/test accounts and resolve the shared dependency advisories with Phase 1. No backend security policy or password collection endpoint should be invented.
