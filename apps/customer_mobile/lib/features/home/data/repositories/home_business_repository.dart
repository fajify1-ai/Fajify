import '../../../../core/data/service_unavailable.dart';
import '../models/home_business.dart';

abstract interface class CustomerDiscoveryRepository {
  Future<List<HomeBusiness>> loadBusinesses();
  Future<List<HomeBusiness>> loadHomeBusinesses();
}

/// Replace at composition with an adapter for reviewed discovery contracts.
class HomeBusinessRepository implements CustomerDiscoveryRepository {
  @override
  Future<List<HomeBusiness>> loadBusinesses() async =>
      throw const ServiceUnavailable('Discovery');
  @override
  Future<List<HomeBusiness>> loadHomeBusinesses() => loadBusinesses();
}
