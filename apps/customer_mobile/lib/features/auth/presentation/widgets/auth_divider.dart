import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});
  @override
  Widget build(BuildContext context) => const Row(
    children: [
      Expanded(child: Divider(color: FajiColors.borderDark)),
      Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Text(
          'or',
          style: TextStyle(color: FajiColors.textSecondaryDark, fontSize: 14),
        ),
      ),
      Expanded(child: Divider(color: FajiColors.borderDark)),
    ],
  );
}
