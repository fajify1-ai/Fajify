import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/confirmed_booking.dart';
import '../widgets/booking_qr_code.dart';

class BookingTicketScreen extends StatelessWidget {
  const BookingTicketScreen({super.key, required this.booking});

  final ConfirmedBooking booking;

  String _date(DateTime value) => '${value.day}/${value.month}/${value.year}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: FajiColors.backgroundDark,
        title: const Text('Booking Ticket'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 20),
          decoration: BoxDecoration(
            color: FajiColors.surfaceDark,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: FajiColors.borderDark),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'FAJI BOOKING TICKET',
                      style: TextStyle(
                        color: FajiColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  Text(
                    booking.id,
                    style: const TextStyle(
                      color: FajiColors.textSecondaryDark,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                booking.plan.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                booking.plan.businessName,
                style: const TextStyle(
                  color: FajiColors.textSecondaryDark,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 18),
              BookingQrCode(booking: booking),
              const SizedBox(height: 18),
              _TicketRow(label: 'Date', value: _date(booking.bookingDate)),
              _TicketRow(label: 'Time', value: booking.bookingTimePeriod.label),
              _TicketRow(label: 'Guests', value: '${booking.guestCount}'),
              _TicketRow(label: 'Location', value: booking.plan.location),
              _TicketRow(label: 'Amount', value: '₦${booking.totalPrice}'),
              const SizedBox(height: 10),
              const Text(
                'Placeholder QR — verify this ticket with Faji before entry.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: FajiColors.textSecondaryDark,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketRow extends StatelessWidget {
  const _TicketRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 10),
    child: Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            color: FajiColors.textSecondaryDark,
            fontSize: 13,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ),
  );
}
