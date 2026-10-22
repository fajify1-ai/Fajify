import 'package:flutter/material.dart';

import 'faji_colors.dart';

abstract final class FajiTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: FajiColors.backgroundDark,
    colorScheme: const ColorScheme.dark(
      primary: FajiColors.primary,
      surface: FajiColors.surfaceDark,
    ),
    fontFamily: 'Arial',
    useMaterial3: true,
  );
}
