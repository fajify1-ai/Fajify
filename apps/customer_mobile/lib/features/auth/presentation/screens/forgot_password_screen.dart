import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _busy = false;
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final email = _email.text.trim().toLowerCase();
    if (email.isEmpty || !email.contains('@')) {
      _message('Enter a valid email address.');
      return;
    }
    setState(() => _busy = true);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (mounted) {
      setState(() => _busy = false);
      _message('Password reset will be connected when Firebase is configured.');
    }
  }

  void _message(String text) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(text),
      behavior: SnackBarBehavior.floating,
      backgroundColor: FajiColors.surfaceDark,
    ),
  );
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      appBar: AppBar(backgroundColor: Colors.transparent),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
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
                'Enter your email and we will send you a reset link.',
                style: TextStyle(color: FajiColors.textSecondaryDark),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'you@email.com',
                  hintStyle: const TextStyle(
                    color: FajiColors.textSecondaryDark,
                  ),
                  filled: true,
                  fillColor: const Color(0xFF252525),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 62,
                child: FilledButton(
                  onPressed: _busy ? null : _send,
                  style: FilledButton.styleFrom(
                    backgroundColor: FajiColors.primary,
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Send reset link'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
