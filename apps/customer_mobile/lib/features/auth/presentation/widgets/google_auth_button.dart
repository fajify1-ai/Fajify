import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class GoogleAuthButton extends StatelessWidget {
  const GoogleAuthButton({super.key, required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF252525),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: SizedBox(
          height: 62,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'G',
                style: TextStyle(
                  color: Color(0xFF4285F4),
                  fontSize: 23,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'Continue with Google',
                style: TextStyle(
                  color: FajiColors.textPrimaryDark.withValues(alpha: .9),
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
