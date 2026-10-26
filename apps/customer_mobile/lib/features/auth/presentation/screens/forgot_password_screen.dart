import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../domain/auth_input.dart';
import '../auth_scope.dart';
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
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final failure = await AuthScope.of(context).requestRecovery();
    if (!mounted) return;
    setState(() => _busy = false);
    showAuthMessage(
      context,
      failure?.message ?? 'Continue recovery in your account provider.',
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: FajiColors.backgroundDark,
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
            const Text(
              'Account recovery is awaiting the shared identity integration.',
              style: TextStyle(color: FajiColors.textSecondaryDark),
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
            AuthPrimaryButton.recovery(
              label: 'Send reset link',
              busy: _busy,
              onTap: _send,
            ),
          ],
        ),
      ),
    ),
  );
}
