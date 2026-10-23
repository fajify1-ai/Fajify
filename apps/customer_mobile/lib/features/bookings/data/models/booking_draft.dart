import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../../plans/data/models/plan_option.dart';

enum PaymentMethodType { card, bankTransfer, ussd }

enum BookingTimePeriod {
  morning('Morning', '7:00am – 12:00pm', 7, 12),
  afternoon('Afternoon', '12:00pm – 5:00pm', 12, 17),
  evening('Evening', '5:00pm – 9:00pm', 17, 21),
  night('Night', '9:00pm – late', 21, null);

  const BookingTimePeriod(this.label, this.range, this.startHour, this.endHour);

  final String label;
  final String range;
  final int startHour;
  final int? endHour;
}

class BookingDraft {
  const BookingDraft({
    required this.plan,
    required this.flowState,
    required this.bookingDate,
    this.people,
    this.bookingTimePeriod,
    this.bookingStartTime,
    this.bookingEndTime,
    this.guestCount = 1,
    this.rideSelected = false,
    this.ridePrice = 0,
    this.paymentMethod,
    this.calculatedTotal = 0,
  });

  final PlanOption plan;
  final PlanForMeFlowState flowState;
  final DateTime bookingDate;
  final int? people;
  final BookingTimePeriod? bookingTimePeriod;
  final DateTime? bookingStartTime;
  final DateTime? bookingEndTime;
  final int guestCount;
  final bool rideSelected;
  final int ridePrice;
  final PaymentMethodType? paymentMethod;
  final int calculatedTotal;

  BookingDraft copyWith({
    BookingTimePeriod? bookingTimePeriod,
    DateTime? bookingStartTime,
    DateTime? bookingEndTime,
    int? guestCount,
    bool? rideSelected,
    int? ridePrice,
    PaymentMethodType? paymentMethod,
    int? calculatedTotal,
  }) {
    return BookingDraft(
      plan: plan,
      flowState: flowState,
      bookingDate: bookingDate,
      people: people,
      bookingTimePeriod: bookingTimePeriod ?? this.bookingTimePeriod,
      bookingStartTime: bookingStartTime ?? this.bookingStartTime,
      bookingEndTime: bookingEndTime ?? this.bookingEndTime,
      guestCount: guestCount ?? this.guestCount,
      rideSelected: rideSelected ?? this.rideSelected,
      ridePrice: ridePrice ?? this.ridePrice,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      calculatedTotal: calculatedTotal ?? this.calculatedTotal,
    );
  }
}
