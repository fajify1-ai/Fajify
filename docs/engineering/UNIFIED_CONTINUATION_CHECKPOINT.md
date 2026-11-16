# Unified application connected continuation

**Latest: paused at user request.** See [the saved implementation checkpoint and exact remaining verification](UNIFIED_PAUSED_CHECKPOINT.md). Later work is intentionally marked WIP; older verification below is historical.

Date: 2026-11-16. Branch: `integration/unified-application-preservation`, draft PR #31. This is an implementation checkpoint, **not consolidation acceptance**.

## Preserved sources and reconciliation

Starting PR head: `3d41991c1fd577ef11ff905c2868e91fc1f34570`; main inspected at `98e0e0f1b23bebadbfcf3149716645154e5d746f`. Original Customer `ec3405fbae86feb427d3426c78de06e674c9a465` and Business `b496c5297ccce13c550e0ffc54d1f021744fe60d` modules remain in place. PR #28's branch and uncommitted continuation remain independent; selected continuation files were copied and adapted, never reset or committed on that worktree. The saved binary patch is the rollback source for that worktree. PR #30 head `69f63bbf2ea225049f3cd0ad829f1901dbf48b7b` was applied on this integration branch as `429edd0`. Its branch and Azure deployment were untouched. Email and Ride storage can be disabled independently; existing defaults and authorization remain enforced.

The original preservation matrix remains the initial inventory. Reference-only routes do not count as completed integrations. Original modules are retained for unresolved screens.

## Actual application changes

| Screen or state | Connected route and source | This checkpoint | Remaining limits |
|---|---|---|---|
| Customer Notifications | `/customer#notifications`; `webapp/screens/NotificationsScreen.tsx`, `connected/Notifications.tsx` | Original layout restored to the connected app; typed API list, pagination, real read action and reload persistence | Full nested visual acceptance remains open; content and timestamps intentionally reflect real disposable data |
| Business registration steps 1–8 | `/business/dashboard#onboarding`; `BusinessOnboardingScreen.tsx`, `connected/DraftOnboarding.tsx` | Original eight-step UI retained; private server draft, optimistic revisions, autosave status, retry, save before back/submit, contact validation, reload recovery | Application approval contract still submits the business name; other fields remain a private draft rather than a complete immutable application submission. Verification step retains its explicit preview; no biometric verification |
| Application recovery and approval | `/business/dashboard`; `connected/ApplicationRecovery.tsx` | Own applications listed from backend, real pending status, private encrypted document upload/download controls | Upload does not imply verification or approval; manual review infrastructure is not completed by this change |
| Real receipts | `/receipts/[id]`; `connected/Receipt.tsx` | Authenticated preview/download backed by customer-owned, verified payment and receipt/ledger evidence; link from succeeded hold status | Plain-text receipt; transaction-wide exports and complete original history/checkout UI restoration remain open |
| Customer demo checkout | `/demo-checkout`; shared `demo.tsx` and `demo-state.ts` | Explicit demo pending/failure/retry/success, reset and labelled downloadable receipt | In-memory only; no real history, bookings, tickets or balances; original real checkout path retained |
| Business demo payout | `/business/demo-payout`; same shared demo module | Explicit demo outcomes and downloadable confirmation; finance entry point | No settlement or fund movement; not a real withdrawal workflow |
| Merchant catalogue media | Dashboard → Menu → Edit catalogue media; `connected/Features.tsx` | Existing public-media contracts connected; complete replacement list editor | Uses approved HTTPS hosts; unpublish/edit rules remain server enforced; original nested vendor design acceptance still open |
| Merchant availability and ticket inventory | Dashboard → Reservations → Edit availability & ticket inventory | Slot activation and event capacity controls use existing contracts | Full calendar and all original nested operational layouts remain outstanding |
| Opening hours and packages | Dashboard → Settings → Hours / Packages | Multiple daily intervals, existing hours recovery, package components and public options | Connected operational controls; not claimed as full original visual migration |
| Reports | Dashboard → Settings → Reports | Authorized real all-time totals and 30-day order report, currency separated; fulfilled value explicitly distinct from settlement | Full original finance/report subview design preservation remains open |
| Merchant notifications/support | Dashboard → Settings → Notifications / Support | Scoped paginated lists, read actions, support creation/thread replies using existing operations queue | Full original settings and support presentation remains open |
| Login, Plan for Me and original onboarding text | Existing connected routes | Local contrast adaptations; original fixture defaults, geometry and palette backgrounds retained | Entire state inventory still needs accessibility verification |

No Admin, mobile, Android identity/signing, Azure or deployment code was changed in this continuation. Ride remains Coming Soon. No new assets were substituted; demo imagery is bundled original imagery and explicitly illustrative. Demo pages are reviewer simulations, not replacements for original checkout or finance screens.

