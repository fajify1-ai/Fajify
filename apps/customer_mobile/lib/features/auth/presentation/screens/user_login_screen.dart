import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class UserLoginScreen extends StatelessWidget {
  const UserLoginScreen({super.key});
  @override
  Widget build(BuildContext context) => const PlaceholderLoginScreen(
    title: 'User login',
    subtitle: 'Your Faji experience starts here.',
  );
}

class PlaceholderLoginScreen extends StatelessWidget {
  const PlaceholderLoginScreen({
    super.key,
    required this.title,
    required this.subtitle,
  });
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(backgroundColor: Colors.transparent),
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'faji',
              style: TextStyle(
                color: FajiColors.primary,
                fontSize: 54,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(color: FajiColors.textSecondaryDark),
            ),
          ],
        ),
      ),
    ),
  );
}
