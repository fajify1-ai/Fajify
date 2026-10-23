import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class AuthSegmentedControl extends StatelessWidget {
  const AuthSegmentedControl({
    super.key,
    required this.registerSelected,
    required this.onChanged,
  });
  final bool registerSelected;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: const Color(0xFF292929),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 240),
            curve: Curves.easeOutCubic,
            alignment: registerSelected
                ? Alignment.centerRight
                : Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: .5,
              heightFactor: 1,
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1B1B1B),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: _Tab(
                  label: 'Sign In',
                  selected: !registerSelected,
                  onTap: () => onChanged(false),
                ),
              ),
              Expanded(
                child: _Tab(
                  label: 'Register',
                  selected: registerSelected,
                  onTap: () => onChanged(true),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Center(
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 220),
            style: TextStyle(
              color: selected
                  ? FajiColors.primary
                  : FajiColors.textSecondaryDark,
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
            child: Text(label),
          ),
        ),
      ),
    );
  }
}
