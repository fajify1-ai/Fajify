import '../../../../core/data/service_unavailable.dart';
import '../models/confirmed_booking.dart';

abstract interface class CustomerBookingRepository {
  List<ConfirmedBooking> get currentUserBookings;
  Future<void> loadForCurrentUser();
  void add(ConfirmedBooking booking);
}

class BookingRepository implements CustomerBookingRepository {
  BookingRepository._();
  static final instance = BookingRepository._();
  static const unavailable = ServiceUnavailable('Bookings');
  String get loadError => unavailable.message;
  List<ConfirmedBooking> get bookings => const [];
  @override
  List<ConfirmedBooking> get currentUserBookings => const [];
  @override
  Future<void> loadForCurrentUser() async {}
  @override
  void add(ConfirmedBooking booking) => throw unavailable;
}
