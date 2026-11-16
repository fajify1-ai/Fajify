import 'package:flutter/material.dart';
import 'better_auth.dart';

class FajiSecurityScreen extends StatefulWidget {
  const FajiSecurityScreen({super.key, required this.client});
  final FajiAuthClient client;
  @override
  State<FajiSecurityScreen> createState() => _FajiSecurityScreenState();
}

class _FajiSecurityScreenState extends State<FajiSecurityScreen> {
  final password = TextEditingController(),
      code = TextEditingController(),
      phone = TextEditingController(),
      backup = TextEditingController();
  String message = '', setup = '';
  List<String> codes = [];
  bool busy = false;
  @override
  void dispose() {
    password.dispose();
    code.dispose();
    phone.dispose();
    backup.dispose();
    super.dispose();
  }

  Future<void> run(String action) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final Map<String, dynamic>? data;
      if (action == 'send-phone') {
        await widget.client.sendPhoneOtp(phone.text);
        data = null;
      } else {
        data = await widget.client.security(action,
            password: password.text,
            code: code.text,
            phone: phone.text,
            backupCode: backup.text);
      }
      if (mounted)
        setState(() {
          message = 'Completed';
          if (data?['totpURI'] is String)
            setup = Uri.parse(data!['totpURI'] as String)
                    .queryParameters['secret'] ??
                '';
          if (data?['backupCodes'] is List)
            codes = (data!['backupCodes'] as List).cast<String>();
          if (action == 'verify' || action == 'disable') setup = '';
        });
    } catch (e) {
      if (mounted)
        setState(() => message =
            e is FajiAuthException ? e.message : 'Unable to connect. Retry.');
    } finally {
      password.clear();
      code.clear();
      backup.clear();
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Account security')),
      body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const Text(
                'MFA is optional. Reauthenticate before changing a verified phone or removing MFA.'),
            TextField(
                controller: password,
                obscureText: true,
                autocorrect: false,
                enableSuggestions: false,
                decoration:
                    const InputDecoration(labelText: 'Current password')),
            TextField(
                controller: code,
                decoration: const InputDecoration(
                    labelText: 'Authenticator or phone code')),
            TextField(
                controller: backup,
                decoration: const InputDecoration(
                    labelText: 'MFA recovery code for reauthentication')),
            TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone number')),
            Wrap(children: [
              for (final entry in const {
                'step-up': 'Reauthenticate',
                'enable': 'Enroll authenticator',
                'verify': 'Verify enrollment',
                'disable': 'Disable MFA',
                'codes': 'Replace recovery codes',
                'send-phone': 'Send phone OTP',
                'verify-phone': 'Verify phone',
                'unlink': 'Revoke phone'
              }.entries)
                TextButton(
                    onPressed: busy ? null : () => run(entry.key),
                    child: Text(entry.value))
            ]),
            if (setup.isNotEmpty)
              SelectableText('Authenticator setup key: $setup'),
            if (codes.isNotEmpty) ...[
              const Text('Save these recovery codes offline. Each works once.'),
              SelectableText(codes.join('\n')),
              TextButton(
                  onPressed: () => setState(() => codes = []),
                  child: const Text('I saved my codes'))
            ],
            Semantics(liveRegion: true, child: Text(message)),
          ])));
}
