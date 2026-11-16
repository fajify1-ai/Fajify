# Customer and Business web integration — review build

**2026-11-16 connected continuation:** [Implementation, screen status, evidence and remaining gates](UNIFIED_CONTINUATION_CHECKPOINT.md). This supersedes older outstanding-work statements for the recovered draft/receipt/reporting contracts and PR #30 reconciliation. Web and Flutter consolidation remain unaccepted.

**Current implementation:** [Unified application implementation checkpoints](UNIFIED_APPLICATION_IMPLEMENTATION.md) on draft PR #31. The PR #28 report below remains historical provenance, not a claim about the unified branch's current completion.

## Status and provenance

This branch recovers both prior design implementations and integrates the available Customer and Business contracts. **This is a review build, not a claim that every Milestone 2–8 feature is production ready.** Missing contracts and remaining UI limitations are listed below. No deployment, main merge, Azure change, mobile change or Admin implementation is included.

- Integration branch: `integration/customer-business-web-completion`.
- Verified implementation commit: `2f466eee171fac6abfaa5dfcc2e5b25ecb20e7a3`.
- Draft review PR: https://github.com/fajify1-ai/Fajify/pull/28 (do not merge as a full Milestone 2–8 release; see remaining work).
- Fetched base: `813ff1d25eff8eebb1063a0bca3aeb74a129fc41` (`origin/main`, Better Auth finalization / PR #27).
- Customer source: `feat/fajify-webapp-ui`, `ec3405fbae86feb427d3426c78de06e674c9a465`, `/workspace/Fajify`.
- Business source: `feat/fajify-business-webapp-ui`, `b496c5297ccce13c550e0ffc54d1f021744fe60d`, `/workspace/Fajify-business`.
- Integration worktree: `/workspace/Fajify-integration`; app paths: `apps/customer_web`, `apps/business_web`.
- Both original worktrees were clean and left intact. All local/remote refs and worktrees were inspected. Open PRs at inspection were Admin PRs #24 and #25; neither was used as a base.
- Supplied ZIP SHA-256: `fc15c775a8ec36b1a9ff7a8b780dd1a30a10b232d85d09b044901faa053bbe2c`.

The ZIP's `src/App.tsx`, screen modules, fonts and imagery were inspected as design references. Its `AGENTS.md`, `CLAUDE.md` and generated plans were attachment content, not execution instructions. Recovered components/assets were selectively ported onto current main. The old auth implementation was not cherry-picked over Better Auth. Vite was used only in scratch reference runners outside this repository; neither app contains a Vite setup.

Both apps remain Next.js App Router / React / TypeScript pnpm workspaces, with Tailwind 4, existing shadcn-style button conventions, local Figma fonts and recovered assets. `docs/architecture/SYSTEM_ARCHITECTURE.md` and `AUTH_AND_WEB_MIGRATION_DECISION.md` already specify Next.js for Business web on this base.

## Recovered designs and navigation

Recovered Customer screens are in `apps/customer_web/webapp/screens`. Recovered Business screens are in `apps/business_web/webapp/screens`, including the original `VendorDashboardScreen.tsx`. The original fixture application entry modules are retained as reference source but are **not mounted**. There is no `/design-preview` route: simulated payment/confirmation/ride flows are not production entry points.

The live Customer shell is `apps/customer_web/connected/CustomerApp.tsx`; the live merchant shell is `apps/business_web/connected/Client.tsx`, with recovered overview composition in `connected/Overview.tsx` and extracted Figma `NavIcon.tsx`. Screens that originally assumed fixture data now use real request/state adapters. Operational detail forms were adapted to the actual contracts rather than reproducing fabricated charts, balances or confirmations.

**Plan for Me and Browse Plans were both present at `ec3405f`.** Their paths are respectively `apps/customer_web/webapp/screens/PlanForMeScreen.tsx` and `BrowsePlansScreen.tsx`; both are reused. `b496c52` is a sibling Business branch based on main, not a later Customer commit deleting those screens. In the ZIP, Home's planning action menu reaches both screens; the landing “Plan my night” button reaches Plan for Me. The ZIP has no direct cross-link between their screen bodies. This integration retains those entries and adds persistent navigation links between them.

Run Customer, open `/`, then use **Plan for Me** or **Browse Plans** in the navigation. Direct URLs are `/#planForMe` and `/#browsePlans`. Discover → `+` → Plan For Me / Browse Plans also works. Hash navigation supports browser back/forward. Sign in is required by Nest when saving a plan or making a booking; public discovery remains public.

## Customer inventory

“Connected” means a real existing contract is used; it does not imply live provider credentials were available during verification.

| Screen / journey | Live implementation and how to reach it | Status |
| --- | --- | --- |
| Landing / product entry | `webapp/screens/LandingScreen.tsx`, `/` | Recovered layout, real account links; Business entry information; Ride entry Coming Soon |
| Registration / sign-in | `connected/AuthPage.tsx`, `/register`, `/login`; shared `@faji/web-auth/form` | Real Better Auth email sessions; no demo bypass |
| Recovery / reset / phone | Same shell, `/recover`, `/reset-password`, `/phone-login`, `/phone-recovery` | Existing auth flows retained; delivery requires configured SMTP/SMS |
| Optional MFA / account security | `/account-security`, shared `@faji/web-auth/security` | Existing enrollment, challenge, recovery and step-up flows retained |
| Onboarding / introduction | ZIP `OnboardingScreen.tsx` retained | Landing and real account creation replace the fixture introduction path |
| Discovery / search / filters | `HomeScreen.tsx`, nav Discover / `#home` | Live venues, text query and offering-type category filters; no fabricated open status |
| Venue / business details | `CustomerApp.tsx` `Venue`, click a discovery card | Live public profile, media, reviews and catalogue |
| Catalogue / event details | `CustomerApp.tsx` `Offering`, venue → View availability | Live offering, pricing, current slots and capacity |
| Plan for Me | Reused `PlanForMeScreen.tsx`, `#planForMe` | Six-step design → POST saved plan → live recommendations; honest no-match/error states. A budget range is required; flexible-budget recommendations are unavailable |
| Browse Plans | Reused `BrowsePlansScreen.tsx`, `#browsePlans` | Live published packages; booking opens current offering/availability |
| Saved plans | `CustomerApp.tsx` `SavedPlans`, My account → My plans | List, refreshed recommendations, archive; advanced revision editing/feedback not yet exposed |
| Reservations / calendar | `Offering`, select available slot and guests | Free reservation POST or paid hold; only server response can confirm a reservation |
| Orders / checkout | `Offering`, eligible product → Place order / Prepare payment intent | Server-priced order creation and status; current order-intent contract disables checkout and UI states this |
| Paid booking / event checkout | `Offering` → hold → receipt email → secure checkout | Real hold/payment-intent/checkout contracts; allowlisted HTTPS provider redirect only when backend enables it |
| Confirmation | Server status in `Offering`, `Payment`, bookings | No local confirmation screen can manufacture a successful booking/payment |
| Booking/order history | `Account`, nav Bookings & orders / `#myTickets` | Real lists, cancellation requests, holds and payment verification status |
| Tickets | Same page | Real ticket list and server-issued eligible QR token rendering; no synthetic QR |
| Payments / refunds / receipts | `Payment`, `Refunds`, Bookings & orders | Status/recheck, refund request/status; receipt download/export has no published customer contract |
| Profile / settings | `Account`, My account / `#profile`, `#settings` | Display-name update; security links and real sign-out |
| Wishlist | My account → Wishlist / Home's Wishlist navigation | Live offering save/remove/open; venue fixture-heart toggles are suppressed in live discovery |
| Notifications | My account → Notifications | Live notifications and read mutation |
| Reviews | Venue reviews; completed reservation / fulfilled order → review | Public reviews and verified review create/update; separate review-history/delete editor is not exposed |
| Support | My account → Support / `#help` | Create case, read/reply to thread, close case |
| Cart / global cart | ZIP `CartScreen.tsx`, `GlobalCartScreen.tsx` retained | No persisted cross-business cart contract; explicit unavailable state, individual-item order path connected |
| Offers / invitations / create-event | Original source screens retained | Contract-blocked state; no fake discount, invitation or event is submitted |
| Transportation / delivery / tracking | Original source retained, visible entry → Coming Soon | Deferred; no ride, tracking or dispatch API access |

Customer list endpoints currently render the returned page; “load more”/deep pagination is a remaining UI task. Discovery image fallback is illustrative when a list response supplies no media. Advanced proximity and availability filtering, package add-on quotation controls, editable saved-plan revisions and full cart composition remain UI work against existing contracts. The live account/booking detail layouts are adapted cards, not a pixel-identical rendering of the fixture checkout/history screens.

## Business inventory

| Screen / journey | Live implementation and how to reach it | Status |
| --- | --- | --- |
| Business entry | `app/page.tsx`, `/` | Branded entry, account and workspace links |
| Sign-in / registration / recovery | `connected/AuthPage.tsx`, existing account routes | Real shared Better Auth, no separate merchant credential store |
| Eight-step onboarding | Reused `BusinessOnboardingScreen.tsx`, dashboard → Register a business | Original category/services/scale/contact/business/verification/location/review sequence; only supported business name is submitted |
| Approval status | `connected/Client.tsx`, `/dashboard` without approved membership | Real application result/status; existing-reference lookup; pending never escalates to merchant access |
| Merchant dashboard | `/dashboard` with server-verified approved membership | Live overview, payable balance and capacity; no fixture health/revenue chart |
| Business switching | Dashboard business selector | Only approved memberships from `/auth/me`; strongest current membership selected per business |
| Branch switching / management | Branch selector; Settings → Branches | Scoped branch list/create, name/contact edits, activation/deactivation |
| Business public profile | Settings → Profile | Existing summary/city/public-phone update; secure verification uploads absent |
| Catalogue / menus / pricing | Menu | Scoped catalogue, create item, name/price edit, publish/unpublish; prices entered in NGN |
| Availability / capacity | Reservations → Schedule capacity | Real slot creation, remaining/reserved visibility; slot editing/deactivation and ticket-inventory editor remain UI work |
| Reservations / check-in | Reservations | Real reservation list; legal server state transitions; QR token redemption is a separate existing ticket operation |
| Orders | Orders | Real order list and legal status transitions; no courier assignment or tracking |
| Services / experiences | Services → experiences; Settings → Packages | Event dates/capacity and package component replacement; catalogue-based selection rather than JSON input |
| Weekly opening hours | Settings → Hours | Read/replace weekly hours with day/time controls; editor supports one interval per day, so review existing split-day schedules before replacing |
| Staff access / roles | Settings → Staff | Existing identities only; owner grants/revokes manager/staff access, exact branch scope on revocation; Nest enforces authority |
| Financial overview / transactions | Home → View transactions / Settings → Finance | Read-only payable/debt/payment/settlement visibility from merchant finance contract |
| Payout execution | Finance notice | No merchant settlement execution contract; Admin payout endpoints are not called |
| Ticket QR check-in | Services → Redeem server-issued ticket | Real token redemption, no simulated successful check-in; camera capture remains unimplemented |
| Notifications / support / reports / health | Corresponding Settings entries / dashboard health card | Merchant-specific contracts absent; clear dependency states, no invented metrics or cross-domain Admin calls |
| Security / account | Header Security, `/account-security`, Sign out | Shared real optional MFA/session features |
| Courier / delivery / dispatch | Services → Coming Soon | Deferred; no assignment, driver tracking or delivery management |

The recovered fixture dashboard contains additional visual configurations, promotions and payout simulations. They remain unserved reference code. The connected dashboard restores the recovered two-column overview order, typography, rounded cards, navigation icons, capacity progress, task cards, quick actions, mobile bottom navigation and desktop rail. It does not claim complete pixel parity with every fixture subview. Contact/location/service selections in onboarding are explicitly unsent drafts; the API currently accepts `{displayName}` only. No documents/selfie are represented as verified. Reopening the wizard does not persist unsent drafts.

## Backend integration and security boundary

- `packages/web_auth` remains the sole shared web auth implementation. Its auth logic/routes/security handlers are unchanged; this branch only exports its existing configuration helper for reuse.
- Both server dashboards still call `requireIdentity()`. Business additionally uses verified `memberships`, not a browser-selected merchant role. Nest rechecks account, approval and resource scope on every operation.
- `packages/web_ui/contracts.ts` is generated from the current OpenAPI contract. Merchant controllers still return unannotated SQL rows; `types.ts` follows their existing service fields and calls out this limitation.
- `/api/platform/[...path]` is a same-origin BFF to one configured API origin, not a new backend or auth service. Only existing audience-allowed contracts are forwarded. Admin and all Rider/Dispatch/integration paths are excluded. `routes.json` is reproducible from OpenAPI with `generate:routes` / `check:routes`.
- Only Better Auth cookies are forwarded. Browser Authorization, forwarding and trusted identity headers are discarded. Mutations require the exact configured Origin. Redirects are refused, failures sanitized, and responses are `no-store`. Nest remains authoritative for authorization and data validation.
- Booking/order prices, capacity and state come from Nest/PostgreSQL. Checkout does not navigate unless the backend explicitly enables it and returns an allowlisted HTTPS gateway URL. Holds are not confirmations. Order-intent `checkoutEnabled:false` is displayed as unavailable. Payment recheck never marks a payment successful locally.
- Refund retries keep the same request key while their payload is unchanged. A request is not presented as a processed refund. Existing backend payment tests use isolated provider transports, not live credentials.
- Existing Paystack checkout is consumed where available. No Flutterwave backend adapter, payment webhook or provider integration was invented. Optional SMTP/SMS/MFA and media host configuration remain deployment dependencies from main.
- All database acceptance writes and browser tests used uniquely named, marked **local disposable PostgreSQL 16/PostGIS** databases with a separate restricted runtime role. No external database or Azure service was contacted.

### Dependencies and remaining work

1. **Contract blockers:** full merchant onboarding/contact/location/services persistence and secure verification uploads; merchant health/analytics/reports/notifications/support; customer receipt/download/export; persisted cross-business cart/promotions/invites/customer-created events; merchant-operated payout execution. Pending application recovery currently requires its reference because there is no application-list endpoint.
2. **Existing-contract UI gaps:** full pagination, advanced search/proximity/plan quote/add-on controls, saved-plan revision editing/feedback, review history/deletion, merchant catalogue media editing, slot edits and ticket-inventory controls, multi-interval hours editor, camera QR capture. These are not mislabeled as missing backend endpoints.
3. **Release/configuration blockers:** approved test merchant provisioning, real SMTP/SMS configuration, configured secure API/web origins, approved public media hosts and provider keys/callback/webhook/worker setup. No real provider checkout, receipt delivery, payout or production authentication delivery was verified in this task.
4. **UX differences:** connected operational/account views adapt the recovered layout to real contracts; full screenshot parity across all original fixture subviews is not claimed. A production launch needs another design acceptance pass on populated realistic merchant/customer data.
5. **Rider/Dispatch:** deliberately deferred. Only `apps/ride_dispatch_web/app/page.tsx` was changed to branded red/white Coming Soon. Existing auth/backend/mobile routes and prior code are retained; nothing new links into them.

## Assets and visual verification

Local logos, exported SVG icons, imagery and Inter/Poppins font assets were recovered from the two design branches. The historical mappings remain in each app's `webapp/asset-manifest.json` and `asset-substitutions.json` (Business also has `font-manifest.json`). They record the earlier replacements for unavailable export URLs, including illustrative food SVGs. Those original fixture-only assets remain reference material.

Live discovery list and planning cards use the recovered local dining photograph `/reference/ec7238b7cf1876f2.jpg` as an **illustrative fallback** because those list/recommendation DTOs do not supply images. Venue/offering details prefer real published media. Sign-in illustrations use local recovered Customer `2b62efd44783a784.jpg` and Business `d2aaaff55cdcccab.jpg`. No new externally generated brand asset was substituted.

The original bright Fajify red remains in branding. Selected primary controls use a darker red for AA text contrast; onboarding's old amber accent was changed to red to follow this assignment's red/white requirement. Light planning helper text was darkened. These are intentional accessibility/branding differences.

Representative screenshots in `evidence/customer-business-web/` cover 390, 768 and 1440 px. Export comparison images were captured from separate scratch Vite runners, never from a new Vite app in this repository. Customer planning was checked for type, spacing, cards and action order; merchant comparison documents the connected dashboard's changed data/metrics presentation. This is representative comparison, not an automated pixel-equality assertion for every screen.

## Running and verification

Use Node >=20 and repository-pinned pnpm 9.15.9:

```sh
pnpm install --frozen-lockfile
FAJI_API_URL=http://localhost:3001 FAJI_WEB_ORIGIN=http://localhost:3000 pnpm --filter @faji/customer-web dev
FAJI_API_URL=http://localhost:3001 FAJI_WEB_ORIGIN=http://localhost:3003 pnpm --filter @faji/business-web dev
```

The API must use the existing Better Auth/database configuration and trust those development origins. API setup/migrations and optional providers follow the existing backend documentation. Public pages render with service-error states when the API is unavailable. No success fixtures are silently substituted. Production requires HTTPS as enforced by existing auth configuration; explicit internal HTTP is permitted only through the established `FAJI_ALLOW_INTERNAL_HTTP` setting.

Checks:

```sh
pnpm --filter @faji/customer-web lint
pnpm --filter @faji/customer-web typecheck
pnpm --filter @faji/customer-web test
pnpm --filter @faji/customer-web build
pnpm --filter @faji/business-web lint
pnpm --filter @faji/business-web typecheck
pnpm --filter @faji/business-web test
pnpm --filter @faji/business-web build
pnpm --filter @faji/web-auth test
pnpm --filter @faji/web-ui test
pnpm --filter @faji/web-ui check:routes
```

ESLint checks connected production code, routes, components and helpers; recovered legacy fixture modules are typechecked by Next but excluded from new ESLint enforcement. Next currently emits its advisory that the Next-specific ESLint plugin is absent; ESLint/TypeScript/production builds are still required to pass.

Browser scripts are `apps/customer_web/test/connected.browser.mjs` and `apps/business_web/test/connected.browser.mjs`. Set `CUSTOMER_WEB_TEST_URL`, `BUSINESS_WEB_TEST_URL`, `CHROMIUM_PATH` and optionally `WEB_EVIDENCE_DIR`. **These scripts create accounts/applications/data and must target a disposable local backend only.** Business approved-workspace testing additionally accepts a disposable `BUSINESS_TEST_EMAIL` / `BUSINESS_TEST_PASSWORD` provisioned outside the UI; the UI never approves itself. The verification run used loopback HTTPS with a disposable self-signed certificate and trusted browser test context.

Recorded test outcomes and scope are in `evidence/customer-business-web/verification.json` and accompanying text logs. A local test setup first lacked current runtime grants and the required isolation sentinel database; those were corrected before the passing domain reruns. A concurrent build attempt produced a generated-file race; final verification runs the app builds sequentially. Browser testing caught and fixed landing-navigation overlap and recovered onboarding's server-side `window` access. No live payment/provider or production readiness claim follows from these checks.

## Unified application preservation checkpoint — 2026-11-16

The historical report above describes PR #28, not completed consolidation. The approved target is now `docs/architecture/UNIFIED_CLIENT_EXPERIENCE.md`. See [UNIFIED_APPLICATION_PRESERVATION.md](UNIFIED_APPLICATION_PRESERVATION.md) and [the screen matrix](UNIFIED_SCREEN_PRESERVATION_MATRIX.md) for the new branch's inventory, screenshots, rollback plan and blockers. PR #28, its original designs and its uncommitted continuation work have not been overwritten. No application migration has passed acceptance. Email/SMS-dependent recovery must be disabled safely in the unified implementation, subject to reconciliation with independent PR #30; the historical delivery-dependent links above are not release approval.
