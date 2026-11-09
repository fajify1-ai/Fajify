import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class FajiAuthTextField extends StatelessWidget {
  const FajiAuthTextField({
    super.key,
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.textInputAction,
    this.prefixText,
    this.suffixIcon,
    this.onTap,
    this.readOnly = false,
    this.obscureText = false,
    this.validator,
    this.onChanged,
    this.autofillHints,
    this.recoveryAppearance = false,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final String? prefixText;
  final Widget? suffixIcon;
  final VoidCallback? onTap;
  final bool readOnly;
  final bool obscureText;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final Iterable<String>? autofillHints;

  /// Existing recovery field uses theme padding/focus borders and text size.
  final bool recoveryAppearance;

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    keyboardType: keyboardType,
    textInputAction: textInputAction,
    readOnly: readOnly,
    obscureText: obscureText,
    autofillHints: autofillHints,
    onTap: onTap,
    onFieldSubmitted: (_) {
      if (textInputAction == TextInputAction.next) {
        FocusScope.of(context).nextFocus();
      }
    },
    validator: validator,
    onChanged: onChanged,
    style: TextStyle(
      color: FajiColors.textPrimary,
      fontSize: recoveryAppearance ? null : 14,
    ),
    decoration: InputDecoration(
      hintText: hint,
      prefixText: prefixText,
      prefixStyle: const TextStyle(
        color: FajiColors.textSecondary,
        fontSize: 16,
      ),
      suffixIcon: suffixIcon,
      hintStyle: const TextStyle(color: FajiColors.textSecondary),
      filled: true,
      fillColor: const Color(0xFFF4F4F4),
      contentPadding: recoveryAppearance
          ? null
          : const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: FajiColors.border),
      ),
      enabledBorder: recoveryAppearance
          ? null
          : OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: FajiColors.border),
            ),
      focusedBorder: recoveryAppearance
          ? null
          : OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: FajiColors.primary, width: 1),
            ),
    ),
  );
}
