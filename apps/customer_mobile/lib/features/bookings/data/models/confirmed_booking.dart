import '../../../plans/data/models/plan_option.dart';
import 'booking_draft.dart';

class ConfirmedBooking {
  const ConfirmedBooking({
    required this.id,
    required this.plan,
    required this.bookingDate,
    required this.bookingTimePeriod,
    required this.guestCount,
    required this.rideSelected,
    required this.ridePrice,
    required this.totalPrice,
    required this.paymentMethod,
    required this.createdAt,
    required this.qrToken,
    this.userId = '',
    this.bookingStatus = 'upcoming',
  });

  final String id;
  final PlanOption plan;
  final DateTime bookingDate;
  final BookingTimePeriod bookingTimePeriod;
  final int guestCount;
  final bool rideSelected;
  final int ridePrice;
  final int totalPrice;
  final PaymentMethodType paymentMethod;
  final DateTime createdAt;
  final String qrToken;
  final String userId;
  final String bookingStatus;
}
