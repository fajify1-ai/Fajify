import 'package:faji_flutter_core/security_screen.dart';
import 'package:flutter/material.dart';
import 'package:faji_flutter_core/better_auth.dart';
import 'package:faji_flutter_core/auth_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FajiApp());
}

class FajiApp extends StatefulWidget {
  const FajiApp({super.key, this.authClient});
  final FajiAuthClient? authClient;
  @override
  State<FajiApp> createState() => _FajiAppState();
}

class _FajiAppState extends State<FajiApp> with WidgetsBindingObserver {
  FajiAuthClient? client;
  Map<String, dynamic>? identity;
  String? error;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    const base = String.fromEnvironment('API_BASE_URL');
    if (widget.authClient != null || base.isNotEmpty) {
      client = widget.authClient ?? FajiAuthClient(baseUrl: base);
      _restore();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _restore();
  }

  Future<void> _restore() async {
    try {
      final session = await client?.session();
      final me = session == null ? null : await client!.identity();
      if (mounted) setState(() => identity = me);
    } catch (_) {
      if (mounted) setState(() => identity = null);
    }
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
      title: 'Faji Ride & Dispatch',
      home: client == null
          ? const Scaffold(body: Center(child: Text('Configure API_BASE_URL.')))
          : identity == null
              ? FajiAuthScreen(client: client!, onAuthenticated: _restore)
              : Scaffold(
                  appBar: AppBar(
                      title: const Text('Faji Ride & Dispatch'),
                      actions: [
                        Builder(
                            builder: (context) => IconButton(
                                tooltip: 'Account security',
                                icon: const Icon(Icons.security),
                                onPressed: () => Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                        builder: (_) => FajiSecurityScreen(
                                            client: client!))))),
                        TextButton(
                            onPressed: () async {
                              try {
                                await client!.signOut();
                                if (mounted) setState(() => identity = null);
                              } catch (_) {
                                if (mounted)
                                  setState(() =>
                                      error = 'Sign out failed. Please retry.');
                              }
                            },
                            child: const Text('Sign out'))
                      ]),
                  body: Center(
                      child: Text(error ??
                          ((identity!['roles'] as List).any(
                                  (r) => r == 'driver' || r == 'dispatcher')
                              ? 'Driver / Dispatcher workspace'
                              : 'Operational access requires approval.')))));
}
