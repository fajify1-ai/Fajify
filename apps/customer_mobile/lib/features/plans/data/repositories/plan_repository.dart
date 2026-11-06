import '../../../../core/data/service_unavailable.dart';
import '../models/plan_option.dart';

abstract interface class CustomerPlanRepository {
  Future<List<PlanOption>> loadAvailablePlans();
}

class PlanRepository implements CustomerPlanRepository {
  @override
  Future<List<PlanOption>> loadAvailablePlans() async =>
      throw const ServiceUnavailable('Plans');
}
