# Unified application implementation — review checkpoints

**Latest: paused at user request.** See [the saved implementation checkpoint and exact remaining verification](UNIFIED_PAUSED_CHECKPOINT.md). Later work is intentionally marked WIP; older verification below is historical.

**2026-11-16 connected continuation:** [Implementation, screen status, evidence and remaining gates](UNIFIED_CONTINUATION_CHECKPOINT.md). This supersedes older outstanding-work statements for the recovered draft/receipt/reporting contracts and PR #30 reconciliation. Web and Flutter consolidation remain unaccepted.

This is application-code progress on **[draft PR #31](https://github.com/fajify1-ai/Fajify/pull/31)**, not completed consolidation or release approval. Main baseline: `98e0e0f1b23bebadbfcf3149716645154e5d746f`. PR #31's remote head was verified as `48468970d73bd9eabe76241801ea5d654ee7c6d2` before edits. PR #28 and PR #30 were not merged, overwritten or closed. No Azure, deployment, DNS/TLS, Android identity or signing changes were made.

## Implemented application boundaries

**One Next.js host:** `apps/customer_web`. It imports the preserved Business feature source through the workspace dependency `@faji/business-web`; `/business/*` does not proxy or link out to a second Next.js deployment. The original Business Next.js package remains available as source and for baseline tests. Keeping that package does not require a second public application.

The original Business entry was extracted into `apps/business_web/webapp/components/BusinessEntry.tsx` and reused by both the reference application and public route. Public actions use real login/registration/workspace routes, not the fixture dashboard.

The host has one Better Auth bridge and one platform bridge. The latter accepts only the existing Customer/Business contract audiences and still excludes Admin and Ride operations. NestJS remains authoritative for identities, approved merchant memberships, permissions and ownership. No new authentication service or Keycloak runtime was introduced.

| Running route | Application implementation | Behavior |
| --- | --- | --- |
| `/` | `apps/customer_web/unified/Entry.tsx`, `entry.module.css` | Approved three-choice entry composition, native-derived typographic wordmark, red/white palette, decorative corner/dots, bottom sheet and reduced-motion support |
| `/login`, `/register` | `unified/Authentication.tsx`, original `webapp/screens/CustomerAuthScreen.tsx` | Original imagery/layout/forms connected to existing Better Auth client; real failure/loading states and optional MFA challenge |
| `/customer` | `connected/Client.tsx`, `connected/CustomerApp.tsx` | Reused original landing/discovery modules and existing real API journeys |
| `/customer#planForMe` | `webapp/screens/PlanForMeScreen.tsx` | Separate six-step planning screen with existing saved-plan/recommendation adapter |
| `/customer#browsePlans` | `webapp/screens/BrowsePlansScreen.tsx` | Separate package browsing screen; Home planning-menu navigation retained |
| `/customer#restaurant/{branchId}` | Original `RestaurantScreen.tsx`, typed `VenueConfig` adapter in `CustomerApp.tsx` | Original hero/gallery/catalogue layout uses discovery detail/catalogue/reviews; item actions open real availability and save real wishlist items |
| `/customer#profile` | Original `ProfileScreen.tsx`, connected profile adapter | Real display name and sign-out; unavailable aggregate statistics show `—`, not fictional totals; existing portrait is labelled illustrative |
| `/customer#settings`, `#myTickets`, `#help`, other existing connected views | Existing PR #28 adapters retained | Real account, reservation/order/ticket, notification and support operations preserved; several layouts still need original-screen adaptation |
| `/business` | Unified Business entry using existing source logo, image and composition | Business login, account creation and workspace entry on the same origin |
| `/business/login`, `/business/register` | Original Business sign-in and shared credential adapter | One account/session; successful login goes to Business workspace; account creation does not grant merchant privileges |
| `/business/dashboard` | Server `requireIdentity('/business/login')`, imported `@faji/business-web/connected/client` | Existing real operational views; pending identities see approval/application UI, not a fixture merchant dashboard |
| `/business/onboarding` | Redirect to protected dashboard's onboarding state | All eight original registration steps retained. Verification's original sample-document/selfie layout restored with explicit preview/pending-approval notice |
| `/account-security` | Existing shared `SecuritySettings`, `deliveryDeferred` option | Optional TOTP/recovery-code and privileged reauthentication paths retained; phone delivery controls disabled |
| `/recover`, `/reset-password`, `/phone-login`, `/phone-recovery` | `unified/DeferredDelivery.tsx` | No delivery-submitting form and no claim that a message was sent |
| `/api/auth/*` | Existing Better Auth proxy plus public `delivery-policy.ts` | Deferred reset/email/phone transport routes fail closed with 503 before upstream forwarding; password/session/TOTP/backup-code routes preserved |
| `/ride` | Existing branded Coming Soon component | No trip/dispatch/driver/courier workflow or Ride API access |
| `/design-review/customer?screen=…`, `/design-review/business?screen=…` | Original retained fixture application modules | Disabled by default, guarded by middleware and server gate. Set `FAJI_DESIGN_REVIEW=1` locally for visual/interaction review only |

The public host uses one Tailwind compilation. Business-only browser layout rules are extracted verbatim to `apps/business_web/webapp/feature.css`, while its original stylesheet remains intact. A `data-business-experience` boundary prevents the Customer width adaptation from changing merchant onboarding, picker and scanner overlays. No approved screen was replaced to implement routing.

Validated sessions resume Customer and Business without another credential prompt. An existing Customer selecting Business registration goes directly to the merchant wizard under the same identity. Shared account-security navigation returns to the selected experience. Legacy `/#planForMe`, `/#browsePlans` and other recognized Customer fragments forward to `/customer`; deferred fragments lead to `/ride`.

A startup race in the inherited Customer hash router was fixed: after subscribing to hash changes it immediately synchronizes the current hash. This preserves deep links changed while the dynamically loaded Customer module is mounting. The Business wizard also subscribes to the onboarding hash so an existing session can enter registration directly.

## Preserved reference modules versus connected acceptance

The design-review route deliberately distinguishes **source preservation** from **production integration**. It is not an alternative real booking/payment/merchant system. It renders the original modules with fictional local state, a persistent review notice and no provider calls. Its enable flag is server-only; without it the route returns HTTP 404. Ride/delivery/tracking entry points, including the checkout ride action, lead to Coming Soon even in the unified reviewer entry. Original source implementations are retained.

The restored Customer sign-in, venue detail and profile compositions now have real adapters. Landing, discovery, Plan for Me and Browse Plans continue using their PR #28 adapters. The original Business sign-in and full eight-step onboarding are mounted in the unified host. Other approved Customer utility/checkout/history and Business operational compositions are still available in the gated review module while their connected adapters remain incomplete. **Those reviewer screens do not satisfy final connected-screen acceptance.** The real checkout/availability path still uses the inherited PR #28 form; it never manufactures a successful transaction.

Business onboarding currently submits only the contract-supported business name. Other registration details remain unsent local draft fields. Sample ID/selfie interactions do not upload documents, access a camera, verify identity or grant approval. Reload persistence, real verification uploads and application recovery from the protected continuation work still require reconciliation. The eight-step interface and full verification layout are preserved.

The native Customer app already includes `BusinessApp(embedded: true)` and the approved `RoleSelectionScreen`; those layouts and assets were retained. `apps/customer_mobile/lib/features/auth/presentation/screens/business_login_screen.dart` now revalidates the Customer session when exiting embedded Business, including after Business sign-out. An optional inherited scope lookup preserves standalone presentation harnesses. Native runtime acceptance remains blocked; this source change is not claimed verified by Flutter tests.

## Assets and intentional differences

- All original Customer/Business modules, imagery, fonts and animations remain in source. Business public assets required by the host were copied with byte-equality collision checks; the 31 overlapping paths had no conflicting bytes. No Vite setup or new UI framework was introduced.
- The new entry is a responsive web adaptation of the supplied image and existing native composition. Native status/navigation bars are not drawn into the web page. The web subtitle gray is minimally deepened to `#73737A` for contrast on `#FAFAFA`; native theme values remain untouched.
- Original planning colors and the original Business registration accent `#F59E0B` were recovered from the design branches where PR #28 had changed them. Existing reference contrast issues are reported below, not silently accepted or hidden by weaker tests.
- The live venue list contract supplies no list imagery; the existing bundled Fajify illustration remains the inherited fallback. Detail/catalogue media uses published venue media where supplied. Offering-level ratings and unsupported profile aggregate totals show `—`; no reviews or statistics are invented.
- For the live-venue screenshots, `media.fixture.test` deliberately serves the original bundled `ec7238b7cf1876f2.jpg` in the browser test transport. This is an explicit fixture-media substitution; the production adapter uses the published URL.
- Test screenshots contain disposable identities and fictional merchant records. No customer identity, balance, booking, ticket, payout or settlement is fabricated as a real successful operation.

## Verification and evidence

Evidence: `docs/engineering/evidence/unified-implementation/`. The machine-readable `verification.json`, `visual-differences.json`, screenshot manifest and individual logs distinguish passes, differences and blocked checks.

Completed checks include Customer and Business ESLint/TypeScript/production builds, 20 web/shared tests and 171 existing API unit tests. The lockfile was validated with an offline frozen lockfile-only install in a clean manifest workspace, preserving existing installed modules and local worktrees. No acceptance test was removed or weakened.

Real browser checks use a locally built NestJS API, Better Auth and the existing marked disposable PostgreSQL/PostGIS database. They cover original registration → real session → Customer profile; shared-session Business approval gate; approved merchant finance read and operational navigation; another customer's merchant finance denial (403); logout/account switching; optional-security route reachability; deferred delivery screens and the disabled review gate. No live provider keys, messages, charges, payouts or fund movements were used. The existing connected-browser suites also pass for pending and approved merchants and for Customer profile/support flows, including a real free reservation confirmed by Nest/PostgreSQL against the merchant-created test offering. Customer test selectors and routes were updated for the preserved forms and unified paths; the former separate-audience 404 check is now a backend-enforced foreign-merchant 403 assertion. Booking, ownership, required-field, profile, support and logout assertions were retained.

Original fixture walkthroughs are separate checks. The complete Business walkthrough exercises all eight onboarding steps, five-business switching, calendar/list and order transitions, catalogue creation/availability, service toggles, health detail, simulated QR valid/duplicate/invalid, profile/staff/support and payout review/confirmation. Nested after screenshots are paired with the original PR #31 baseline at matching 390/768/1440 widths. These verify retained UI interactions, not successful backend transactions.

There are **183 paired source-frame comparisons**: **176 pixel-identical**, with seven frames retaining only low-level differences (no differing pixel above eight RGB levels). All paired dimensions match. The remaining numerical differences are recorded and are not automatically accepted as complete visual regression approval.

Source-frame comparisons capture original design commits `ec3405f` and `b496c52` against the unified review modules at 390/768/1440 × 900. Review notices are hidden only during deterministic screenshot capture; their presence is checked separately. Comparison output records exact differing pixels and a diagnostic threshold of 8 RGB levels. **The diagnostic threshold does not auto-approve differences.** Live-adapter screenshots contain intentional server-data differences and are not falsely marked pixel-identical to fictional data.

Accessibility scans use axe WCAG 2 A/AA and 2.1 AA tags. The new unified entry and Ride page pass the sampled scan after contrast fixes. Original sign-in/planning/onboarding references still contain contrast issues; they remain blockers rather than being excluded from the scan. Nonvisual labels were added to the merchant onboarding back button. Actual browser MFA enrollment/challenge has not been verified. Full keyboard, screen-reader, animation and every nested error/loading state acceptance is not complete.

## Run locally

From the repository root, install with the repository's pnpm version and start only the public host:

```bash
pnpm install --frozen-lockfile
FAJI_API_URL=http://127.0.0.1:3001 FAJI_WEB_ORIGIN=http://localhost:3000 pnpm --filter @faji/customer-web dev
```

Use a matching configured local Better Auth/Nest service for live operations. Without it, the entry/Ride presentation still works and connected views show unavailable states. To inspect preserved fixture screens locally, add `FAJI_DESIGN_REVIEW=1`; never treat their fictional records as connected acceptance.

For the supplied disposable browser harness, use `FAJI_UNIFIED_TEST_DISPOSABLE=1`, `FAJI_WEB_TEST_ORIGIN` and `test/unified.browser.cjs`; merchant checks additionally require a private `FAJI_UNIFIED_TEST_FIXTURE_FILE`. Tests reject non-loopback origins. Original-source screenshot scripts expect original reference servers on ports 3055/3056 and the unified local HTTPS host on 3440. No private merchant-fixture credentials, database credentials or provider keys are committed. Registration tests use an obvious disposable test password in an explicit loopback harness.

## Outstanding work and explicit non-acceptance

1. Restore remaining original checkout/history/utility and full merchant operational subviews through contract adapters; their source preservation/reviewer reachability is not production completion. Finish every nested error, empty, filter, calendar, focus, animation and responsive state.
2. Reconcile the protected uncommitted continuation work: isolated payment/payout demos, pagination and advanced editors, onboarding drafts/recovery, verification uploads, receipts, health/reporting, notifications/support, cart/promotions/invitations/events. Its last review-history browser failure remains a verification gap. It was not overwritten or represented as finished work.
3. Reconcile independent PR #30 before final backend integration. The unified public bridge now disables delivery paths, but backend optional-service configuration and deferred native delivery flows still need independent acceptance. No changes were made to its branch or deployment work.
4. Resolve remaining reference contrast issues with design-preserving accessible adaptations and repeat all scans; do not claim accessibility or production readiness while they remain.
5. Finish visual acceptance for every inventoried state and all actual connected data/layout combinations. Any differing frame remains recorded for review; no missing screen is silently approved.
6. Flutter/Dart are unavailable in this supplied execution environment (`command not found`). Native original/before-after captures, static analysis, widget/integration tests, APK build and physical-device acceptance are specifically blocked. No web screenshot is substituted for native evidence. Customer Android application ID/namespace remain `com.faji.app`; signing configuration is untouched.
7. Branch-only native Operations, Staff and LiveWorkspace remain preserved on their original branches, pending Better Auth adapter reconciliation and a Flutter-capable environment. Admin stays independent; Ride stays Coming Soon.
8. Clean-room standalone artifact packaging, public preview DNS/TLS, deployment and device signing/distribution were not verified. This draft PR is not permission to merge or deploy.

Reviewable checkpoints on the same branch: PR #28 recovery, unified web host/adapters, native exit-session revalidation, then targeted preservation/regression fixes and evidence. Source checkpoints: `bfe8549` recovery, `1e40fd3` unified host, `95ee202` native exit revalidation, `4e72aa2` responsive/deep-link fixes, `673118c` shared original Business entry, `a6d9049` shared sessions/navigation, and `d065a79` Business wizard synchronization. The protected source worktrees and local WIP backup remain the rollback sources; reverting this branch's checkpoints never requires resetting those branches.
