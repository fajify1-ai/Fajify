# Customer home profile name

The home header defaulted to `UnavailableCustomerProfileRepository`, so it never requested the name saved during registration. The backend already exposes that name through authenticated `GET /api/v1/customer/profile` as `displayName`.

The native authentication repository now provides profile access using its current private bearer token. The controller and home repository connect that access to `HomeHeader`. The header reloads when the session changes and discards late responses from a previous account. No password or bearer token is placed in the header, and no name is cached across accounts. Actual profile request failures still render the unavailable state independently of authentication.

Changed implementation files:

- `apps/customer_mobile/lib/features/auth/data/customer_profile_client.dart`
- `apps/customer_mobile/lib/features/auth/data/native_keycloak_repository.dart`
- `apps/customer_mobile/lib/features/auth/domain/auth_repository.dart`
- `apps/customer_mobile/lib/features/auth/application/auth_controller.dart`
- `apps/customer_mobile/lib/features/home/data/repositories/customer_profile_repository.dart`
- `apps/customer_mobile/lib/features/home/presentation/widgets/home_header.dart`

Validation:

- `flutter analyze --no-pub`: no issues.
- `flutter test --no-pub test/auth test/legal test/firebase_removal_test.dart`: 104 tests passed.
- Added `test/auth/customer_profile_test.dart` for the API contract, signed-out access, late responses, saved name/initials, and account changes.
- Updated `integration_test/native_registration_test.dart`; passed on Samsung SM-A366B (`RFCY508YB6X`) against the local HTTPS API and Keycloak. A new disposable customer registered through all eight fields, authenticated, reached home, and displayed `Registration Probe` instead of `Profile unavailable`. The disposable account was cleaned up afterward.

No backend schema, Keycloak policy, or email verification settings changed for this fix.
