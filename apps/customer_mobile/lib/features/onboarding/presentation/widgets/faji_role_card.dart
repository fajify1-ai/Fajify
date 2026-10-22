import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class FajiRoleCard extends StatefulWidget {
  const FajiRoleCard({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    required this.semanticLabel,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String semanticLabel;
  @override
  State<FajiRoleCard> createState() => _FajiRoleCardState();
}

class _FajiRoleCardState extends State<FajiRoleCard> {
  bool _pressed = false;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: widget.semanticLabel,
    child: AnimatedScale(
      scale: _pressed ? .97 : 1,
      duration: const Duration(milliseconds: 120),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: widget.onTap,
          onHighlightChanged: (v) => setState(() => _pressed = v),
          child: Container(
            height: 96,
            decoration: BoxDecoration(
              border: Border.all(
                color: _pressed
                    ? FajiColors.primary.withOpacity(.7)
                    : FajiColors.borderDark,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(widget.icon, color: FajiColors.primary, size: 25),
                const SizedBox(height: 8),
                Text(
                  widget.label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