## Backend and contracts

Recovered `WebCompletionModule`, migrations `0109`/`0110`, runtime grants, OpenAPI schemas, generated web types and BFF routes together. These cover drafts, private documents, owned real receipts, cart storage, hosted events/invitations, promotions, merchant reporting, notifications and support. Available endpoints do **not** establish that every corresponding original screen is restored. Cart/events/invitations/promotions interfaces and other Customer advanced continuation controls still require design adapters and browser acceptance. Existing Better Auth account guards, active membership and approval checks remain server-side. The BFF continues to exclude Admin and Ride operations.

Secure verification storage requires a server-only 32-byte `FAJI_VERIFICATION_ENCRYPTION_KEY`; absent configuration fails closed. Files have type-signature, size, count and ownership checks, authenticated encryption and no public media URL. No production key or service configuration was added. Deployment/migration execution remains outside this task.

## Acceptance status

**Unified web: mandatory gates not met. Flutter: mandatory gates not met. PR #31 must remain draft.**

The seven earlier reference-frame differences are still recorded in `unified-implementation/visual-differences.json`; they are not silently accepted or cleared by these connected captures. Original checkout, reservation/calendar, tickets/history, wishlist, settings/support, events/cart/offers/invitations and full nested vendor operational screens still need design-preserving connected adapters. Advanced search, plan quotes/add-ons, saved-plan revisions/feedback and review-history/deletion continuation remain unreconciled in this checkpoint. Browser QR camera scanning remains blocked from this reconciliation; manual server-confirmed ticket entry is retained.

Flutter and Dart are absent from PATH and the inspected SDK locations; `sdkmanager` and `adb` are also absent. Java exists. The supplied environment exposes no alternate Flutter-capable execution target and has approximately 188 MiB free on a 7.9 GiB filesystem before cache cleanup, insufficient for Flutter plus Android tooling. No native analysis, widget tests, before/after native captures or Android build was run or claimed. Original Flutter source and approved role-selection remain unchanged by this checkpoint.

Evidence and current verification results are recorded in `evidence/unified-connected-continuation`. Actual connected Notifications before/after captures at 390/768/1440 compare the prior generic integration with restoration of the original Figma layout; changing timestamps/content and the restored hierarchy are intentional. Original-source reference frames remain in the earlier evidence directory. These comparisons are not an assertion that all inventoried screens passed.

## Verification at this checkpoint

Application source commit: `f1f0a79` (API recovery `ccaaa4e`, optional-service reconciliation `429edd0`). Both web workspaces and NestJS passed lint and TypeScript. The unified Next.js production build (including the imported Business feature) and NestJS build passed. The standalone Business Next.js production build was not repeated; it is not a second public deployment.

197 unit/component tests passed (176 API, 9 Customer, 1 Business, 5 shared auth, 6 shared UI); seven disposable PostgreSQL integration tests passed. OpenAPI export, type generation and BFF route generation/check passed. Browser checks passed for shared sessions/authorization; eight-step onboarding including failed-save retry/reload/pending application; both demo flows without platform/provider requests; real notification read/reload; authorized receipt download; merchant editors/reporting/support. Database tests verify foreign receipt denial, stale drafts, encrypted owner-only uploads, merchant scope/revocation and invitation/cart isolation. They use disposable data and stubbed financial transport; no live provider calls or fund movement.

Sampled axe WCAG 2 A/AA and 2.1 AA checks have zero violations on eight actual routes: entry, login, Ride, Plan for Me, demo checkout, demo payout, authenticated Notifications and the authenticated onboarding entry. Animations finish before contrast measurement. This is sampled acceptance, not an accessibility audit of every nested state. Connected login/notification/plan text and onboarding controls have targeted contrast adaptations; original reference-mode colors and layouts remain available.

[Open the connected comparison gallery](evidence/unified-connected-continuation/comparison.html). Screenshots include 390/768/1440 connected notification comparisons, persisted onboarding and merchant reporting, plus explicitly labelled demo outcomes. Current logs, source commit and screenshot hashes are in that directory. The read-mutation browser test requires a disposable fixture with an unread notification and a verified receipt; regenerate disposable fixtures before repeating mutations. No private fixture credentials are committed.

Run the single public app with `pnpm --filter @faji/customer-web dev`, using the repository's documented local Better Auth/API environment. Business is reached at `/business` and `/business/dashboard` in the same host. Run browser tests only against the loopback disposable harness, with `FAJI_UNIFIED_TEST_DISPOSABLE=1`; merchant/receipt tests additionally require `FAJI_UNIFIED_TEST_FIXTURE_FILE`.
