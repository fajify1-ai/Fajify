import 'package:faji_flutter_core/auth_screen.dart';
import 'package:faji_flutter_core/better_auth.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../domain/auth_input.dart';
import '../auth_scope.dart';
import '../customer_auth_navigation.dart';
import '../widgets/auth_status_view.dart';
import '../widgets/auth_error_message.dart';
import '../widgets/auth_form_layout.dart';
import '../widgets/auth_primary_button.dart';
import '../widgets/faji_auth_text_field.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final auth = AuthScope.of(context);
    if (_busy || auth.isBusy || !(_form.currentState?.validate() ?? false)) {
      return;
    }
    setState(() => _busy = true);
    final failure = await auth.requestRecovery(_email.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (continueToCustomerHome(context, auth)) return;
    showAuthMessage(
      context,
      failure?.message ?? 'If the account exists, a recovery email was sent.',
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: FajiColors.background,
    appBar: AppBar(backgroundColor: Colors.transparent),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(30),
        child: AuthFormLayout(
          formKey: _form,
          children: [
            const Text(
              'FAJI ACCOUNT',
              style: TextStyle(
                color: FajiColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Reset your password',
              style: TextStyle(fontSize: 27, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Text(
              'Enter your email to receive a recovery link. Paste the link into the in-app reset form.',
              style: const TextStyle(color: FajiColors.textSecondary),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => FajiAuthScreen(
                    client: FajiAuthClient(
                      baseUrl: const String.fromEnvironment('API_BASE_URL'),
                    ),
                    onAuthenticated: () => Navigator.of(context).pop(),
                  ),
                ),
              ),
              child: const Text('Recovery or phone sign-in'),
            ),
            const SizedBox(height: 28),
            FajiAuthTextField(
              controller: _email,
              hint: 'you@email.com',
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.email],
              recoveryAppearance: true,
              validator: AuthInput.email,
            ),
            const SizedBox(height: 20),
            AuthStatusView(state: AuthScope.of(context).state),
            AuthPrimaryButton.recovery(
              label: 'Send reset link',
              busy: _busy || AuthScope.of(context).isBusy,
              onTap: _send,
            ),
          ],
        ),
      ),
    ),
  );
}
