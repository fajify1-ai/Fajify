import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/confirmed_booking.dart';
import 'booking_ticket_screen.dart';

class BookingConfirmationScreen extends StatefulWidget {
  const BookingConfirmationScreen({super.key, required this.booking});

  final ConfirmedBooking booking;

  @override
  State<BookingConfirmationScreen> createState() =>
      _BookingConfirmationScreenState();
}

class _BookingConfirmationScreenState extends State<BookingConfirmationScreen> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => BookingTicketScreen(booking: widget.booking),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 78,
              height: 78,
              decoration: const BoxDecoration(
                color: Color(0xff20c968),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 48),
            ),
            const SizedBox(height: 22),
            const Text(
              'Booking Confirmed!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your ${widget.booking.plan.title} is booked',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: FajiColors.textSecondaryDark,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
