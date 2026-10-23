import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class AuthPrimaryButton extends StatefulWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.busy = false,
  });
  final String label;
  final VoidCallback onTap;
  final bool busy;

  @override
  State<AuthPrimaryButton> createState() => _AuthPrimaryButtonState();
}

class _AuthPrimaryButtonState extends State<AuthPrimaryButton> {
  bool pressed = false;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: pressed ? .98 : 1,
      duration: const Duration(milliseconds: 120),
      child: Material(
        color: FajiColors.primary,
        borderRadius: BorderRadius.circular(20),
        elevation: 12,
        shadowColor: FajiColors.primary.withValues(alpha: .35),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: widget.busy ? null : widget.onTap,
          onHighlightChanged: (value) => setState(() => pressed = value),
          child: SizedBox(
            height: 68,
            child: Center(
              child: widget.busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      widget.label,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
