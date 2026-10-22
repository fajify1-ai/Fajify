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
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    keyboardType: keyboardType,
    textInputAction: textInputAction,
    readOnly: readOnly,
    obscureText: obscureText,
    onTap: onTap,
    onFieldSubmitted: (_) {
      if (textInputAction == TextInputAction.next) {
        FocusScope.of(context).nextFocus();
      }
    },
    validator: validator,
    onChanged: onChanged,
    style: const TextStyle(color: FajiColors.textPrimaryDark, fontSize: 16),
    decoration: InputDecoration(
      hintText: hint,
      prefixText: prefixText,
      prefixStyle: const TextStyle(
        color: FajiColors.textSecondaryDark,
        fontSize: 16,
      ),
      suffixIcon: suffixIcon,
      hintStyle: const TextStyle(color: FajiColors.textSecondaryDark),
      filled: true,
      fillColor: const Color(0xFF252525),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: FajiColors.primary, width: 1),
      ),
    ),
  );
}
