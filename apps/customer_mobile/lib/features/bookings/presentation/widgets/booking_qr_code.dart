import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/confirmed_booking.dart';

class BookingQrCode extends StatelessWidget {
  const BookingQrCode({super.key, required this.booking});

  final ConfirmedBooking booking;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 152,
      height: 152,
      padding: const EdgeInsets.all(10),
      color: Colors.white,
      child: CustomPaint(
        painter: _PlaceholderQrPainter(seed: booking.id),
      ),
    );
  }
}

class _PlaceholderQrPainter extends CustomPainter {
  const _PlaceholderQrPainter({required this.seed});

  final String seed;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black;
    final cell = size.width / 21;
    for (var row = 0; row < 21; row++) {
      for (var column = 0; column < 21; column++) {
        final value = seed.codeUnitAt((row * 21 + column) % seed.length);
        final finder = _finder(row, column, 0, 0) ||
            _finder(row, column, 14, 0) ||
            _finder(row, column, 0, 14);
        if (finder || (value + row * 3 + column * 5) % 7 < 3) {
          canvas.drawRect(
            Rect.fromLTWH(column * cell, row * cell, cell + .2, cell + .2),
            paint,
          );
        }
      }
    }
  }

  bool _finder(int row, int column, int startRow, int startColumn) {
    final r = row - startRow;
    final c = column - startColumn;
    if (r < 0 || r > 6 || c < 0 || c > 6) return false;
    return r == 0 || r == 6 || c == 0 || c == 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
  }

  @override
  bool shouldRepaint(covariant _PlaceholderQrPainter oldDelegate) =>
      oldDelegate.seed != seed;
}
