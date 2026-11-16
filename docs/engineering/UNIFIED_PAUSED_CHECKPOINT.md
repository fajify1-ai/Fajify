# PR #31 — paused implementation checkpoint after 23a0219

**Paused at the user's request to conserve credit. This is work in progress, not completed consolidation or final verification. Keep PR #31 draft.** Branch: `integration/unified-application-preservation`. No merge, deployment or Azure change was performed.

## Implemented in this continuation

- Full eight-step merchant submission: the existing onboarding endpoint accepts an optional saved-draft revision. The server validates category, services, scale, contact, business and location information, stores an immutable submission snapshot transactionally, and deduplicates identical retries. Subsequent draft edits do not change the submission. Identity verification remains explicitly `not_reviewed`. Legacy name-only clients remain supported and produce no full snapshot.
- Authorized application review: added `GET /api/v1/admin/governance/approvals/:id` under the existing Better Auth, fresh privileged-session, Admin scope, rate and read-audit guards. No Admin frontend was modified. Pending submission grants no merchant membership; existing approval restrictions remain enforced.
- Migration `0111_business_application_submissions.sql`, restricted runtime grants, typed review responses, OpenAPI regeneration and corresponding web adapters.
- Original Customer wishlist, reservation calendar, checkout, bookings/history/detail, cart, promotions, gathering creation, invitation and event-detail compositions now have connected adapters. Reference implementations remain intact through optional props; no new framework or authentication system was introduced.
- Calendar and checkout use real availability/reservation/hold endpoints. Sample cards, bank instructions and ride workflows are not activated in the connected checkout. A real confirmed free reservation uses the original success animation. Only server-issued admission tokens render a QR.
- Cart quantity/removal persistence and actual published media/branch names; unsupported combined cart checkout remains explicitly disabled. Existing individual-product ordering remains available through the offering screen. No artificial fees or fabricated payment success are introduced by the connected cart.
- Advanced search/proximity, plan filters/quotes/add-ons, saved-plan revisions/feedback and review-history/deletion controls were ported into the connected application. Their complete browser regression is outstanding.
- Private gathering/invitation API adapters, scoped event detail and public event inventory read contract. Creating/accepting a gathering does not create merchant bookings or paid tickets. Invitation sign-in return targets are restricted to local validated token fragments.
- Original Business Settings was extracted into a reusable component and reused by both the original dashboard and connected workspace. Existing operational tools remain reachable. Full original nested merchant operational presentations are still unfinished.
- Scoped shared CSS prevents generic workspace styling from overriding restored original-screen typography. Connected contrast adaptations retain the reference defaults.
- Exact Flutter/environment/Android acceptance commands and requirements are documented in `UNIFIED_NATIVE_ACCEPTANCE.md`. No Flutter application source, Android identity or signing configuration was changed.

## Verification actually performed

- A fresh marked disposable PostgreSQL database run passed **nine integration tests**, including concurrent/idempotent full submission, immutable snapshots, authorized scoped Admin review, pending approval denial, published wishlist/cart media and customer isolation. A tenth public-event-inventory test was added afterward and **has not been run**.
- **12 Customer unit/component tests passed** at the latest recorded unit run, including safe invitation return targets, exclusion of sample financial/ride data from connected checkout, and actual-slot calendar rendering.
- **176 existing API unit tests passed** earlier in the continuation. The newly added submission-validator unit test has **not** yet been run in the full API suite.
- Intermediate API/web lint, typecheck, production builds and contract generation passed. There were additional application/CSS/routing changes afterward, so **the final tree has not received a complete lint/typecheck/build run**. Do not reuse intermediate results as final acceptance.
- Browser checks passed for the eight original onboarding steps, save failure/retry, reload recovery and pending application; merchant media/hours/reporting/support navigation; wishlist persistence and media; cart quantity persistence; original calendar → checkout → actual confirmed reservation and original animation; original history/detail without a fabricated QR.
- The expanded browser run then stopped at a **strict locator failure**: `Adapter merchant offer` matched two synthetic promotion titles from repeated fixture creation. This is a test-fixture/assertion issue requiring unique fixture names or scoped assertions; do not simply remove the check. Gathering/invitation acceptance steps later in that runner were not reached.
- Actual connected screenshots at 390/768/1440 are saved for wishlist, cart, checkout, history/detail and public event detail. These are intermediate captures and do not approve every state.
- Seven legacy reference frames were recaptured. Several matched exactly; tiny RGB edge variations moved between repeated captures. Exact metrics and originals remain recorded. The same-source control extension was prepared but not run. **The seven differences are not declared resolved or approved.**
- Expanded nested accessibility checks have not yet been completed for this final tree. Prior checkpoint accessibility results remain historical.

Evidence: `docs/engineering/evidence/unified-next-checkpoint/`. `PAUSED.json` explicitly marks the partial run. Private fixture credentials, database connection strings and runtime logs containing configuration are outside Git.

## Resume in this order

1. Read this checkpoint and inspect the current PR head/worktree; preserve PR #28, PR #30 and their independent work.
2. Run final lint/typecheck and production builds for the unified host, Business feature workspace and API. Regenerate/check OpenAPI and BFF routes after any contract changes.
3. Run API units including `onboarding-submission.test.ts` and all **ten** web-completion database tests in a fresh, explicitly marked disposable database with separate owner/runtime grants. Do not weaken authentication budgets to accommodate repeated fixtures.
4. Give browser-created promotion fixtures unique titles or scope the assertion to the created promotion. Rerun `connected-adapters.browser.cjs` with `FAJI_UNIFIED_TEST_DISPOSABLE=1` and a private `FAJI_UNIFIED_TEST_FIXTURE_FILE`, then finish gatherings/invitations and sign-in return/MFA regression.
5. Complete advanced planning, review deletion, product ordering, paid-hold failure/pending, real receipt access, merchant scope and demo-isolation browser tests. Keep live provider credentials absent.
6. Finish nested accessibility and before/after connected comparisons. Run `seven-visual-recheck.browser.cjs` only with the original reference servers on 3055/3056 and the opt-in review host on 3440; retain both exact metrics and same-source controls. Do not mask or silently accept remaining differences.
7. Complete remaining original Customer settings/support and merchant nested operational adapters. History still uses some IDs/creation timestamps because current contracts lack full booked-item presentation metadata; these are explicitly labelled, not fabricated scheduled times. Public event/private gathering paths and all new error/empty states need final review. Combined cart checkout remains unavailable.
8. Native acceptance requires the Flutter/Android environment described in `UNIFIED_NATIVE_ACCEPTANCE.md`. No native acceptance is claimed here.

**Web and Flutter acceptance gates remain unmet. No permission to merge or deploy is implied by this checkpoint.**
