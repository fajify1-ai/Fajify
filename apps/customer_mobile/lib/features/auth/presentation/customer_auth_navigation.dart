import 'package:flutter/material.dart';

import '../../../main.dart';
import '../application/auth_controller.dart';

/// One completion path for sign-in, registration, verification and recovery.
bool continueToCustomerHome(BuildContext context, AuthController controller) {
  if (!context.mounted || !controller.canAccessCustomer) return false;
  Navigator.of(context)
      .pushNamedAndRemoveUntil(FajiRoutes.userHome, (_) => false);
  return true;
}

Future<void> verifyEmailAndContinue(
  BuildContext context,
  AuthController controller,
) async {
  await controller.verifyEmail();
  if (context.mounted) continueToCustomerHome(context, controller);
}
