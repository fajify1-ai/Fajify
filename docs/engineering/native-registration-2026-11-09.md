# Native customer registration

The light registration sheet follows the supplied design. It renders full name, username, email address, phone number, date of birth, home address, password, and confirm password. The sheet uses 92% of the available screen height, fixed account tabs, and a scrollable form so all eight fields and the terms checkbox/Create Account button are reachable. The date field opens a light date picker and both password fields have visibility controls. The registration tab no longer substitutes a browser-only button for the form. The sign-in flow remains native.

## Account creation

Flutter validates the form and terms acceptance and posts its profile fields to `POST /api/v1/auth/register` over the configured HTTPS API connection. Dates are converted to ISO format and the Nigerian phone prefix is normalized. The backend validates the fields, disallows extra client-selected roles/subjects/verification flags, and applies a PostgreSQL-backed registration limit before making privileged identity requests.

The backend uses a dedicated confidential Keycloak service account. It creates an initially disabled identity, assigns the fixed customer role, records profile/contact/birthday/address/consent data and active customer access in a transaction, enables the new identity, and commits. Failures roll back the database and attempt to delete only the newly created identity. Duplicate registrations never mutate an existing account. Passwords are sent to Keycloak and are not stored in application tables, audit events, or logs. The server credential is never sent to Flutter.

After successful creation, Flutter signs in with the new username/password and performs the existing UserInfo and NestJS customer-access checks before navigating to home. Passwords and confirmation are cleared from the form after the attempt. Under the customer policy explicitly requested in this chat, account creation does not require email verification and does not falsely mark the address verified.

## Local setup performed

- Applied migration `0103_customer_registration.sql`: profile fields/consent timestamp and the registration rate-limit table.
- Created the dedicated local `faji-customer-registration` confidential client after explicit user approval. Its service account has local `manage-users` and `view-realm` permissions and the customer role needed for customer mapping. This is a privileged server credential; it is saved only in ignored `.env.local`.
- Enabled native registration in the local backend with `FAJI_CUSTOMER_REGISTRATION_ENABLED=true` and restarted the local API with the new compiled code and the existing development CA trust.
- Corrected the local realm's email-as-username setting so the requested separate username is retained. Email login remains allowed. The live probe caught this mismatch before the updated app was installed.
- Aligned the local Keycloak user profile with the app's single Full name input: a separate last name is optional. Previously a single-word name caused Keycloak to reject password sign-in as `Account is not fully set up`, which the app wrongly presented as email verification. No email-verification claim or password was changed.
- Production registration stays disabled unless explicitly configured with its own managed backend credential. The local Docker bootstrap script targets only HTTPS localhost and the local realm.

## Verification

- Flutter analysis: no issues found.
- Flutter authentication tests: 85 passed, including all eight fields being reachable, terms required before submission, account creation followed by password sign-in, duplicate errors, and no browser sign-in call.
- API unit suite: 181 passed, including payload validation, fixed customer-only mapping, no password persistence, throttling, rollback/compensation, and duplicate protection.
- API TypeScript build: passed.
- Live HTTPS backend probe: registration 201, password sign-in 200, customer API 200, duplicate attempt 409. The email-verification flag remained false as intended.
- The same live probe passed with `--single-name`, reproducing and resolving the newly registered user's incomplete-profile case. Before the profile fix, that case returned HTTP 400; after the fix it returned password sign-in 200 and customer API 200.
- Samsung `RFCY508YB6X`: the device integration test reached every native field, created a disposable new customer, and reached `UserHomeScreen`. The test passed. Generated probe credentials were kept in memory, not printed, and the disposable identities/profile/access rows were cleaned up.

## Commands

Normal phone launch from the repository root:

```powershell
.\tooling\run-customer-android-local.ps1 -DeviceId RFCY508YB6X
```

Local backend setup for a fresh developer environment (review privileged service-account scope before running):

```powershell
node tooling/configure-local-customer-registration.mjs
node --env-file=.env.local --import ./packages/database/node_modules/tsx/dist/loader.mjs packages/database/scripts/migrate.ts
node apps/api/node_modules/typescript/bin/tsc -p apps/api/tsconfig.json
$env:NODE_EXTRA_CA_CERTS = (Resolve-Path 'infrastructure/certs/fajify-rootCA.crt').Path
node --env-file=.env.local apps/api/dist/main.js
```

Live disposable backend check from the repository root:

```powershell
node --env-file=.env.local tooling/verify-local-customer-registration.mjs
```

From `apps/customer_mobile`, the real-device registration test:

```powershell
& 'C:\src\flutter\bin\flutter.bat' test integration_test/native_registration_test.dart -d RFCY508YB6X --dart-define-from-file=oidc-config.local.json --no-pub
```

After device testing, run the probe cleanup from the repository root, then restore the normal app:

```powershell
node --env-file=.env.local tooling/verify-local-customer-registration.mjs --cleanup-only
.\tooling\run-customer-android-local.ps1 -DeviceId RFCY508YB6X
```

## Deployment notes

Keep the registration client secret in server-managed secrets. `manage-users` is broad within the realm; production needs appropriately restricted user-management permissions, secret rotation, and anti-abuse controls appropriate to the deployment. The existing conservative registration limit uses the backend socket address, which may represent a shared reverse proxy; production client-IP handling must be configured deliberately rather than trusting arbitrary forwarded headers. No production realm was changed here. The existing Terms of Service and Privacy Policy links remain placeholders awaiting product-approved documents.

The customer sign-in UI no longer exposes an email-verification button or browser-verification callback, including in password recovery status. The optional email gate was removed from the customer controller. Incomplete-account responses are no longer assumed to mean email verification; they remain explicit profile errors and never grant access without valid tokens and an active customer account. A deployed Keycloak user-profile configuration must support the app's single Full name model rather than requiring an additional surname field the form does not collect.

## Main files

- `apps/customer_mobile/lib/features/auth/presentation/screens/user_auth_screen.dart`
- `apps/customer_mobile/lib/features/auth/domain/auth_repository.dart`
- `apps/customer_mobile/lib/features/auth/application/auth_controller.dart`
- `apps/customer_mobile/lib/features/auth/data/native_customer_registration.dart`
- `apps/customer_mobile/lib/features/auth/data/native_keycloak_repository.dart`
- `apps/customer_mobile/lib/features/auth/data/customer_auth_composition.dart`
- `apps/customer_mobile/lib/features/auth/data/identity_http_io.dart` and `identity_http_stub.dart`
- `apps/api/src/auth/customer-registration.ts` and `identity.module.ts`
- `packages/database/migrations/0103_customer_registration.sql`
- Registration unit/integration tests, the two local setup/probe scripts, and `.env.example`.
