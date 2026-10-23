# Fajify — Developer 3A Development Guide
## Milestone 1: Faji Business scaffolding

**Owner:** Developer 3A · **Application:** `apps/business_mobile/`  
**Prepared:** 23 October 2026 · **Status:** Repository-grounded guide, revised against all seven supplied screenshots.

### 1. The outcome you must deliver

Deliver an independent Flutter Business application that starts locally, presents consistent Faji branding, and lets a reviewer navigate the merchant onboarding, login, dashboard, reservations, orders, menu/services, earnings and profile screens using synthetic data. Include testable navigation guards, interchangeable mock service interfaces, environment configuration, platform assets, setup instructions and verification evidence.

This is the foundation milestone. Authentication is integrated in M2; live merchant onboarding, approval, catalogue, reservations and order operations are implemented in M3; authoritative payments and settlements belong to M5. M1 screens demonstrate those future journeys without claiming that backend transactions have occurred.

### 2. Repository grounding and current starting point

This guide was checked against `main` commit `bccbc5b30af93bb4c2437af4a939263b5e77d7c5` and Developer 2's open draft [PR #1](https://github.com/fajify1-ai/Fajify/pull/1), head `b3d85bbb41f9dd03e021ef58fac2c527db1ee203`. Refresh repository state before starting work; these revisions are the review baseline, not a permanent branch pin.

Read these files in order:

