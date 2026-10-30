import 'package:flutter/material.dart';

import '../../domain/auth_session.dart';
import 'auth_error_message.dart';
import 'auth_primary_button.dart';

/// Reused by the account sheet and recovery page. Only verified state decides
/// access; an action request never produces an email-sent/success assertion.
class AuthStatusView extends StatelessWidget {
  const AuthStatusView({super.key, required this.state, this.onVerifyEmail});
  final AuthState state;
  final VoidCallback? onVerifyEmail;

  @override
  Widget build(BuildContext context) {
    final message =
        state.failure?.message ??
        switch (state.status) {
          AuthStatus.verificationRequired =>
            'Verify your email in the secure account provider, then try again.',
          AuthStatus.expired => 'Your session expired. Please sign in again.',
          AuthStatus.authenticating =>
            'Continue in the secure account browser.',
          AuthStatus.signingOut => 'Signing out of your account.',
          AuthStatus.authenticated when state.session?.customerAccess != true =>
            'This account does not have customer access.',
          _ => null,
        };
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AuthErrorMessage(message),
          if (state.status == AuthStatus.verificationRequired &&
              onVerifyEmail != null) ...[
            const SizedBox(height: 12),
            AuthPrimaryButton(
              label: 'Verify email in browser',
              onTap: onVerifyEmail!,
            ),
          ],
        ],
      ),
    );
  }
}
