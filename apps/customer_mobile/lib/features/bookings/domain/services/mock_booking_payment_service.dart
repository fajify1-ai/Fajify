import '../../data/models/booking_draft.dart';

class MockBookingPaymentService {
  Future<bool> charge({required BookingDraft draft}) async {
    return true;
  }
}
