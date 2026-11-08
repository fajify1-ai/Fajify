import 'package:flutter/material.dart';

import 'faji_colors.dart';

abstract final class FajiTheme {
  static ThemeData get light => ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: FajiColors.background,
    colorScheme: const ColorScheme.light(
      primary: FajiColors.primary,
      surface: FajiColors.surface,
      onSurface: FajiColors.textPrimary,
      onPrimary: Colors.white,
      outline: FajiColors.border,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: FajiColors.background,
      foregroundColor: FajiColors.textPrimary,
      surfaceTintColor: Colors.transparent,
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: FajiColors.surface,
      contentTextStyle: TextStyle(color: FajiColors.textPrimary),
    ),
    fontFamily: 'Arial',
    useMaterial3: true,
  );
}
