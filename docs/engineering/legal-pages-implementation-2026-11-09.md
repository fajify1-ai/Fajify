# Fajify legal pages — implementation and release review

## Delivery status

Implemented in-app Terms of Service and Privacy Policy pages in the existing Flutter light theme. Both documents are explicitly **drafts awaiting business and legal approval**, with no effective date and `Last updated: Pending approval`. The Terms contain all 19 requested sections; the Privacy Policy contains all 20 requested sections.

This task changes presentation, static legal content and public navigation only. It does not change the authentication controller/repositories, sign-in/registration requests, Keycloak settings, NestJS endpoints, permissions, packages or database schema. The existing registration gate still checks the same initially false `terms` value. Its explanatory wording now distinguishes acceptance of Terms from acknowledgement of the Privacy Policy.

## Routes and entry points

| Route | Screen | Authentication | Entry points |
| --- | --- | --- | --- |
| `/legal/terms` | `TermsOfServiceScreen` | Not required | Registration → Terms of Service; Profile → Legal & privacy → Terms of Service |
| `/legal/privacy` | `PrivacyPolicyScreen` | Not required | Registration → Privacy Policy; Profile → Legal & privacy → Privacy Policy |

`FajiRoutes.termsOfService` and `FajiRoutes.privacyPolicy` alias the feature-local `LegalRoutes` constants. Routes are outside the customer access gate. Opening a document pushes a normal in-app route; Back returns to the existing registration state rather than replacing its screen or controllers. No external-browser package is used.

There was no completed Settings/About feature to extend. The existing Profile destination was a placeholder; it now contains a small legal-information card and retains the existing bottom navigation. No new Settings subsystem was built.

## Presentation and acknowledgement

- Existing `FajiColors`/Arial theme, light background, white surfaces, rounded cards, readable 16px body text, comfortable line spacing and numbered semantic headings.
- Scrollable/selectable content, scrollbar, device-safe padding and a reading-width limit on wider screens. No fixed-height legal text blocks.
- Approval banner, per-section review notes, draft version IDs and no automatically generated publication date. Draft labels in registration/Profile follow the document metadata.
- Registration links are real `TextButton`s with minimum 48px targets and a darker brand-red foreground for readable small text.
- Required checkbox: accepts Terms and acknowledges reading the Privacy Policy. The nearby explanation says this is not consent to optional marketing or other optional processing. Opening either document never selects it.
- The existing backend receives the same acceptance boolean; no optional-processing consent is silently introduced. The current backend acceptance record includes a timestamp, not approved legal-document version IDs. Version-specific acceptance recording needs a separate, authorised backend change before an approved-public-policy rollout.

## Evidence used to describe actual practices

| Inspected source | Confirmed fact / drafting consequence |
| --- | --- |
| `features/auth/presentation/screens/user_auth_screen.dart`, `native_customer_registration.dart`, API `auth/customer-registration.ts`, migration `0103_customer_registration.sql` | Registration collects full name, username, email, phone, birth date, home address, password and Terms acceptance. Confirmation is a form-only check. Profile/consent fields are stored separately from Keycloak credentials. |
| `native_keycloak_repository.dart`, `native_account_verifier.dart`, `platform_secure_session_store.dart`, API identity/account guards | Actual customer sign-in uses tokens/UserInfo/API account checks and platform secure session storage. Email-verification metadata is not proof of ownership and is not a customer login prerequisite. No independent security audit is claimed. |
| Customer Android manifest, iOS Info.plist, `pubspec.yaml`, location-selection screen | No customer GPS permission or continuous background location implementation identified. Selected/typed locations and addresses differ from device GPS collection. No analytics/advertising/crash-reporting SDK identified in this customer build. |
| `home_business_repository.dart`, `plan_repository.dart`, `booking_repository.dart`, `wishlist_repository.dart` | Several data sources currently return unavailable-service states. Prototype discovery/booking/ticket/wishlist interfaces are not represented as live fulfilment or valid tickets. |
| `add_payment_card_screen.dart`, API payment modules | Current card screen does not collect PAN/CVV/PIN; backend has payment integration code, including a Paystack adapter. Code is not evidence of a live provider contract, certified checkout or a confirmed payment. No provider relationship is invented in the notice. |
| API support/notification models and services | Support records are supported in backend code, but the customer build does not establish an operational privacy/deletion channel. The notice does not falsely offer a completed deletion button. |
| Registration limiter, request/error filters and security-event persistence | Connection-address-derived attempt counter and request/security records exist. Their presence does not establish an approved retention schedule or production hosting region. |

No operator address, company number, support/privacy email, hosting country, refund timetable, fee, liability cap or commercial provider contract was invented.

## Primary legal materials consulted

These sources informed the draft; they do not constitute legal approval of Fajify or verification of compliance. Some official PDF direct fetches were restricted by the publisher; relevant indexed official extracts were available. Counsel should check the complete current instruments as part of approval.

