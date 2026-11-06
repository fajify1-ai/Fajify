import 'package:flutter/material.dart';

import '../theme/faji_colors.dart';
import '../data/service_unavailable.dart';

class ServiceUnavailableView extends StatelessWidget {
  const ServiceUnavailableView({super.key, required this.feature});
  final String feature;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Text(
      ServiceUnavailable(feature).message,
      style: const TextStyle(color: FajiColors.textSecondaryDark),
    ),
  );
}
