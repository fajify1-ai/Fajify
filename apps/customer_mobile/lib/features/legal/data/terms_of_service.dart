import 'legal_document.dart';

const termsOfService = LegalDocument(
  id: 'terms',
  title: 'Terms of Service',
  subtitle: 'Using Fajify and booking experiences',
  version: 'terms-draft-1',
  sections: [
    LegalSection(
      'Introduction and acceptance',
      [
        'Fajify is a lifestyle discovery and booking platform intended to help people explore restaurants, events, beaches, parks and recreational experiences. These draft terms explain the proposed relationship between customers, the platform operator and independent providers.',
        'This revision is for business and legal review. It has not been approved, has no effective date and is not a final public offer. Registration currently records a required Terms acknowledgement; that record does not turn this draft into an approved contract. Read the Privacy Policy separately for information about personal data.',
      ],
      reviewNote: 'Confirm the contracting operator, approved document version, effective date and acceptance process before public release.',
    ),
    LegalSection(
      'Eligibility and minimum age',
      [
        'You must have the legal capacity and any permission required to enter the relevant transaction. An experience may have its own age, identification, safety or admission conditions, which must be disclosed before you book.',
        'A minimum age for Fajify accounts has not yet been approved. The current form collects a date of birth but does not enforce an approved minimum account age or a parental-authorisation process. This draft must not be treated as permission to offer accounts to children.',
      ],
      reviewNote: 'Approve the minimum account age, age checks and any guardian process. Do not publish a numerical age rule that the product does not enforce.',
    ),
    LegalSection('Registration and account responsibilities', [
      'Provide accurate registration details and keep information used for your bookings reasonably up to date. The form asks for your full name, username, email address, phone number, date of birth, home address and password. Password confirmation is a form check rather than a separate account attribute.',
      'Protect your password and access to your device. Do not share another person’s account, impersonate someone or supply information you are not authorised to use. Contact the verified support channel when published if you suspect unauthorised access. Never send a password, card PIN or one-time security code in an ordinary support message.',
      'Customer sign-in currently uses a username or email and password. It does not represent proof of email ownership, identity-document verification or an approved relationship with a venue.',
    ]),
    LegalSection('What the service currently provides', [
      'The customer build supports account creation and sign-in and includes screens for discovery, planning, reservations and related experiences. Some customer data sources and transaction screens remain previews or show that the service is unavailable. A screen, sample price, QR preview or saved-looking control is not proof that a real booking or payment has been completed.',
      'Use only the features actually available to your account. A transaction should be treated as confirmed only when the live service provides a valid confirmation identifying the experience, provider, dates, price and relevant conditions. Features described as unavailable are not promised as live services by these terms.',
    ]),
    LegalSection(
      'Restaurants and reservations',
      [
        'Where live restaurant discovery or reservations are offered, check the venue, date, time, party size, accessibility information, menu limitations and any disclosed deposit or attendance conditions before submitting a request.',
        'A reservation request and a confirmed reservation are different. Do not assume admission or a table is guaranteed by a listing. Venues are responsible for their own premises, food, service and admission decisions, subject to their agreement with you and applicable law. Fajify remains responsible for its own representations and services.',
      ],
      reviewNote: 'Confirm how requests become binding, who confirms availability and how venue changes are communicated.',
    ),
    LegalSection(
      'Events, tickets and bookings',
      [
        'For any live event booking, review the organiser, location, date, time, ticket category, admission restrictions and total price. Keep the actual confirmation and any entry instructions. Do not resell, duplicate, forge or misuse tickets or access codes.',
        'Schedules, capacity and admission rules are controlled by the identified organiser unless the transaction expressly says otherwise. A prototype ticket or QR image is not a valid paid ticket. Event cancellation, postponement or substitution must be handled under the applicable disclosed conditions and mandatory consumer rights.',
      ],
      reviewNote: 'Approve ticket delivery, organiser responsibilities, transfer rules and the response to postponed or cancelled events.',
    ),
    LegalSection('Beaches, parks and recreation', [
      'If a recreational experience is offered, review its access arrangements, operating hours, physical requirements and safety restrictions. Ask the provider about suitability, accessibility, supervision or required equipment before committing where this matters to you.',
      'Follow lawful safety instructions and do not expose other people to avoidable harm. Weather, site restrictions or other conditions may affect an experience, but this draft creates no automatic cancellation charge or blanket waiver of your rights.',
    ]),
    LegalSection(
      'Independent providers',
      [
        'A venue, organiser or activity operator listed on Fajify is not represented as owned, operated, employed or insured by Fajify simply because it appears in the app. The provider’s identity and role should be clear before a transaction.',
        'Additional provider conditions should be available before you commit and must not be used to conceal unfair restrictions or override mandatory consumer protections. The allocation of responsibilities must reflect the actual booking and payment arrangement rather than a general disclaimer.',
      ],
      reviewNote: 'Confirm whether Fajify acts as an intermediary, agent, merchant or principal for each transaction type, and approve the provider agreements.',
    ),
    LegalSection(
      'Prices, payments and charges',
      [
        'Review the total amount, currency, taxes and any separately disclosed platform or provider charges before approving a live payment. This draft sets no platform fee, commission, tax rate or additional-charge schedule. Prices displayed in a preview must not be mistaken for an offer that can already be purchased.',
        'Payment options depend on an actually configured checkout service. The current card-setup screen does not itself collect card numbers or prove a card has been saved. Do not send card details to a venue or to an unverified contact. A charge and a booking confirmation should be checked separately if the service reports a problem.',
      ],
      reviewNote: 'Approve the live payment provider, merchant-of-record role, price disclosures, receipts and responsibility for payment disputes.',
    ),
    LegalSection(
      'Cancellation, refunds and rescheduling',
      [
        'Before a live transaction, the applicable cancellation, no-show, refund and rescheduling conditions must be disclosed clearly. No universal refund percentage, deadline, processing period, non-refundable label or cancellation fee has been approved by this draft.',
        'Nigerian consumer protections concerning advance bookings and reservations continue to apply. Disclosed provider conditions cannot remove rights that the law makes mandatory. Keep your confirmation and payment records when raising a cancellation or refund issue.',
        'An unavailable or preview cancellation control is not confirmation that a provider has cancelled a booking. A completed cancellation and any resulting refund need an actual transaction record.',
      ],
      reviewNote: 'Approve rules for customer cancellations, provider cancellations, no-shows, rescheduling, refunds and escalation without conflicting with applicable consumer law.',
    ),
    LegalSection('Acceptable conduct', [
      'Use the service lawfully and with respect for other customers, providers and staff. Do not use false identities, fraudulent payments, unauthorised account access, threats, harassment, discriminatory abuse or unlawful material.',
      'Do not attempt to bypass access controls, manipulate inventory or prices, scrape personal information, disrupt the service or interfere with booking and security records. Report a suspected error through the confirmed support channel instead of exploiting it.',
    ]),
    LegalSection(
      'Reviews, feedback and other content',
      [
        'Only submit a review, message, image or other content where that feature is actually enabled. You should have the necessary rights to the material, and it should not disclose another person’s private information without an appropriate basis. Do not present invented experiences as genuine reviews.',
        'Public posting, visibility and moderation are not established by a preview interface. This draft does not impose an unlimited content licence or claim that customer profile information is automatically public.',
      ],
      reviewNote: 'Confirm enabled content features, visibility, moderation, reporting, appeal procedures and the limited licence needed to operate them.',
    ),
    LegalSection('Intellectual property', [
      'Fajify’s app design, software, branding and platform materials are protected by the rights of their respective owners. Access to the service does not transfer ownership of those materials to you.',
      'Provider names, images, logos and other third-party materials remain subject to the relevant owners’ rights. Use the app through its intended features; do not imply endorsement or ownership that has not been granted.',
    ]),
    LegalSection(
      'Availability and changes to the service',
      [
        'Features may be unavailable during development, maintenance or service interruptions. Do not rely on Fajify as an emergency service. This draft promises no uptime percentage, guaranteed inventory or uninterrupted access.',
        'Material changes to a confirmed transaction should be communicated through an available, reliable channel. Changing or withdrawing a feature does not by itself cancel an existing legal obligation or eliminate a remedy that applies to a transaction already made.',
      ],
      reviewNote: 'Approve operational notices, outage communications and treatment of existing bookings when features change.',
    ),
    LegalSection(
      'Disclaimers and liability',
      [
        'Listings and experience information should be checked for suitability before purchase, and errors should be corrected when identified. Fajify is not promising that every independent provider will perform without fault, but remains responsible for obligations that apply to its own conduct and services.',
        'Nothing in this draft excludes a liability or consumer remedy that applicable law does not permit to be excluded. No financial liability cap, blanket exclusion of negligence or automatic forfeiture has been approved. Provider involvement is not a waiver of your statutory rights.',
      ],
      reviewNote: 'Obtain Nigerian legal review of any proposed warranties, indemnities, liability limits and insurance arrangements before adoption.',
    ),
    LegalSection(
      'Suspension and termination',
      [
        'Account access can be restricted for security, suspected misuse or a lawful administrative decision. Use of an invalid, expired, revoked or suspended account does not entitle someone to bypass access controls.',
        'Any final suspension or termination policy should address fair notice where appropriate, correction of errors and the handling of existing bookings, money due and retained records. Closing access must not be presented as automatically erasing every record or extinguishing an existing consumer right.',
      ],
      reviewNote: 'Approve suspension grounds, notice, review or appeal channels and account-closure procedures.',
    ),
    LegalSection(
      'Changes to these terms',
      [
        'An approved future revision should identify its version, approval and effective dates and explain material changes through an appropriate notice. This development draft has no invented last-updated or publication date.',
        'The effect of a change on an existing booking or an earlier acceptance needs to be assessed before the revised terms are applied. Optional data-processing consent must not be inferred from agreeing to revised contractual terms.',
      ],
      reviewNote: 'Approve the change-notice period and any renewed-acceptance process. The current backend records acceptance time but not a legal-document version.',
    ),
    LegalSection(
      'Governing law and disputes',
      [
        'This draft is prepared for a Nigerian consumer-facing service. Applicable mandatory Nigerian consumer protections and access to lawful remedies are not waived by using the app.',
        'Try the operator’s verified support channel when it is provided. You may also have access to competent regulators or courts. This draft creates no mandatory arbitration scheme, exclusive court location, contractual claim deadline or restriction on reporting a concern to a regulator.',
      ],
      reviewNote: 'Counsel must approve the final governing-law wording, competent forum and any voluntary dispute-resolution arrangements.',
    ),
    LegalSection(
      'Contact and operator information',
      [
        'Fajify is the product name. The operator’s legal name, registration information where applicable, business address and verified customer-support contact have not been supplied for this draft.',
        'No address or legal contact email has been invented. These details must be completed and checked before public release so customers can identify the contracting party and obtain help.',
      ],
      reviewNote: 'Release blocker: provide the operator’s legal identity, service address and working support contact.',
    ),
  ],
);
