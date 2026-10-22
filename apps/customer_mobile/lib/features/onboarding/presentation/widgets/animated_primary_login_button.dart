import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class AnimatedPrimaryLoginButton extends StatefulWidget {
  const AnimatedPrimaryLoginButton({super.key, required this.onTap});
  final VoidCallback onTap;
  @override
  State<AnimatedPrimaryLoginButton> createState() =>
      _AnimatedPrimaryLoginButtonState();
}

class _AnimatedPrimaryLoginButtonState
    extends State<AnimatedPrimaryLoginButton> {
  bool _pressed = false;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: 'Login as a Faji user',
    child: AnimatedScale(
      scale: _pressed ? .97 : 1,
      duration: const Duration(milliseconds: 120),
      child: Material(
        color: FajiColors.primary,
        borderRadius: BorderRadius.circular(21),
        elevation: 12,
        shadowColor: FajiColors.primary.withOpacity(.4),
        child: InkWell(
          borderRadius: BorderRadius.circular(21),
          onTap: widget.onTap,
          onHighlightChanged: (v) => setState(() => _pressed = v),
          child: const SizedBox(
            height: 70,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Icon(Icons.person_outline_rounded, size: 27),
                  SizedBox(width: 18),
                  Expanded(
                    child: Text(
                      'Login as a user',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, size: 29),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
