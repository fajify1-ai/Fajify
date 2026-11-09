import 'legal_document.dart';

const privacyPolicy = LegalDocument(
  id: 'privacy',
  title: 'Privacy Policy',
  subtitle: 'Your information, choices and privacy rights',
  version: 'privacy-draft-1',
  sections: [
    LegalSection(
      'Who operates Fajify',
      [
        'Fajify is a lifestyle discovery and booking product. The organisation deciding how customer information is used must be identified as the relevant data controller in the approved notice. Its legal identity, business address and privacy contact have not yet been supplied.',
        'This is a development draft awaiting business and legal approval, not a statement that regulatory compliance has been independently verified. It is prepared with the Nigeria Data Protection Act 2023 and relevant Nigeria Data Protection Commission guidance, including GAID 2025, in mind. It has no effective or approved publication date.',
      ],
      reviewNote: 'Release blocker: confirm the controller, any joint-controller relationships, address, privacy contact and responsible privacy officer or function.',
    ),
    LegalSection('Information covered by this policy', [
      'The current customer registration and authentication flow handles the information described below. Other categories apply only when the relevant feature is actually enabled and used; backend support or a prototype screen alone does not establish that collection is live.',
      'Information may come from details you enter, necessary account and security interactions, or an enabled transaction with a provider. No complete production data inventory or recipient list has been approved. The review notes identify facts that must be confirmed before a final notice is published.',
    ]),
    LegalSection('Account and registration details', [
      'Registration asks for full name, username, email address, phone number, date of birth, home address and password. The form also checks password confirmation and requires Terms acceptance with acknowledgement of the Privacy Policy. The account profile stores contact and profile fields and the Terms-acceptance timestamp.',
      'The account is associated with a unique authentication account identifier. Registration assigns customer access rather than allowing a person to choose privileged roles or a different subject. Password confirmation is not a separately retained profile field. The current acceptance record does not yet identify a particular approved legal-document version.',
    ]),
    LegalSection(
      'Authentication and account security',
      [
        'The native app sends account requests over configured HTTPS connections to the backend and authentication service. Keycloak handles passwords and issues session tokens; Fajify’s customer profile tables do not store the submitted password. On the device, session credentials are kept using platform secure storage.',
        'The backend checks signed tokens and account status before permitting protected customer access. Sign-in does not itself prove email ownership, and the current customer policy does not require a separate email-verification step. Actual verification metadata is not changed merely to permit access.',
        'Session identifiers, access decisions, revocation information and account-security events may be processed to protect accounts. Never send a password, security code or payment PIN through an ordinary support conversation.',
      ],
      reviewNote: 'Confirm production authentication hosting, access controls, security operations and incident procedures. Do not claim an audit, certification or perfect security that has not been verified.',
    ),
    LegalSection(
      'Date of birth and age-related information',
      [
        'A date of birth is currently required by the registration form and stored in the customer profile. That collection is a fact about this build; it is not proof that a minimum-age check or guardian-consent process is implemented.',
        'Before public release, the operator must justify why a full birth date is needed, decide whether a less detailed age indicator would be sufficient, identify the lawful basis and approve the age rules. This draft does not approve unrelated marketing, profiling or advertising based on birth date.',
      ],
      reviewNote: 'Decide necessity, minimum age, age assurance, access restrictions and retention for birth dates; reconcile these decisions with the children’s-privacy section.',
    ),
    LegalSection(
      'Location and device permissions',
      [
        'The customer app includes location choices and address inputs used for planning or experience information. A location you select or type is information you choose to provide. The current Android manifest does not request device-location permission, and this customer build does not implement continuous background GPS tracking.',
        'Backend modules support location-related searches and other service-specific coordinates, but their existence does not mean the current customer app collects your precise device position. If a location-enabled service is introduced, its purpose, precision, recipients and any permission choice must be explained at the point of use.',
      ],
      reviewNote: 'Confirm the location features actually released, whether precise coordinates are collected, any optional permission and the consequences of declining it.',
    ),
    LegalSection(
      'Reservations, bookings and transactions',
      [
        'Where a live transaction is enabled, its records may include the customer subject, provider or venue, selected dates and times, guest numbers, items or experience choices, prices, status, messages and booking or transaction references.',
        'Some current customer booking controls show that the service is unavailable, and some ticket flows are previews. A preview screen is not evidence that an order was placed, a provider received your information or payment occurred. The approved notice must distinguish actual production records from these interfaces.',
      ],
      reviewNote: 'Confirm which reservation, order, ticket and ride-related flows are live, their data fields and the people who receive each field.',
    ),
    LegalSection(
      'Payment information',
      [
        'The current customer card-setup screen does not itself capture card numbers, CVV or PIN. Backend payment components can handle checkout references, amounts, status, reconciliation and refund records when configured; that does not establish a live payment-provider relationship.',
        'For an enabled payment service, the actual checkout must identify the processor and explain any information it collects directly. Fajify should receive only the transaction or authorised payment information needed for that service. This draft claims no verified payment-industry certification and invents no payment-provider agreement.',
      ],
      reviewNote: 'Confirm the active payment processors, their roles and notices, data fields received by Fajify, security responsibilities and transaction-retention requirements.',
    ),
    LegalSection(
      'Device, network and diagnostic information',
      [
        'Network requests necessarily expose connection information to the receiving infrastructure. The registration endpoint uses a hash derived from its connection address for a time-window attempt counter. The backend also has request-correlation and security/audit records, including request method, route and failure status.',
        'No analytics, advertising or crash-reporting SDK was identified in this customer build. That is not a promise about every operating-system, hosting or provider log. Application passwords and tokens must not be included in diagnostic reports or ordinary support messages.',
      ],
      reviewNote: 'Confirm production logs, infrastructure metadata, image-host requests, monitoring vendors, log access and retention. Add a notice before introducing new analytics or advertising collection.',
    ),
    LegalSection(
      'Support messages and feedback',
      [
        'If an actual support or feedback channel is enabled, it may receive the message you send, your account identifier, a subject or category and any relevant transaction reference. A fully connected privacy-request or deletion service is not available in this customer build.',
        'Share only information needed to explain the issue. Avoid sending someone else’s private details or unnecessary sensitive documents. A future public review or upload feature needs its own clear visibility and moderation explanation rather than assuming all feedback is public.',
      ],
      reviewNote: 'Confirm the channels, recipients, attachments, public visibility if any and whether an external support provider is used.',
    ),
    LegalSection(
      'Purposes and lawful bases',
      [
        'Account setup and access are intended to provide the account you request. Enabled booking and transaction processing would serve the requested transaction. Security checks and fraud prevention need an identified, proportionate basis; applicable legal obligations may require particular records.',
        'A contract, a specific legal obligation, assessed legitimate interests or properly obtained consent may be relevant depending on the purpose. The operator must document the applicable basis for each actual use. A necessary account function must not be described as optional consent merely because there is a checkbox.',
        'Agreeing to Terms and acknowledging this Policy do not give blanket permission for marketing, advertising, unrelated profiling or every other use of personal data. If an optional activity relies on consent, it requires its own clear choice and a way to withdraw that choice. No such optional consent is collected by the registration checkbox.',
      ],
      reviewNote: 'Approve a purpose-by-purpose lawful-basis assessment, including the necessity of required profile fields and any legitimate-interest balancing assessment.',
    ),
    LegalSection(
      'Sharing and service providers',
      [
        'The current account flow uses the backend and authentication service to create and validate an account. A venue listing does not itself authorise disclosure of your complete registration profile to that venue.',
        'For a live booking, only information necessary to arrange or fulfil that booking should be shared with the identified provider, such as the relevant name, contact and booking details. Exact recipients and fields must be confirmed. Infrastructure, payment and support services may have distinct roles that also need to be documented.',
        'Any disclosure required by law or for a lawful security purpose must have an appropriate basis and safeguards. This draft establishes no sale of personal information or general licence to give all listed venues your password, session credentials, date of birth or home address.',
      ],
      reviewNote: 'Complete the recipient inventory, processor contracts and role analysis for venues, organisers, hosts, identity services and payment/support providers.',
    ),
    LegalSection(
      'Storage, security and retention',
      [
        'The implementation separates authentication credentials from application profile and transaction records. It uses HTTPS for the native account connection, platform secure storage for device session credentials, backend access checks and security-event records. These controls reduce risk; they are not a guarantee against every incident.',
        'No approved retention schedule, backup-deletion cycle or production hosting location was provided. This draft therefore sets no invented number of days or years. Retention must be justified by the purpose, applicable legal requirements and any properly documented preservation need, followed by an appropriate deletion or anonymisation process.',
      ],
      reviewNote: 'Approve retention for accounts, birthdays, addresses, transactions, support, attempt counters, audit logs and backups, and verify who can access each category.',
    ),
    LegalSection(
      'International transfers',
      [
        'The production hosting countries, backup regions and locations of third-party recipients have not been confirmed. Local development on a phone and computer does not establish where production personal data will be processed.',
        'Before any relevant transfer outside Nigeria, the operator must identify the destination, applicable transfer basis and safeguards under Nigerian data-protection requirements. Accepting the Terms or reading this Policy is not a blanket consent to unspecified international transfers.',
      ],
      reviewNote: 'Map actual countries and onward transfers; assess and record the appropriate protection or lawful transfer mechanism before publication.',
    ),
    LegalSection(
      'Your privacy rights',
      [
        'Subject to the applicable conditions and lawful exceptions, you may request information and access, correction, erasure, restriction or portability; object to relevant processing; and withdraw consent for activities that rely on it. Rights concerning qualifying automated decisions may also apply. Withdrawal does not undo otherwise lawful processing already carried out.',
        'A request should be assessed with proportionate identity checks and answered within the applicable legal requirements. You may raise a concern with the Nigeria Data Protection Commission or seek an available legal remedy. A private complaints process must not be described as a barrier to exercising a statutory right.',
      ],
      reviewNote: 'Approve the practical rights-request workflow, response responsibilities, safe identity checks, applicable exceptions and a working contact channel.',
    ),
    LegalSection(
      'Account closure and deletion requests',
      [
        'This customer build does not provide a completed self-service account-deletion flow. Signing out removes access to the current session; it does not itself delete the account, profile, transaction history or every server record.',
        'The operator must publish a working channel for account-closure and data-deletion requests before release. A valid request needs a reasoned assessment of what can be deleted, what must be retained and why, and how relevant providers or backups are handled. This draft promises no immediate or unconditional deletion that the system has not implemented.',
      ],
      reviewNote: 'Release blocker: establish and test the deletion request channel and operational process, including authentication-service records and retained transaction/audit records.',
    ),
    LegalSection(
      'Cookies and similar technologies',
      [
        'Ordinary native customer sign-up and sign-in use account requests and session credentials rather than an embedded advertising-cookie banner. The current code does not establish a non-essential tracking or advertising-cookie feature.',
        'An account-provider page opened for a separate recovery journey, or a third-party site you choose to visit, may use its own cookies or storage and should provide its own notice. The native app’s secure session storage is distinct from optional analytics or marketing tracking.',
      ],
      reviewNote: 'Check the deployed web surfaces, embedded content, device storage and any future SDKs; document any optional technology and its actual controls.',
    ),
    LegalSection(
      'Children’s privacy',
      [
        'A complete minimum-age and parental-authorisation policy has not been approved or implemented. Collecting a date of birth does not on its own establish lawful handling of children’s information or make the product suitable for children.',
        'Where processing a child’s data relies on consent, Nigerian safeguards concerning a parent or guardian and appropriate verification must be considered. The operator must decide whether to exclude children or build a lawful, proportionate child-specific process before offering the service to them.',
      ],
      reviewNote: 'Approve the age policy, any guardian arrangements, minimisation and child-focused safeguards before public release.',
    ),
    LegalSection(
      'Changes to this Policy',
      [
        'The approved notice should be revised when actual data practices materially change. A new revision should identify its version and approved date and provide appropriate notice of meaningful changes.',
        'This draft shows approval as pending instead of inventing a last-updated date. A policy update cannot retrospectively create consent or justify processing for a purpose that lacked an appropriate basis.',
      ],
      reviewNote: 'Approve ownership of the notice, review cadence, change notices and how new optional consent will be requested where needed.',
    ),
    LegalSection(
      'Privacy contact and unresolved details',
      [
        'No verified privacy email address, postal address or responsible contact has been provided. These are intentionally not replaced with a guessed address or another organisation’s contact details.',
        'The operator must provide accessible privacy and support channels and explain how to submit rights, account-closure or deletion requests. Until those details and the marked decisions are completed, this document remains a draft awaiting business and legal approval.',
      ],
      reviewNote: 'Release blocker: supply the legal controller’s identity, contact details and verified rights-request channel. Do not publish this draft as a final, approved Privacy Policy.',
    ),
  ],
);
