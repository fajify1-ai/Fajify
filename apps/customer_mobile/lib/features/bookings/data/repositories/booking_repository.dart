import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/confirmed_booking.dart';
import '../models/booking_draft.dart';
import '../../../plans/data/models/plan_option.dart';

class BookingRepository {
  BookingRepository._();

  static final instance = BookingRepository._();
  final List<ConfirmedBooking> _bookings = <ConfirmedBooking>[];

  List<ConfirmedBooking> get bookings => List.unmodifiable(_bookings);

  List<ConfirmedBooking> get currentUserBookings {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return const <ConfirmedBooking>[];
    return List.unmodifiable(
      _bookings.where((booking) => booking.userId == uid),
    );
  }

  void add(ConfirmedBooking booking) {
    _bookings.removeWhere((item) => item.id == booking.id);
    _bookings.insert(0, booking);
    _persist(booking);
  }

  Future<void> loadForCurrentUser() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('bookings')
          .orderBy('createdAt', descending: true)
          .get();
      for (final document in snapshot.docs) {
        final booking = _fromMap(document.id, document.data(), uid);
        if (booking != null) addFromStorage(booking);
      }
    } catch (_) {
      // The in-memory booking remains available if persistence is offline.
    }
  }

  void addFromStorage(ConfirmedBooking booking) {
    _bookings.removeWhere((item) => item.id == booking.id);
    _bookings.add(booking);
  }

  Future<void> _persist(ConfirmedBooking booking) async {
    final uid = booking.userId.isNotEmpty
        ? booking.userId
        : FirebaseAuth.instance.currentUser?.uid;
    if (uid == null || uid.isEmpty) return;
    try {
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('bookings')
          .doc(booking.id)
          .set(_toMap(booking, uid));
    } catch (_) {
      // Local state is still usable when Firestore is unavailable.
    }
  }

  Map<String, Object?> _toMap(ConfirmedBooking booking, String uid) => {
        'userId': uid,
        'businessId': booking.plan.businessId,
        'planId': booking.plan.id,
        'planTitle': booking.plan.title,
        'businessName': booking.plan.businessName,
        'location': booking.plan.location,
        'imageAsset': booking.plan.imageAsset,
        'imageUrl': booking.plan.imageUrl,
        'bookingDate': Timestamp.fromDate(booking.bookingDate),
        'bookingTimePeriod': booking.bookingTimePeriod.name,
        'guestCount': booking.guestCount,
        'totalPrice': booking.totalPrice,
        'rideSelected': booking.rideSelected,
        'ridePrice': booking.ridePrice,
        'paymentMethod': booking.paymentMethod.name,
        'bookingStatus': booking.bookingStatus,
        'createdAt': Timestamp.fromDate(booking.createdAt),
        'qrToken': booking.qrToken,
      };

  ConfirmedBooking? _fromMap(
    String id,
    Map<String, dynamic> data,
    String uid,
  ) {
    final date = (data['bookingDate'] as Timestamp?)?.toDate();
    final createdAt = (data['createdAt'] as Timestamp?)?.toDate();
    final timeName = data['bookingTimePeriod'] as String?;
    final paymentName = data['paymentMethod'] as String?;
    if (date == null || createdAt == null || timeName == null) return null;
    BookingTimePeriod time;
    PaymentMethodType payment;
    try {
      time = BookingTimePeriod.values.byName(timeName);
      payment = PaymentMethodType.values.byName(paymentName ?? 'card');
    } catch (_) {
      return null;
    }
    final plan = PlanOption(
      id: data['planId'] as String? ?? id,
      businessId: data['businessId'] as String? ?? '',
      title: data['planTitle'] as String? ?? 'Faji booking',
      businessName: data['businessName'] as String? ?? '',
      location: data['location'] as String? ?? '',
      priceMin: (data['totalPrice'] as num?)?.toInt() ?? 0,
      priceMax: (data['totalPrice'] as num?)?.toInt() ?? 0,
      planTypes: const [],
      vibes: const [],
      supportedTimes: const [],
      availableWeekdays: const [1, 2, 3, 4, 5, 6, 7],
      minimumGuests: 1,
      maximumGuests: 100,
      features: const [],
      imageAsset: data['imageAsset'] as String? ?? '',
      imageUrl: data['imageUrl'] as String? ?? '',
    );
    return ConfirmedBooking(
      id: id,
      userId: uid,
      plan: plan,
      bookingDate: date,
      bookingTimePeriod: time,
      guestCount: (data['guestCount'] as num?)?.toInt() ?? 1,
      rideSelected: data['rideSelected'] as bool? ?? false,
      ridePrice: (data['ridePrice'] as num?)?.toInt() ?? 0,
      totalPrice: (data['totalPrice'] as num?)?.toInt() ?? 0,
      paymentMethod: payment,
      createdAt: createdAt,
      qrToken: data['qrToken'] as String? ?? id,
      bookingStatus: data['bookingStatus'] as String? ?? 'upcoming',
    );
  }
}