1. [Developer workstreams](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/engineering/DEVELOPER_WORKSTREAMS.md): the eight required 3A tasks.
2. [Milestone 1 scope](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/roadmap/MILESTONE_1.md) and [milestone acceptance gates](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/engineering/MILESTONES.md).
3. [Architecture](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/architecture/SYSTEM_ARCHITECTURE.md), [repository standards](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/engineering/REPOSITORY_AND_DELIVERY.md) and [backend integration contract](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/api/BACKEND_INTEGRATION.md).
4. [Parallel development rules](https://github.com/fajify1-ai/Fajify/blob/bccbc5b30af93bb4c2437af4a939263b5e77d7c5/docs/engineering/PARALLEL_DEVELOPMENT.md).

At the reviewed revision, Business has only a minimal `main.dart`, `pubspec.yaml` and README. Its manifest declares `faji_business`, Dart `>=3.5.0 <4.0.0`, `go_router: ^14.0.0`, Flutter tests and Flutter lints. Android, iOS and web runners have not been initialized. The three shared Flutter packages are scaffolds; their existence does not mean reusable components or clients are implemented.

**Developer 2 reference:** PR #1 imports the legacy customer app and records provenance. It is not evidence of accepted runtime behavior or a completed shared design system. Its customer entrypoint initializes Firebase and its manifest includes Firebase Auth/Firestore. Those legacy dependencies must not be copied into Business. Business targets Keycloak identity and the NestJS API backed by PostgreSQL; the mobile client never connects directly to PostgreSQL.

The parallel-development document currently says to branch from the migration integration branch while PR #1 is pending. Follow the team's current integration-base decision. If that instruction has not been superseded, use the current PR #1 branch as the feature base and keep the customer import out of 3A's own change set. Do not silently substitute a different base or merge PR #1 as part of this work.

### 3. Ownership and coordination

| Area | Owner / 3A action |
| --- | --- |
| Business screens, app-local state, routing, assets, tests and README | 3A owns `apps/business_mobile/` |
| Shared Flutter tokens, widgets, core and API client | Coordinate with D2 before modifying shared packages; agree exports and dependency constraints |
| API contracts, authorization semantics, PostgreSQL and migrations | D1 owns these; consume agreed interfaces and report missing contracts |
| Ride & Dispatch application | D3B owns this; do not create a second driver/dispatcher app |
| Imported customer source | Preserve it; propose shared extraction through a separate reviewed change |

Before coding, record the approved branch base, Flutter SDK version, development application identifiers, shared widget exports and initial route/session contract in the PR or app README. These are concrete coordination decisions, not reasons to stop independent app-local work.

Use `feat/m1-d3a-business-foundation` as the feature branch name. Keep commits limited to Business and agreed shared changes. No backend migration, infrastructure deployment or admin website work is needed for this milestone.

### 4. Step 1 — Establish a reproducible Flutter project

1. Fetch the repository, inspect the current branch/worktree and create the feature branch from the agreed integration base. Preserve any existing work.
2. Install the team-compatible Flutter SDK and record `flutter --version`, `dart --version` and `flutter doctor -v`. Resolve Android tooling for Android builds. iOS builds require macOS and Xcode.
3. Select a Flutter version whose bundled Dart satisfies the Business manifest and any shared package constraints. PR #1's customer manifest requires Dart `^3.13.4`; do not lower that requirement or upgrade every workspace just to bootstrap Business. Shared-package compatibility needs agreement with D2.
4. Initialize Android, iOS and web runners. Generate a temporary Flutter project first, using the approved organization identifier and project name `faji_business`; inspect and copy the required runner files into the existing app. Preserve the existing entrypoint, manifest and repository documentation. Review generated identifiers rather than accepting defaults as final company identifiers.
5. Add `analysis_options.yaml`, tests and a committed app lockfile. Resolve dependencies in Business and inspect the diff for accidental workspace changes.

Run from the repository root:

```bash
cd apps/business_mobile
flutter pub get
flutter analyze
flutter test
flutter devices
flutter run -d <device-id>
```

Replace `<device-id>` with a device listed by Flutter. Initially replace generated counter-app tests with a meaningful Business boot test. Record any unverified platform explicitly.

**Exit condition:** the Business app launches from its own entrypoint without importing customer application code or requiring backend services.

### 5. Step 2 — Create the application boundaries

Use this proposed app-local structure, adapting names to agreed team conventions:

| Directory | Responsibility |
| --- | --- |
| `lib/main.dart` | Read public configuration and compose dependencies; keep business behavior elsewhere |
| `lib/app/` | App widget, router, shell and dependency wiring |
| `lib/core/config/` | Environment parsing and validation |
| `lib/core/session/` | Session abstraction, merchant context and mock session |
| `lib/core/services/` | App-level service interfaces and mock composition |
| `lib/shared/widgets/` | Business-specific reusable widgets; generic widgets belong in agreed shared packages |
| `lib/features/<feature>/presentation/` | Screens, UI state and feature widgets |
| `lib/features/<feature>/domain/` | Small app-facing models and repository interfaces where needed |
| `lib/features/<feature>/data/` | Deterministic mock repositories and later API adapters |
| `test/` and `integration_test/` | Behavior tests and device/browser smoke flows |

Create features for onboarding, authentication, dashboard, reservations, orders, menu, services, earnings and profile. Avoid empty layers that provide no useful separation. Widgets consume repositories through interfaces; they do not embed HTTP calls or own global mock lists.

Choose a simple state approach compatible with D2's conventions. Use one approach consistently, dispose listeners/controllers, and make loading, data, empty and error states explicit. Adding a new state-management dependency is an implementation choice, not a roadmap requirement.

**Exit condition:** mock implementations can be replaced without rewriting screens or navigation.

### 6. Step 3 — Apply branding and shared components

PR #1 provides these reference tokens in `apps/customer_mobile/lib/core/theme/faji_colors.dart`:

| Token | Reference value |
| --- | --- |
| Primary | `#FA3F38` |
| Dark background | `#0D0D0D` |
| Dark surface | `#1C1C1C` |
| Primary text | `#FFFFFF` |
| Secondary text | `#7F7F87` |
| Dark border | `#303030` |

These are observed customer-source values, not a complete accessibility-approved Business specification. Check contrast, particularly secondary text. The customer theme names Arial but does not establish a bundled cross-platform font asset; use an approved available font or document the fallback. Use the seven supplied screenshots as the visual reference, with the screen specifications in section 14. Screenshot-derived dimensions are implementation starting points, not measured design tokens.

Agree with D2 on reusable buttons, inputs, cards, dialogs, loading indicators, empty/error states, typography and spacing. Use public package exports such as `package:faji_flutter_design_system/...` only after confirming the actual package name and exported symbols. Never import files from `apps/customer_mobile/lib/`.

If shared implementations are pending, build a small Business-local adapter and document its intended replacement. Avoid a competing permanent design system. Existing legacy code/assets require the recorded reuse-rights review before copying; use approved or original placeholders meanwhile.

Provide branding on launch and login screens, dashboard and app navigation. Configure icons/splash and asset declarations for the initialized platforms. Prevent a network image failure from breaking startup. Light/dark support is optional in the roadmap; one polished, documented theme satisfies the initial foundation.

**Exit condition:** every screen uses consistent components; narrow screens, text scaling and keyboard interaction remain usable.

### 7. Step 4 — Implement merchant navigation and guards

Use `go_router`. The following is a proposed UI route contract, not an API contract:

| Route | Purpose / access |
| --- | --- |
| `/` | Bootstrap and resolve the initial destination |
| `/onboarding` | Public introduction |
| `/login` | Public login shell with explicit demo-session entry |
| `/business-setup` | Demo merchant onboarding form |
| `/dashboard` | Merchant overview within the application shell |
| `/reservations`, `/reservations/:id` | List and detail |
| `/orders`, `/orders/:id` | List and detail |
| `/menu`, `/menu/:id`, `/menu/new` | Menu list, detail and local add-item form; match literal `/menu/new` before a dynamic item route |
| `/services` | Eight capability cards and local activation previews |
| `/scan` | Shared mock scan shell with reservation/order context; declare it before dynamic matching where relevant |
| `/notifications` | Header notification shell using synthetic messages |
| `/earnings` | Demonstration financial overview |
| `/profile` | Merchant profile and settings shell |
| `/access-denied` | Clear unauthorized-role state |
| Unmatched route | Useful not-found page with a safe return action |

Match the supplied five-tab navigation: **Home, Reservations, Orders, Menu, Services**. Home opens `/dashboard`; Menu and Services are separate screens with different responsibilities. View balance opens `/earnings`; the header settings icon opens `/profile`; the bell opens `/notifications`. On wide layouts use a navigation rail/sidebar with these same five destinations. Keep the chosen item synchronized with the active route, preserve sensible back behavior and avoid duplicate screen stacks.

Implement mock session states for signed out, merchant allowed, and authenticated without merchant access. A merchant context contains synthetic business/branch IDs and explicit mock capabilities. The exact backend role/claim mapping must come from D1 in M2; do not invent it from route names.

Guard private routes on direct entry as well as taps. Signed-out navigation goes to login; an unsupported role goes to access denied. Restore an intended destination only if it is a valid local app route and the current mock session allows it. Logout clears session-scoped data. Loading session state must not cause redirect loops or a protected-screen flash.

UI guards improve navigation only. NestJS remains responsible for authorization when live APIs arrive. Do not simulate production security with a locally stored role switch.

**Exit condition:** all listed journeys work through navigation and direct links, including signed-out and wrong-role cases.

### 8. Step 5 — Build each required screen shell

| Module | M1 behavior and visible content | Minimum states / interaction |
| --- | --- | --- |
| Onboarding/login | Faji Business introduction, sign-in explanation, labelled demo entry | Validation, disabled/loading controls, simulated failure; no claim of real login |
| Business setup | Business/contact/category/branch form and document placeholder | Required-field validation, mock draft/preview, clear demo completion; no real document upload or approval |
| Dashboard | Synthetic business name, summary cards, recent reservations/orders and quick links | Loading, populated, empty and error/retry states; quick links navigate |
| Reservations | Mock customer reference, date/time, party size and status; detail page | Filter/list/detail, unknown-ID state; any status demonstration is local and visibly labelled |
| Orders | Synthetic reference, items, amount and fulfilment status; detail page | Filter/list/detail and empty/error states; no live order acceptance |
| Menu | Six fixture menu rows, thumbnails, category, NGN price, availability switch and Add Menu | Add/edit local preview, image fallback, consistent count and switch state; no live publishing |
| Services | Eight business capability cards, active summary, switches and sample metrics | Four initially active; local enable/disable preview with derived summary count; no activation of backend integrations |
| Earnings | Labelled sample totals and sample history in NGN | Loading/empty/error states; no real payout, settlement or balance promise |
| Profile/settings | Synthetic business/contact/branch information and sign-out | Local edit preview or clearly labelled placeholder; sign-out returns to login |

Every visible action must either work within the demo or explain that the capability arrives in a later milestone. Avoid dead buttons and success messages that imply persistence. Label sample financial data and local state changes clearly. M1 does not require implementing the complete M3 operational state machine.

Use synthetic names and contact details. Keep fixtures deterministic and relationships consistent: dashboard links must open real fixture records; totals and displayed currency should agree. Store mock monetary values as integer minor units and format them at the UI boundary. Include enough fixtures to test populated and empty views without relying on random data or a live clock.

**Exit condition:** a reviewer can complete the walkthrough in section 11 without backend services.

### 9. Step 6 — Prepare auth, API and environment interfaces

Provide an app-facing session service, merchant-context service and repository interfaces for dashboard, reservations, orders, menu, services, earnings and profile. Names are implementation suggestions; behavior and replacement boundaries matter more than class names.

Mock repositories should support deterministic success, empty, delayed and failure scenarios, with retry behavior that can be tested. Document that mock models are UI fixtures, not published server DTOs. Add mapping boundaries for later server contracts.

The reviewed M1 backend contract provides `/api/v1`, health/readiness routes, correlation IDs and the error envelope `{"error":{"code":"...","message":"...","requestId":"..."}}`. It explicitly prohibits integration with speculative merchant, booking, payment or dispatch endpoints. Only implement live adapters after D1 publishes those contracts. Do not create guessed REST paths in this milestone.

Prepare Keycloak interfaces for M2's Authorization Code + PKCE flow, session restoration and logout. Keep actual identity-provider calls out of M1. Do not request or persist real user passwords, fabricate JWTs, store production tokens in preferences, or embed a client secret. The immutable identity subject will be Keycloak `sub` once real authentication is introduced.

Suggested public build configuration:

| Setting | M1 behavior |
| --- | --- |
| `APP_ENV` | `development` for the documented local flow |
| `USE_MOCK_SERVICES` | `true` for the runnable scaffold |
| `API_BASE_URL` | Optional public future base URL; document whether it includes `/api/v1` |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI` | Public placeholders reserved for M2; no invented working identity configuration |

Add a committed example configuration and ignored local override file if using `--dart-define-from-file`. Build definitions are visible in the compiled app and cannot carry secrets. An unsupported real-service configuration must fail with a clear explanation instead of silently granting a demo session. The standard mock build must make no live merchant/auth/payment requests.

**Exit condition:** the scaffold is fully usable offline with bundled fixtures; future adapters have documented interfaces and no guessed endpoints.

### 10. Step 7 — Verify the milestone

Automate the behavior most likely to break:

- Startup and dashboard navigation with a demo merchant session.
- Direct protected-route entry while signed out, wrong-role denial and logout cleanup.
- All required destinations and detail pages, including unknown IDs and invalid routes.
- Onboarding/form validation and prevention of repeated submission while busy.
- Loading, empty, failed and retry repository states.
- Small-screen layout and a larger text-scale smoke check.
- Five-tab state restoration, calendar month/day selection, order filters and local order-state previews.
- Six menu fixtures, image fallback, local add/edit/toggle behavior and derived item count.
- Eight service cards, initial four-active count, derived counts after toggles, and access to the bottom actions without navigation covering them.
- Reservation/order scanner context and mock results; no camera permission or real ticket redemption in M1.
- Repository/session substitution without network calls in the mock configuration.

Use widget/unit tests for routes and state; add an integration smoke flow for the main walkthrough. If using `integration_test`, declare the Flutter SDK dependency explicitly. A generated counter-app test is not useful evidence for this application.

Run from `apps/business_mobile` after implementing the screens:

```bash
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug
flutter build web
```

Include `integration_test` in the formatting check if that directory exists. Run the smoke flow on a supported target, for example:

```bash
flutter test integration_test/business_smoke_test.dart -d <device-id>
```

On macOS with Xcode, also run `flutter build ios --simulator` and launch the app in a simulator. Linux-based verification cannot establish an iOS build pass. Record iOS as unverified until the required macOS check is completed.

Apply the same explicit mock configuration to run/build commands if the implementation requires build definitions. Start no PostgreSQL, Redis or Keycloak containers for the M1 mock walkthrough. At repository root, run `pnpm structure:check` when Node/pnpm dependencies are available; it verifies structure, not Flutter functionality.

Review dependency changes and run the team's dependency and secret scans. Inspect the final diff for credentials, unrelated customer changes, generated build outputs and accidental binary additions. Record actual results; a command listed in documentation is not proof that it passed. If GitHub Actions is unavailable, attach local exact-commit evidence and identify any remaining gates.

### 11. Reviewer walkthrough

1. Follow the README from a clean checkout using the recorded SDK.
2. Start Business in mock mode with backend services stopped.
3. View onboarding, open login and enter the labelled demo merchant session.
4. Open dashboard and follow reservation/order quick links to their detail screens.
5. Visit all five tabs. Change the reservation month/day; open its list and detail; filter orders and preview a local status change.
6. Add a local menu item and toggle availability; toggle a service and confirm the active count updates. Open earnings through View balance and profile through settings. Exercise both mock scanner contexts.
7. Trigger empty and error scenarios using documented development controls; retry successfully.
8. Open a private deep link while signed out and verify redirection. Repeat with a wrong-role fixture and verify denial.
9. Sign out, use Back, and confirm private demo state is not exposed again.
10. Repeat the main journey on a narrow display and Flutter Web; refresh a nested web route using the supported local serving setup.
11. Inspect app icon/splash, text readability, keyboard/focus behavior and error messages.

### 12. Step 8 — Documentation, PR and handoff

Update `apps/business_mobile/README.md` with prerequisites, exact SDK version, platform/application identifiers, dependency setup, run commands, mock configuration, route table, feature layout, fixture scenarios, test/build commands and troubleshooting. Describe shared-package dependencies, what is local-only, and the interfaces D1/D2 must supply next.

Suggested commit sequence:

1. `chore(business): initialize Flutter platform runners and setup`
2. `feat(business): add branding, shell and merchant routing`
3. `feat(business): scaffold merchant modules with mock repositories`
4. `test(business): verify routes, states and scaffold walkthrough`
5. `docs(business): document M1 setup and integration handoff`

Open a PR titled **M1 · Developer 3A · Faji Business foundation** against the agreed integration target. Include scope, affected paths, base/head SHAs, screenshots, commands/results, dependency/secret review, D2 shared-package dependencies and D1 contract dependencies. State unverified platforms and unresolved issues explicitly. Do not merge or close other developers' PRs as part of this delivery.

### 13. Definition of done

- [ ] Independent Business app launches using documented setup.
- [ ] Android/iOS/web runners and application IDs are documented; supported builds have evidence and platform gaps are explicit.
- [ ] All required screens and detail routes are navigable with coherent fixtures.
- [ ] Home, Reservations, Orders, Menu and Services match the supplied screen hierarchy; menu items and platform services remain separate.
- [ ] Calendar, order filters, menu switches, service counts and contextual mock scanning pass their behavior checks.
- [ ] Visual comparison evidence covers all seven references; screenshot defects and browser framing are excluded.
- [ ] Branding, typography, reusable components, icons/splash and declared assets are in place.
- [ ] Signed-out, merchant and wrong-role navigation cases work without redirect loops.
- [ ] Auth/API interfaces exist; mock mode needs no backend or identity service.
- [ ] Loading, empty, error/retry and form-validation behaviors are covered.
- [ ] Formatting, analysis, relevant tests, builds and scans have recorded results.
- [ ] No real credentials, live financial effects or unapproved shared/customer changes are included.
- [ ] README, screenshots, verification evidence and M2/M3 handoff are ready for review.

The milestone is complete after the required delivery evidence is reviewed and accepted. Repository scaffolds, screenshots or planning checkboxes alone do not establish completion.

### 14. Screenshot-based implementation specification

The seven supplied images establish the Business visual direction. Apply their application content, excluding phone/browser chrome, address bars, black margins and page-scroll artifacts. They are static references: interactions specified below are M1 implementation guidance, not claims about a working reference application.

#### 14.1 Reference map

| Reference file | Screen | Implementation location |
| --- | --- | --- |
| `457536.jpg` | Business dashboard | `/dashboard` and shared merchant header/navigation |
| `457537.jpg` | Reservations calendar | `/reservations` with calendar/list modes |
| `457538.jpg` | Orders | `/orders`, filter chips and detail/local-action flow |
| `457539.jpg` | Menu | `/menu`, six fixture items and availability switches |
| `457540.jpg` | Services, upper section | `/services`, summary and first capability cards |
| `457541.jpg` | Services, lower section | Continuation of the same `/services` screen, including account actions |
| `457489.jpg` | Shared brand/role-selection screen | Brand reference and Business entry handoff with D2 |

The source images have been supplied separately. Preserve their filenames in the handoff so this table stays usable. Login, business setup, earnings and profile do not have dedicated screenshots here: implement them using the same component system and the roadmap scope, and identify them as inferred layouts in review material.

#### 14.2 Shared layout and visual rules

Use the near-black page background, charcoal rounded cards, red primary accents, white headings and readable muted secondary text. Use amber for preparing/pending, green for ready/confirmed and distinct capability accents where shown. Status must include text or an icon as well as color. Avoid copying the screenshots' very faint labels when contrast is insufficient.

For the first layout pass, use approximately 16–20 logical pixels of horizontal content padding, 12–16 between cards and 16–20 corner radii; refine these by visual comparison. These are proposed Flutter dimensions, not measurements extracted from the images. Keep touch targets at least 48 logical pixels and make text scale without clipping.

The merchant header contains an initial/avatar tile, business name and dropdown indicator, open-status indicator, notification bell and settings control. Use a synthetic display merchant such as “Demo Lagos”; do not imply that a pictured business is onboarded. Business selection uses synthetic contexts; changing context refreshes every page and prevents data from the previous business remaining visible. Open status is sample display state in M1.

Keep the header and five-tab navigation consistent. Place scrollable content between safe areas and add bottom padding so the final card and Log Out remain reachable. On Flutter Web, the application should adapt to the viewport rather than recreate the narrow application frame and large surrounding margins captured by the browser screenshot. Use an agreed wide-screen layout; screenshots specify the compact layout only.

#### 14.3 Home/dashboard — `457536.jpg`

Build the visible sections in this order:

1. Dashboard heading and fixture date.
2. Today's revenue card: ₦140,000, sample week comparison, View balance, available balance ₦320,000 and rating 4.8.
3. Today's capacity card: 8/12 tables, progress indicator and four tables available. Derive percentage from counts; round 8/12 consistently to about 67%.
4. Reservation and order summary cards.
5. Next tasks: pending booking confirmations and active orders, each linking to the relevant filtered list; derive the task badge from fixture tasks.
6. Quick actions: Scan QR, Add item, Withdraw.
7. Weekly revenue: ₦853,000, seven daily bars, day labels and the highlighted day; provide an accessible textual summary.
8. Upcoming bookings and View all, with date tiles, guest/party details and status badges.

View balance and Withdraw open the earnings shell; Withdraw shows an explanatory M1 preview without sending a payout request. Add item opens `/menu/new`. Scan QR opens a context chooser or defaults explicitly to reservation check-in. Booking cards open their matching details. All counts and financial labels must describe their fixture definitions: an available balance can differ from today's revenue, but dashboard/order lists must agree on active and completed counts.

Correct source inconsistencies rather than reproducing them: the dashboard says Saturday 30 August while the August 2026 calendar places the 30th on Sunday. Use an injected fixture clock/date, such as Sunday 30 August 2026, across screens. The Upcoming subtitle says confirmed bookings while a pending row appears below it; change the subtitle to “Upcoming bookings” or filter the rows to confirmed bookings.

#### 14.4 Reservations — `457537.jpg`

Include Scan Guest QR — Check-in, Calendar / All Reservations segmented controls, month navigation, a weekday grid with booking/capacity markers, selected-day styling, a capacity summary and an expandable reservation list.

M1 behavior:

- Previous/next month changes the calendar using real date arithmetic; weekday placement, month lengths and selected day remain correct.
- Selecting a day updates booking count, capacity/reserved/remaining values and the associated list. Derive progress from the same data.
- All Reservations shows the fixture list with simple status/date filters and links to details. Expanding View reservations exposes guest, party, time and status information.
- The QR action opens a mock scan flow for reservation check-in. Provide deterministic valid, invalid, already-used and failure results; a local “demo checked-in” preview never creates a real admission record.

The sample selected day shows capacity 40, reserved 6, remaining 34 and two bookings. Dashboard table capacity (8/12 tables) and reservation guest capacity (6/40 people) have different units; label them explicitly. Give booking-density markers accessible labels and distinguish them beyond color.

#### 14.5 Orders — `457538.jpg`

Include the order-recipient scan banner; horizontally scrollable filter chips for Active, New, Preparing, Ready and Completed; and stacked cards with item summary, synthetic customer reference, relative time, order reference, amount, status, View details and the appropriate local action.

Initial visible fixtures: New / ₦14,000, Preparing / ₦22,000 and Ready / ₦9,000, giving three active orders. Add completed fixtures only if required by the dashboard and keep the counts consistent. Use integer minor-unit amounts internally.

For the M1 demo, Accept changes New → Preparing, Mark Ready changes Preparing → Ready, and Complete changes Ready → Completed in the in-memory repository. Recompute filter counts and dashboard summaries, prevent duplicate taps while busy and leave state unchanged on simulated failure. Resetting the demo restores fixtures. This local sequence is a UI preview; D1 defines authoritative eligibility and state transitions in M3.

The order scanner uses recipient-verification context, separate from reservation admission. It must not imply payment verification or server authorization. M1 uses sample code entry or selectable fixture results; requesting camera access and implementing actual redemption are unnecessary for this scaffold.

#### 14.6 Menu — `457539.jpg`

Create six initial rows: Grilled Snapper, Jollof Rice, Suya Platter, Mocktail Pitcher, Champagne 750ml and Dessert Platter. Show category, price, thumbnail and a labelled availability switch. Preserve the screenshot's sample prices if using this fixture set: ₦22,000, ₦7,000, ₦12,000, ₦4,000, ₦45,000 and ₦8,500 respectively.

Add Menu opens a small validated form for name, category, positive price and availability. Save adds an item to the local repository and updates the visible item count. A row opens an edit/detail sheet or page; switches update local state and provide clear failure/retry behavior. Document that reset/restart may discard local changes.

The reference contains a broken Mocktail thumbnail and other image/content mismatches. Use suitable approved bundled images or neutral placeholders with a reliable error fallback. Do not reproduce a broken-image state as the default or depend on remote images for the offline demo.

#### 14.7 Services — `457540.jpg` and `457541.jpg`

This screen manages the visual preview of business capabilities, separately from menu items. Build a single scrollable screen with an active-count summary and all eight cards:

| Capability | Initial mock state | Visible reference content |
| --- | --- | --- |
| Table & Seat Reservations | On | This month 86; average value ₦34,000; red accent |
| In-Venue Ordering | On | Orders/week 142; via ordering ₦890,000; amber accent |
| Event Tickets | Off | Enable preview; purple accent |
| Delivery & Takeout | Off | Enable preview; green accent |
| Faji Ride Integration | On | Rides/month 34; ride revenue ₦289,000; blue accent |
| Loyalty & Rewards | Off | Enable preview; orange accent |
| Curated Date Packages | On | Sold/month 58; average value ₦75,000; pink accent |
| Gifting & Add-ons | Off | Enable preview; teal accent |

The initial summary is **4 of 8 active**. Derive it from the card model. A switch or Enable button opens a local confirmation/description preview and updates only mock capability state when confirmed; cancelling leaves the state unchanged. Make switch and button behavior consistent and keyboard-accessible. Show sample metrics on enabled cards without implying verified revenue.

Event tickets, delivery, rides, loyalty, packages and gifting are visual capability shells here. These screenshots do not expand 3A M1 into implementing those products, their integrations or their backend contracts. Record any capability without an agreed later delivery requirement as a product clarification for later planning.

At the bottom, show Switch to Customer App and Log Out. Log Out clears the mock session. Coordinate the customer handoff with D2: use an agreed external app/web link only when one is available; otherwise show an explanatory preview. Do not embed or rebuild the customer app, invent a working deep link, transfer demo credentials, or label a role switch as real authorization.

#### 14.8 Brand/entry screen — `457489.jpg`

The final image shows the shared Faji brand mark, “Plan. Book. Enjoy.”, supporting text, a primary user login action and Business/Ride entry cards. Use it to align branding and the entry handoff with D2. The screenshot's logo spells “fajy” while repository naming uses Faji/Fajify: retain the supplied artwork as a reference and confirm the approved logo asset with the product owner; do not silently redraw or rename the brand.

D2 owns the shared customer role-selection screen. 3A owns the Business destination and its independent launch/login journey. The Business app can use a brief branded splash without requiring customer or Ride navigation to be implemented inside it. An animated splash must not indefinitely delay access.

#### 14.9 Visual acceptance evidence

Capture the implemented application at a consistent compact viewport and compare the content hierarchy, five tabs, cards, spacing, state colors, labels and action placement against all seven references. Also check a wide Flutter Web viewport, keyboard navigation and larger text. Attach implementation screenshots to the PR with the source filename they correspond to.

Verify the Services screen reaches all eight cards and bottom actions, the order chip row scrolls, the keyboard does not obscure forms, and fixed navigation does not cover final rows. Document deliberate corrections to source defects: unreadable contrast, incorrect date labels, clipped text, broken thumbnails and inconsistent fixture counts. No app code has been implemented or tested merely by publishing this guide; its checks are the developer's delivery requirements.
