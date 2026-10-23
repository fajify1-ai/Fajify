import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../data_sources/placeholder_plan_data.dart';
import '../models/plan_option.dart';

class PlanRepository {
  PlanRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  Future<List<PlanOption>> loadAvailablePlans() async {
    try {
      final snapshot = await _firestore
          .collection('businesses')
          .where('isApproved', isEqualTo: true)
          .get();
      final realPlans = snapshot.docs
          .map((doc) => _fromFirestore(doc.id, doc.data()))
          .whereType<PlanOption>()
          .where((plan) => plan.isActive && plan.isApproved)
          .toList();
      return realPlans.isNotEmpty ? realPlans : placeholderPlans;
    } catch (_) {
      return placeholderPlans;
    }
  }

  PlanOption? _fromFirestore(String id, Map<String, dynamic> data) {
    final rawPlanTypes = _strings(data['planTypes']);
    final rawVibes = _strings(data['vibes']);
    final rawTimes = _strings(data['supportedTimes']);
    final planTypes = rawPlanTypes.map(_planType).whereType<PlanType>().toList();
    final vibes = rawVibes.map(_vibe).whereType<PlanVibe>().toList();
    final times = rawTimes.map(_time).whereType<PlanTimeOfDay>().toList();
    if (planTypes.isEmpty || vibes.isEmpty || times.isEmpty) return null;
    final priceMin = _number(data['priceMin']);
    final priceMax = _number(data['priceMax'], fallback: priceMin);
    return PlanOption(
      id: id,
      businessId: _string(data['businessId'], id),
      title: _string(data['planTitle'], _string(data['businessName'], 'Faji Plan')),
      businessName: _string(data['businessName'], 'Faji Business'),
      location: _string(data['location'], 'Lagos'),
      priceMin: priceMin,
      priceMax: priceMax,
      planTypes: planTypes,
      vibes: vibes,
      supportedTimes: times,
      availableWeekdays: _numbers(data['availableWeekdays'], fallback: [1, 2, 3, 4, 5, 6, 7]),
      minimumGuests: _number(data['minimumGuests'], fallback: 1),
      maximumGuests: _number(data['maximumGuests'], fallback: 20),
      features: _strings(data['features']),
      imageAsset: _string(data['localAssetPath'], ''),
      imageUrl: _string(data['imageUrl'], ''),
      pricingType: _pricingType(data['pricingType']),
      pricePerGuest: _numberOrNull(data['pricePerGuest']),
      basePrice: _numberOrNull(data['basePrice']),
      additionalGuestPrice: _numberOrNull(data['additionalGuestPrice']),
      rating: (data['rating'] is num) ? (data['rating'] as num).toDouble() : 0,
      isActive: data['isActive'] is bool ? data['isActive'] as bool : false,
      isApproved: data['isApproved'] is bool ? data['isApproved'] as bool : false,
      isPlaceholder: false,
    );
  }

  static List<String> _strings(Object? value) => value is List
      ? value.whereType<String>().map((item) => item.trim()).where((item) => item.isNotEmpty).toList()
      : const [];

  static List<int> _numbers(Object? value, {required List<int> fallback}) => value is List
      ? value.whereType<num>().map((item) => item.toInt()).toList()
      : fallback;

  static int _number(Object? value, {int fallback = 0}) =>
      value is num ? value.round() : fallback;

  static int? _numberOrNull(Object? value) =>
      value is num ? value.round() : null;

  static PlanPricingType _pricingType(Object? value) => PlanPricingType.values.firstWhere(
        (type) => type.name.toLowerCase() == value?.toString().toLowerCase(),
        orElse: () => PlanPricingType.perGuest,
      );

  static String _string(Object? value, String fallback) =>
      value is String && value.trim().isNotEmpty ? value.trim() : fallback;

  static PlanType? _planType(String value) => PlanType.values.where(
        (type) => type.name.toLowerCase() == value.toLowerCase() ||
            type.label.toLowerCase() == value.toLowerCase(),
      ).cast<PlanType?>().firstWhere((type) => type != null, orElse: () => null);

  static PlanVibe? _vibe(String value) => PlanVibe.values.where(
        (vibe) => vibe.name.toLowerCase() == value.toLowerCase() ||
            vibe.label.toLowerCase() == value.toLowerCase(),
      ).cast<PlanVibe?>().firstWhere((vibe) => vibe != null, orElse: () => null);

  static PlanTimeOfDay? _time(String value) => PlanTimeOfDay.values.where(
        (time) => time.name.toLowerCase() == value.toLowerCase() ||
            time.label.toLowerCase() == value.toLowerCase(),
      ).cast<PlanTimeOfDay?>().firstWhere((time) => time != null, orElse: () => null);
}
