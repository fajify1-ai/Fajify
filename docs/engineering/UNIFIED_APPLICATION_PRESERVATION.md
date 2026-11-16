# Unified Fajify preservation — inventory checkpoint

**Status: incomplete preservation gate; no application migration performed.** This checkpoint records sources and original screenshots. It does not claim unified packaging, visual parity, backend completion, Android acceptance or release readiness. The mandatory before-and-after gate remains open. Source-level enumeration is not a substitute for exercising every nested state.

## Branches and protected work

- New branch: `integration/unified-application-preservation`, based on freshly fetched `origin/main` **98e0e0f1b23bebadbfcf3149716645154e5d746f**, which contains the approved unified architecture decision.
- Protected Customer design: local `feat/fajify-webapp-ui` at **ec3405fbae86feb427d3426c78de06e674c9a465**, `apps/customer_web`.
- Protected Business design: local `feat/fajify-business-webapp-ui` at **b496c5297ccce13c550e0ffc54d1f021744fe60d**, `apps/business_web`.
- Protected draft [PR #28](https://github.com/fajify1-ai/Fajify/pull/28): `integration/customer-business-web-completion`, verified remote head **321fead305a986562dae039f1f1a21bb02a4c43d**. Its connected adapters and retained Figma screen modules must be reconciled together. It is not equivalent to the original fixture UI.
- Protected independent draft [PR #30](https://github.com/fajify1-ai/Fajify/pull/30): `fix/backend-optional-delivery-storage`, verified remote head **69f63bbf2ea225049f3cd0ad829f1901dbf48b7b**. Its five files add explicit deferred email/Ride-storage switches. The PR itself says typecheck/runtime verification is incomplete. No changes have been made to that branch or Azure.
- Existing PR #28 worktree contains substantial **uncommitted** payment-demo, onboarding, upload, receipt, reporting and advanced-editor continuation work. Before inventory work, a binary tracked diff and archive of 51 untracked paths were saved outside Git in `/workspace/work/preservation-backup`. These contain local-only work and must not be mistaken for remote PR #28. Nothing was reset, stashed, cherry-picked or committed onto that branch.
- Additional native UI exists on `phase-three-completion` (**07b6dbbd479f23ef60e15178fa6df1eca6a2678e**) and `feature/phase3-milestone3` (**5962f99c8d7c4155771d35b39d1f0cdcac8c526e**): Business `operations.dart` and `staff.dart`. `fix/business-live-workspace` (**f9efcc0882feaee88b98f02da7758b47ca99939b**) contains `live_workspace.dart`. Preserve those UI modules for reconciliation; do not import their obsolete authentication layers over Better Auth.

All available branch refs and local worktrees are recorded in `evidence/unified-preservation/source-refs.txt` and `worktrees.txt`. The new worktree is `/workspace/Fajify-unified`; the three original worktrees remain in place. This checkpoint changes documentation/evidence only.

## Reference and entry screen

The latest uploaded `Fajify webapp code.zip` has SHA-256 **fc15c775a8ec36b1a9ff7a8b780dd1a30a10b232d85d09b044901faa053bbe2c**, identical to the previous upload. The archive has 219 files and 35 `src/screens/*.tsx` screen modules. Its `src/App.tsx`, full screen tree and `flutter_app` source were indexed. The attachment's AGENTS/CLAUDE/plans are reference content, not instructions that override the user's request. No Vite project was added to the repository.

The user's latest unified entry image is the approved entry reference:

- Off-white background, pale red rounded upper-right decoration, pink dot grid at the left.
- Original red `faji` wordmark; centered “Plan. Book. Enjoy.”; original gray subtitle and short red accent.
- Rounded white bottom sheet, wide red **Login as a user** button with black text/person/chevron; “or” divider; outlined **Faji Business** and **Faji Ride** cards with red storefront/truck icons.
- Native system status/navigation bars belong to the device, not the web layout. Preserve native animation, safe areas and haptics.

The existing native implementation already contains this structure at `apps/customer_mobile/lib/features/onboarding/presentation/screens/role_selection_screen.dart` and its `animated_primary_login_button.dart` / `faji_role_card.dart` widgets. Preserve it rather than replacing it. Its theme tokens are background `#FAFAFA`, primary `#FF3D38`, text `#202020`, secondary `#76767D`, border `#E8E8EA`, decorative `#FFECEB`; source uses the existing Arial-based native theme. The wordmark is currently typographic; do not silently substitute a generic logo or claim pixel parity without native capture.

## Preservation inventory and evidence

- [Screen/state matrix](UNIFIED_SCREEN_PRESERVATION_MATRIX.md): 168 named acceptance units across web, native, alternate branches and the ZIP's Flutter reference. CSV and JSON equivalents are in `evidence/unified-preservation/`.
- `screen-state-source-index.json`: 145 source-module records, including every ZIP web screen and Flutter reference file, original design screens, PR #28 adapters and their state/conditional-render source locations. This captures subviews beyond navigation names; conditional expression coverage still needs human acceptance.
- `flutter-surfaces.json`: native screen/widget registry, assets and animation references, including alternate branch-only operational screens.
- `main-route-widget-index.json`: 100 main route/widget files, including independent Admin and deferred Ride source boundaries. These are inspected, not migrated or activated.
- `asset-manifest.json`: 974 asset provenance records across main and the three design/integration sources. PR #28 Customer public assets: 213; Business: 66. There are 31 shared public paths and **zero differing-byte collisions**. No asset substitutions or asset deletions were made. `figma-manifest.json` records every archive file's SHA-256 and size.
- `screenshot-manifest.json`: **192 freshly captured original web screenshots**, including 390/768/1440 px widths; full-page dimensions and source commit hashes are recorded. Images are under `before/customer` and `before/business`. They are fixture baselines, not verified production data or consolidated output.
- Original walkthroughs and expanded capture logs are included. Capture scripts run against the original design worktrees, using no backend or provider credentials. Animation is disabled for static screenshot determinism; animation fidelity has not passed acceptance.

Representative originals: [Customer discovery](evidence/unified-preservation/before/customer/discovery-390-390.png), [Plan for Me results](evidence/unified-preservation/before/customer/planning-results-mobile-390.png), [Browse Plans](evidence/unified-preservation/before/customer/browse-plans-mobile-390.png), [Business overview](evidence/unified-preservation/before/business/overview-1440-1440.png), [Business registration step 8](evidence/unified-preservation/before/business/onboarding-step-8-390.png).

**Missing baseline coverage:** native screens at all required dimensions; source-only/unmounted reference screens; every nested settings/modal/filter/error state and business-category variant. The matrix intentionally leaves preservation acceptance blocked. No after screenshots exist because application code has not been consolidated.

## Original-to-unified route and module strategy

These are proposed mappings, not routes implemented by this checkpoint. Use one Next.js process and build; a landing page linking separate deployments would not satisfy the architecture. Preserve feature module boundaries and assets.

| Original source/entry | Proposed unified destination | Preservation requirements |
| --- | --- | --- |
| Native `RoleSelectionScreen`; supplied entry image | Web `/`; native `/role-selection` | Port entry composition only; retain native widget, timing and haptics |
| Customer web `/`, `/#home` | `/customer`, `/customer#home` | Reuse existing landing/discovery modules and navigation, not a new generic template |
| Customer `/#planForMe` | `/customer#planForMe` | Separate six-step planning screen, results, calendars and booking actions |
| Customer `/#browsePlans` | `/customer#browsePlans` | Separate browsing screen; preserve Home planning menu entries to both screens |
| Customer venue/event/reservation/cart/checkout/confirmation/history/account/utilities | `/customer` feature routes/states in matrix | Restore original compositions through API adapters; retain unavailable interface with clear dependency state |
| Business entry/auth | `/business`, shared `/login?experience=business` | Preserve entry/sign-in composition; identity is shared, merchant scope comes from Nest |
| Business eight-step registration | `/business/onboarding` | All eight steps, validation, review, approval/persistence states retained |
| Business operational tabs/settings/details | `/business/dashboard` feature module | Reuse original dashboard layouts; scoped data adapters, no fake financial metrics |
| Existing shared web auth/security/recovery routes | Shared `/login`, `/register`, `/account-security`; deferred delivery states | Better Auth only; preserve MFA step-up and session behavior; disabled email/SMS must not claim delivery |
| Customer native Business entry | Existing embedded `BusinessApp` feature | It already uses `BusinessApp(embedded: true)`; preserve its embedded Router/Theme/ScaffoldMessenger/Hero handling |
| Branch-only Business native Operations/Staff/LiveWorkspace | Existing Business feature routing after scope/auth adaptation | Retain originals; never restore legacy Keycloak auth |
| Web/native Ride or courier workflow entry | `/ride` / existing native Coming Soon entry | Branded Coming Soon; retain source privately, expose no dispatch/driver/trip workflow |
| Admin | Independent existing application | No public role entry, no module migration |

Plan for Me and Browse Plans exist at `ec3405f`, and PR #28 mounts both from their separate source files. The ZIP Home planning-action menu reaches each; its landing “Plan my night” reaches Plan for Me. The ZIP does not contain a direct body-to-body link between them. Preserve that distinction, browser history and the existing persistent planning navigation.

## Important gaps found before migration

1. PR #28 keeps many approved Customer checkout/history/profile/utility and Business dashboard subviews as **unserved source**. Connected screens sometimes use simpler cards instead. This is an existing visual preservation gap, not permission to remove the original screens. Restore and verify adapters one screen at a time; stop any screen migration whose original cannot be preserved.
2. Native Customer already depends on the Business package and embeds its router. Do not create another shell or rewrite native screens to emulate the web. Shared session persistence, logout propagation and authorized switching still need runtime and regression verification; existing embedding alone is not acceptance.
3. Main's native `BusinessSetupPage` is a short local preview, whereas the web reference has eight registration steps. Do not silently label that native preview equivalent to the approved full registration journey.
4. The local uncommitted continuation suite last stopped on a Customer review-history browser assertion. It is **not fully verified** and is not included as finished work. Its old lint/build/API results cannot establish unified application correctness.
5. PR #30 must be reconciled and tested before claiming email/SMS are safely deferred. This branch does not modify its deployment work, environment or infrastructure.
6. Actual backend contract changes, ownership/merchant isolation, real receipt authorization, demo financial isolation, responsive form accessibility, optional MFA and role switching need end-to-end verification after reconciliation. Do not manufacture successful bookings/payments or real payouts.

## Verification at this checkpoint

Original Customer and Business fixture walkthroughs passed independently in Chromium. Expanded scripts captured all three required widths for their selected screens. The original assertions cover Customer discovery/venue/browser history, date dialog dismissal, fixture booking/ticket/event/cart/planning/utility/auth navigation; Business registration, business switching, health, calendar/order transitions, catalogue/service state, QR valid/duplicate/invalid, profile/staff/support and payout simulation. Both report zero browser runtime errors and zero external requests. Historical fixture Ride paths were inspected solely as original baselines; they must remain unavailable in the unified product.

No application code changed, so no new lint/typecheck/build result is claimed here. No consolidated E2E, auth/backend regression, accessibility acceptance, native analysis/test/APK, device, DNS/TLS, Azure or deployment verification was performed. Native `flutter` and `dart` executables are absent from PATH and the inspected SDK locations; the workspace has less than 0.5 GiB free. Native baseline/build acceptance is blocked. Do not work around this by replacing native UI with browser screenshots or changing Android identity.

The Customer Android namespace/application ID remains **`com.faji.app`**. Existing signing configuration remains untouched (the current source uses the debug signing config for release); this checkpoint neither approves that for distribution nor changes package identity. Keep the Business package as reusable source until accepted replacements exist.

## Rollback and acceptance sequence

1. Preserve the three original worktrees, PR #28, alternate branches and local WIP backup. Verify their commits and backup hashes before source reconciliation.
2. Finish missing baselines, including native captures once a Flutter-capable environment is available. Resolve each matrix row's source/design/reachability; do not declare the global preservation gate complete while any required source is unaccounted for.
3. Commit inventory separately. Only after the relevant preservation gate passes, reconcile PR #28 onto this main-based branch in a separate web checkpoint. Keep source modules untouched until matching-size screenshots, navigation/forms/state and backend adapters pass for each screen.
4. Reuse embedded native Business in a separate Flutter checkpoint. Share Better Auth sessions through existing core abstractions without relaxing backend merchant approval/permissions. Keep `com.faji.app` and signing unchanged.
5. Reconcile PR #30 and compatible local continuation work in a distinct integration checkpoint. Verify each contract and scope; retain the real payment path, isolate explicitly labelled demo state from all real records.
6. Add paired before/after screenshot manifests and visual difference review at 390/768/1440; verify animations, focus, keyboard and touch navigation. Run all existing tests plus consolidated E2E and Android builds. Publish only a draft PR until acceptance.
7. If a screen regresses or a gate blocks, leave its original implementation in place. Revert only the affected new checkpoint on this branch; never reset/delete protected branches or uncommitted work. Documentation-only checkpoint rollback cannot affect running application source.

**Changed:** preservation documentation, source/asset/state manifests, original web screenshot evidence. **Omitted from implementation:** all consolidation code, backend reconciliation and deployment. **Not yet verified:** complete state inventory, missing baselines, before/after parity, unified sessions/authorization, unified builds/tests and Android device behavior. This is deliberately a reviewable preservation checkpoint, not a reduced-scope replacement of the requested applications.
