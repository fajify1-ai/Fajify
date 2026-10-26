# M2-P2 preferred workspace restoration — 2026-10-26

## Official workspace and preservation

- Repository: https://github.com/fajify1-ai/Fajify
- Working folder: `C:\Users\omola\OneDrive\Desktop\Fajify-main`
- Branch: `feat/m2-p2-customer-auth`
- Imported upstream baseline: `0ff79d4110af4db4fc42e9e88cc987c6b7dfd366`. This identifies the locally verified baseline, not a claim that remote main has not advanced.
- Reconciled merge: `315b62c3b0a4be1a7d681b7ad0a5e5d0ed68b664`.
- Preserved component history: `7565984ca0a876b851767f639bd960b433e0e620`.
- Preserved completed migration history: `2cd453513dd6a51048bf7dd3bb153197e54c946d`.
- Preservation directory: `C:\Users\omola\Projects\Fajify-preservation-20261026-1793011187900`.

All 411 original preferred-folder files matched the upstream baseline (text line endings normalized, binary files compared exactly); no unique preferred-folder source edits were found. Both other checkouts were retained. Their differing work was preserved through reviewed reconciliation and a normal merge, retaining both commit lineages and attribution.

After the user confirmed the other development task had finished, its final snapshot was verified stable. Full source snapshots, SHA-256 manifests, Git bundles, and a migration transaction record are outside the repository in the preservation directory. Every changed or removed original preferred-folder file was individually archived before replacement. Seventy-three paths were added, updated or archived. No source was blindly overwritten, no working directory deleted, and no unrelated repository initialized. Independent Git metadata was cloned from the verified history; the index was populated without changing source files. The restored source tree was clean before verification.

The branch follows the repository's Phase 2 convention in PARALLEL_DEVELOPMENT.md. Backend contracts and security policies remain Phase 1 owned. This migration does not claim team approval to integrate newer Phase 1 work or merge into main.

## Reconciled functionality and limitations

Flutter retains modular AuthRepository, AuthController, AuthSession, secure-storage interfaces and a centralized customer access gate. Browser OIDC dispatch and callback lifecycle checks remain testable boundaries. Pending provider composition denies access; no fake Keycloak sign-in or custom Keycloak password transport was introduced.

The completed Firebase runtime removal is preserved: no active Firebase auth/data SDK, initialization or Google Services plugin remains in customer runtime. The disconnected Android google-services.json is retained pending ownership/deletion approval. No external Firebase resources or stored data were deleted. Customer branding and navigation are preserved; however live login, discovery, plans, wishlist and bookings require approved replacement services. Their unavailable states are explicit and do not pretend to persist or return successful customer data. This is a functional integration gap, not production-ready feature parity.

Next.js retains server-only configuration, OIDC transaction boundaries, opaque secure HttpOnly cookie/session primitives, expiry and authorization checks, and guarded-handler helpers. Live provider routes and durable session/transaction storage are not enabled.

## Reusable Components

Existing FajiAuthTextField, AuthPrimaryButton and established design tokens/layouts are reused. Shared AuthFormLayout, AuthErrorMessage, AuthLoadingIndicator, AuthInput validation, CustomerAccessGate and ServiceUnavailableView prevent repeated form, authorization and unavailable-state logic. AuthStatusView composition remains centralized with the access gate. Login, registration and recovery use shared controls. Seven component tests include three in-memory pixel comparisons; these are component evidence rather than native device screenshots. No new UI components were created during workspace migration.

## Verification in the official preferred folder

| Check | Result |
| --- | --- |
| Independent Git objects/history and both completed commits' ancestry | Passed; fsck reported only harmless dangling objects |
| Pinned pnpm 9.15.9 via Corepack; frozen offline workspace install | Passed, 468 packages; no lockfile version workaround |
| Customer web auth tests | 16 passed |
| Customer web TypeScript check | Passed |
| Customer web production build | Passed, Next.js 15.5.28 |
| Flutter analysis with --no-pub | Passed, zero issues |
| Full Flutter tests with --no-pub | 48 passed |
| Flutter package resolution with --enforce-lockfile | Packages resolved; command reports plugin symlink limitation because Windows Developer Mode is disabled |
| Flutter Doctor | Android SDK missing; Visual Studio C++ workload missing; Flutter/Dart not on global PATH |
| Native Android/device and live identity/API integration | Not verified |

Installed tools observed: Node.js 20.20.0, Corepack 0.34.1, Flutter 3.47.8 and Dart 3.13.7 at `C:\Users\omola\develop\flutter`. Java 24.0.2 was observed during environment setup. Flutter commands used the explicit SDK path. No machine-specific SDK settings or secrets are committed. Next build generated next-env.d.ts references; only that known generated change was restored to the committed baseline after build.

These native tooling and live integration gaps existed before the migration. No failed test was hidden or reported as passing. Prior preparation checks also passed, but the results above were rerun in the official folder.

## Updated M2-P2 checklist

| Task | Current progress |
| --- | --- |
| 1. Flutter OIDC Code + PKCE | Partial: boundary/callback tests ready; approved SDK/client integration pending |
| 2. Registration, verification, login | Partial: shared presentation/state ready; live identity flow pending |
| 3. Password recovery | Partial: shared form/error behavior ready; real provider recovery pending |
| 4. Token lifecycle and logout | Partial: interfaces, expiry/logout and serialized native store tests; live refresh/revocation/native evidence pending |
| 5. GET /api/v1/auth/me | Blocked: published Phase 1 endpoint/identity DTO contract required |
| 6. Protected navigation/customer roles | Partial: centralized guard tests pass; approved claims/role mapping pending |
| 7. Next.js server-managed sessions | Partial: server primitives and 16 tests; durable storage, provider and route composition pending |
| 8. Automated/native/integration evidence | Partial: 48 Flutter and 16 web tests pass; Android SDK/device and live end-to-end evidence pending |

## Outstanding dependencies and next development task

Obtain approved issuer, clients, exact redirect/logout URIs, scopes, role and immutable identity contracts; registration/verification/recovery policies; profile API contract; backend test deployment and test accounts; durable web session and OIDC transaction storage. Then implement maintained OIDC adapters against those approved contracts and verify native storage, callback replay protection, refresh, expiry, logout/revocation and full customer flows. Do not invent policy or endpoints.

Enable Windows Developer Mode and install/configure the Android SDK for native verification. Confirm ownership before deleting the disconnected Google configuration. Review current upstream integration guidance before merging; no backend/security change or remote branch operation was performed during restoration.

## Manual delivery only

No push, merge to main or GitHub publication is authorized or performed. The documentation commit follows the reconciliation merge. Inspect its hash with `git rev-parse HEAD`.

```powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main'
git remote get-url origin
git branch --show-current
git status --short
git log -1 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
```

Use credentials with write access to fajify1-ai/Fajify. If rejected, resolve account permissions; do not force-push.
