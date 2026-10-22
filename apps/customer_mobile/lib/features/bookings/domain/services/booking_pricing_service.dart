import '../../../plans/data/models/plan_option.dart';

class BookingPricing {
  const BookingPricing({
    required this.planTotal,
    required this.ridePrice,
    required this.serviceFee,
  });

  final int planTotal;
  final int ridePrice;
  final int serviceFee;

  int get total => planTotal + ridePrice + serviceFee;
}

class BookingPricingService {
  static const ridePrice = 6500;
  static const serviceFee = 0;

  BookingPricing calculate({
    required PlanOption plan,
    required int guests,
    required bool rideSelected,
  }) {
    final planTotal = switch (plan.pricingType) {
      PlanPricingType.flatRate => plan.basePrice ?? plan.priceMin,
      PlanPricingType.basePlusGuest =>
        (plan.basePrice ?? 0) +
            ((plan.additionalGuestPrice ?? plan.priceMin) * guests),
      PlanPricingType.perGuest =>
        (plan.pricePerGuest ?? plan.priceMin) * guests,
    };
    return BookingPricing(
      planTotal: planTotal,
      ridePrice: rideSelected ? ridePrice : 0,
      serviceFee: serviceFee,
    );
  }
}