- [Nigeria Data Protection Act 2023 — NDPC official copy](https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf): lawful bases, consent, rights and cross-border safeguards.
- [NDPC NDP Act–GAID 2025](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf): implementation guidance, principles, lawful-basis assessment and transfer documentation. The earlier draft GAID was not treated as the operative final instrument.
- [NDPC 2025 Annual Report](https://ndpc.gov.ng/wp-content/uploads/2026/02/Print_NDPC-Annual-Report-2025-1.pdf): confirms the final GAID issue/effective context.
- [NDPC data-subject request information](https://forms.ndpc.gov.ng/dsar-request/): rights and request handling; NDPC's own form/contact/deadlines were not copied as Fajify's operating process.
- [NDPC 2024 Annual Report](https://ndpc.gov.ng/wp-content/uploads/2025/01/NDPC-Annual-Report-2024.pdf): guidance on children's safeguards and age/guardian issues.
- [FCCPC consumer rights and responsibilities](https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/): consumer disclosure, advance-booking/cancellation and service rights. No private policy overrides mandatory rights.

## Missing facts — business confirmation required

1. Contracting operator/controller legal name, registration information where applicable, business/service address and jurisdictional reach.
2. Verified support contact, privacy contact and responsible privacy officer/function.
3. Which venues, experience types, booking/ticket/payment/ride/support/review functions are actually enabled for production customers.
4. Commercial role for each transaction: intermediary, agent, principal or merchant; provider agreements and actual confirmation point.
5. Live payment processors and other infrastructure/support/identity vendors, their contracts and data responsibilities.
6. Actual hosting/backup regions, recipient countries, access roles and data-sharing fields per flow.
7. Required birth-date/home-address necessity, approved retention and backup schedules, and a working account/data-deletion request process.
8. Approved document versions, real approval/effective dates and change-notice/acceptance ownership.

## Legal/privacy decisions — release blockers and review

- Minimum account age, legal capacity, any guardian process and age assurance. The draft does not invent or falsely claim enforcement of an age threshold.
- Consumer-compliant cancellations, refunds, no-shows, rescheduling, provider failures and payment disputes; actual fees and pricing disclosures.
- Fair suspension/termination, notice/review arrangements and treatment of existing transactions.
- Appropriate disclaimers, liability/insurance arrangements, governing law and dispute forum. No compulsory arbitration or liability cap has been invented.
- A documented lawful basis for each purpose, including balancing where legitimate interests are relied on. Terms acceptance is not blanket data-processing consent.
- Rights handling, proportionate identity checks, applicable response duties, deletion exceptions and an operational contact route. No invented retention periods or deletion promises.
- International-transfer assessment and safeguards based on actual recipients/locations.
- UGC visibility, moderation, reporting and any appropriately limited content licence, if those features are released.
- Version-specific acceptance records for an eventual approved release. This task deliberately does not alter the authentication endpoint or current acceptance storage.

Do not publish these drafts as final approved policies. Resolve the marked facts/decisions, obtain legal/business approval, update the version and `approvedOn` in the content files with the actual approval date, and review the acceptance rollout. Updating content/metadata does not require redesigning the reader UI or installing a CMS.

## Files created

- `apps/customer_mobile/lib/features/legal/data/legal_document.dart`
- `apps/customer_mobile/lib/features/legal/data/terms_of_service.dart`
- `apps/customer_mobile/lib/features/legal/data/privacy_policy.dart`
- `apps/customer_mobile/lib/features/legal/presentation/legal_routes.dart`
- `apps/customer_mobile/lib/features/legal/presentation/legal_document_screen.dart`
- `apps/customer_mobile/lib/features/legal/presentation/legal_links_card.dart`
- `apps/customer_mobile/lib/features/auth/presentation/widgets/registration_legal_acknowledgement.dart`
- `apps/customer_mobile/test/legal/legal_pages_test.dart`
- This report: `docs/engineering/legal-pages-implementation-2026-11-09.md`

## Files modified

- `apps/customer_mobile/lib/main.dart`: two public legal routes and constants/imports.
- `apps/customer_mobile/lib/features/auth/presentation/screens/user_auth_screen.dart`: replace placeholder legal links with the reusable acknowledgement widget; clarify the existing missing-acceptance error text. Authentication logic is unchanged.
- `apps/customer_mobile/lib/features/home/presentation/screens/temporary_home_destinations.dart`: legal links in the existing Profile area.

Generated local visual-review PNGs are under ignored `apps/customer_mobile/.dart_tool/legal-review/`. The temporary renderer was removed after inspection; these are review artefacts, not new application dependencies.

## Verification and commands

- Combined `flutter test --no-pub test/legal test/auth`: **94 passed** (9 legal tests plus 85 existing auth tests).
- Tested both documents at 320×640 with 1× and 2.5× text scaling, including scrolling to the last section/end without overflow.
- Checked public named routes while signed out, correct registration links, all eight retained field values, Back navigation, unchecked and checked state preservation, no automatic acceptance, required-acceptance blocking and both Profile links.
- Locally rendered and visually inspected the top of both documents with app fonts/icons.
- Final `flutter analyze --no-pub`: **no issues found**. The now-unused optional navigation parameter on the remaining placeholder-only pages was removed after Profile gained its own legal card.
- Final legal-only repeat: **9 passed** after the metadata-driven draft labels and wording refinements.
- Draft-page app build compiled, installed and launched on the Samsung. Final Profile-card cleanup is included in the refreshed phone build.
- Launch also exposed an AppAuth certificate-trust error during cached-session restoration. The legal changes do not alter that authentication/networking path; it was left untouched under this task's explicit restriction. Public legal pages do not depend on successful authentication. Auth regression tests passing is not a claim that the observed device refresh-TLS issue was fixed.

Exact PowerShell command for the Samsung Galaxy A36 (local services/configuration already set up in this workspace):

```powershell
cd "C:\Users\omola\OneDrive\Desktop\Fajify-main"
.\tooling\run-customer-android-local.ps1 -DeviceId RFCY508YB6X
```

Equivalent Flutter command, with the debug CA and ADB mappings already prepared:

```powershell
cd "C:\Users\omola\OneDrive\Desktop\Fajify-main\apps\customer_mobile"
& "C:\src\flutter\bin\flutter.bat" run --debug -d RFCY508YB6X --dart-define-from-file=oidc-config.local.json
```
