import 'package:flutter/material.dart';

import '../../domain/auth_session.dart';
import 'auth_error_message.dart';

/// Reused by the account sheet and recovery page. Only verified state decides
/// access; an action request never produces an email-sent/success assertion.
class AuthStatusView extends StatelessWidget {
  const AuthStatusView({
    super.key,
    required this.state,
    this.authenticatingMessage,
  });
  final AuthState state;
  final String? authenticatingMessage;

  @override
  Widget build(BuildContext context) {
    final message =
        (state.failure?.code == AuthErrorCode.verificationRequired
            ? 'Your account profile needs attention. Please contact support.'
            : state.failure?.message) ??
        switch (state.status) {
          AuthStatus.verificationRequired =>
            'Your account profile needs attention. Please contact support.',
          AuthStatus.expired => 'Your session expired. Please sign in again.',
          AuthStatus.authenticating =>
            authenticatingMessage ?? 'Continue in the secure account browser.',
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
        children: [AuthErrorMessage(message)],
      ),
    );
  }
}
