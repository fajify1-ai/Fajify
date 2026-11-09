import '../../../../core/data/service_unavailable.dart';
import '../../../auth/application/auth_controller.dart';

/// Presentation model only; not a speculative customer API response schema.
class CustomerProfile {
  const CustomerProfile({required this.fullName, this.photoUrl});
  final String fullName;
  final String? photoUrl;
}

abstract interface class CustomerProfileRepository {
  Future<CustomerProfile> loadCurrentProfile();
}

class AuthenticatedCustomerProfileRepository
    implements CustomerProfileRepository {
  const AuthenticatedCustomerProfileRepository(this.auth);
  final AuthController auth;
  @override
  Future<CustomerProfile> loadCurrentProfile() async =>
      CustomerProfile(fullName: await auth.loadCustomerDisplayName());
}

class UnavailableCustomerProfileRepository
    implements CustomerProfileRepository {
  const UnavailableCustomerProfileRepository();
  @override
  Future<CustomerProfile> loadCurrentProfile() async =>
      throw const ServiceUnavailable('Profile');
}
