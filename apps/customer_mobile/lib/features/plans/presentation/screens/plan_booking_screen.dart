import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/plan_option.dart';

class PlanBookingScreen extends StatelessWidget {
  const PlanBookingScreen({super.key, required this.plan});

  final PlanOption plan;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: FajiColors.backgroundDark,
        title: const Text('Book Your Plan'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Booking coming next\n\n${plan.title}\n${plan.businessName}',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
