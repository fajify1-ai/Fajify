import '../../../../core/data/service_unavailable.dart';

/// Presentation model only; not a speculative customer API response schema.
class CustomerProfile {
  const CustomerProfile({required this.fullName, this.photoUrl});
  final String fullName;
  final String? photoUrl;
}

abstract interface class CustomerProfileRepository {
  Future<CustomerProfile> loadCurrentProfile();
}

class UnavailableCustomerProfileRepository
    implements CustomerProfileRepository {
  const UnavailableCustomerProfileRepository();
  @override
  Future<CustomerProfile> loadCurrentProfile() async =>
      throw const ServiceUnavailable('Profile');
}
