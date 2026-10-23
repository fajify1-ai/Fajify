import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';

enum PlanPricingType { perGuest, flatRate, basePlusGuest }

class PlanOption {
  const PlanOption({
    required this.id,
    required this.businessId,
    required this.title,
    required this.businessName,
    required this.location,
    required this.priceMin,
    required this.priceMax,
    required this.planTypes,
    required this.vibes,
    required this.supportedTimes,
    required this.availableWeekdays,
    required this.minimumGuests,
    required this.maximumGuests,
    required this.features,
    required this.imageAsset,
    this.imageUrl = '',
    this.pricingType = PlanPricingType.perGuest,
    this.pricePerGuest,
    this.basePrice,
    this.additionalGuestPrice,
    this.rating = 4.5,
    this.isActive = true,
    this.isApproved = true,
    this.isPlaceholder = true,
  });

  final String id;
  final String businessId;
  final String title;
  final String businessName;
  final String location;
  final int priceMin;
  final int priceMax;
  final List<PlanType> planTypes;
  final List<PlanVibe> vibes;
  final List<PlanTimeOfDay> supportedTimes;
  final List<int> availableWeekdays;
  final int minimumGuests;
  final int maximumGuests;
  final List<String> features;
  final String imageAsset;
  final String imageUrl;
  final PlanPricingType pricingType;
  final int? pricePerGuest;
  final int? basePrice;
  final int? additionalGuestPrice;
  final double rating;
  final bool isActive;
  final bool isApproved;
  final bool isPlaceholder;
}
