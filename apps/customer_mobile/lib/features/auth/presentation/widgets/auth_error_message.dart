import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

/// Used in both inline and snackbar contexts; announces updates accessibly.
class AuthErrorMessage extends StatelessWidget {
  const AuthErrorMessage(this.message, {super.key, this.style});
  final String message;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) =>
      Semantics(liveRegion: true, child: Text(message, style: style));
}

enum AuthMessagePresentation { sheet, page }

/// One message path, preserving the existing sheet/page visual variants.
void showAuthMessage(
  BuildContext context,
  String message, {
  AuthMessagePresentation presentation = AuthMessagePresentation.page,
}) {
  final sheet = presentation == AuthMessagePresentation.sheet;
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: AuthErrorMessage(
        message,
        style: sheet
            ? const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              )
            : null,
      ),
      behavior: SnackBarBehavior.floating,
      backgroundColor: sheet ? FajiColors.primary : FajiColors.surfaceDark,
      margin: sheet ? const EdgeInsets.fromLTRB(20, 0, 20, 24) : null,
      shape: sheet
          ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))
          : null,
      duration: const Duration(seconds: 4),
    ),
  );
}
