import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/booking_draft.dart';

class BookingReviewPlaceholderScreen extends StatelessWidget {
  const BookingReviewPlaceholderScreen({super.key, required this.draft});

  final BookingDraft draft;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.background,
      appBar: AppBar(
        backgroundColor: FajiColors.background,
        title: const Text('Choose a time'),
      ),
      body: Center(
        child: Text(
          'Review Booking\n\n${draft.plan.title}\n${draft.bookingTimePeriod?.label}',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: FajiColors.textPrimary,
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
