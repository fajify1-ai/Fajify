import 'package:flutter/material.dart';

import 'better_auth.dart';

/// Shared native forms. Recovery links may be pasted here without opening a browser.
class FajiAuthScreen extends StatefulWidget {
  const FajiAuthScreen({
    super.key,
    required this.client,
    required this.onAuthenticated,
    this.onPasswordReset,
  });
  final FajiAuthClient client;
  final VoidCallback onAuthenticated;
  final VoidCallback? onPasswordReset;
  @override
  State<FajiAuthScreen> createState() => _FajiAuthScreenState();
}

class _FajiAuthScreenState extends State<FajiAuthScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController(),
      _password = TextEditingController(),
      _name = TextEditingController(),
      _token = TextEditingController();
  String _mode = 'login', _message = '';
  bool _busy = false;
  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _token.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _message = '';
    });
    try {
      switch (_mode) {
        case 'login':
          await widget.client.signIn(_email.text, _password.text);
          break;
        case 'register':
          await widget.client.register(_name.text, _email.text, _password.text);
          break;
        case 'recover':
          await widget.client.recover(_email.text);
          if (mounted)
            setState(
              () => _message =
                  'If the account exists, a recovery email was sent.',
            );
          return;
        case 'reset':
          final uri = Uri.tryParse(_token.text.trim());
          await widget.client.reset(
            uri?.queryParameters['token'] ?? _token.text.trim(),
            _password.text,
          );
          if (mounted) widget.onPasswordReset?.call();
          if (mounted)
            setState(() {
              _message = 'Password updated. Sign in with your new password.';
              _mode = 'login';
              _password.clear();
            });
          return;
      }
      await widget.client.identity();
      if (mounted) widget.onAuthenticated();
    } catch (error) {
      if (mounted)
        setState(
          () => _message = error is FajiAuthException
              ? error.message
              : 'Unable to connect. Please retry.',
        );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    bool password = false,
  }) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: TextFormField(
          controller: controller,
          obscureText: password,
          autocorrect: !password,
          enableSuggestions: !password,
          decoration: InputDecoration(labelText: label),
          validator: (value) => value == null || value.trim().isEmpty
              ? 'Required'
              : password && _mode != 'login' && value.length < 12
                  ? 'Use at least 12 characters'
                  : null,
        ),
      );
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Faji account')),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _form,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_mode == 'register') _field('Name', _name),
                    if (_mode != 'reset') _field('Email', _email),
                    if (_mode == 'reset')
                      _field('Recovery link or token', _token),
                    if (_mode != 'recover')
                      _field('Password', _password, password: true),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: Text(_busy ? 'Please wait…' : 'Continue'),
                    ),
                    Semantics(liveRegion: true, child: Text(_message)),
                    Wrap(
                      children: [
                        for (final entry in const {
                          'login': 'Sign in',
                          'register': 'Register',
                          'recover': 'Forgot password',
                          'reset': 'Use recovery link',
                        }.entries)
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                      _mode = entry.key;
                                      _message = '';
                                      _password.clear();
                                    }),
                            child: Text(entry.value),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}
