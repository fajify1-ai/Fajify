import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:faji_flutter_core/better_auth.dart';

/// Real platform storage and transport; run only against an approved private disposable API.
void nativeAcceptance() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
      'native registration, keychain restoration, logout and revoked-token rejection',
      (tester) async {
    const base = String.fromEnvironment('API_BASE_URL');
    if (base.isEmpty)
      throw TestFailure(
          'API_BASE_URL must identify an approved private disposable API');
    const fixtureSecret = String.fromEnvironment('FAJI_FIXTURE_SECRET');
    if (fixtureSecret.length < 32) {
      throw TestFailure('A private disposable fixture credential is required');
    }
    final preflight = await http
        .get(Uri.parse(base).resolve('/__fixture/status'), headers: {
      'x-fixture-secret': fixtureSecret
    }).timeout(const Duration(seconds: 10));
    if (preflight.statusCode != 200) {
      throw TestFailure('Target is not the approved disposable fixture');
    }
    final marker = jsonDecode(preflight.body) as Map<String, dynamic>;
    if (marker['disposable'] != true ||
        !RegExp(r'^fajify_m[1-8]_test_[a-z0-9_]+$')
            .hasMatch(marker['name'] as String? ?? '')) {
      throw TestFailure('Disposable target marker missing');
    }
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: Text('Private native auth acceptance'))));
    final random = Random.secure();
    final nonce = List.generate(
            16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'))
        .join();
    final password = 'native-acceptance-$nonce';
    final first = FajiAuthClient(baseUrl: base);
    const store = FlutterSecureStorage();
    final key = 'faji.better_auth.${Uri.parse(base).origin}.session';
    await first.register(
        'Native Acceptance', 'native-$nonce@example.test', password);
    final token = await store.read(key: key);
    expect(token != null && token.isNotEmpty, true);
    final restored = FajiAuthClient(baseUrl: base);
    expect(await restored.session() != null, true);
    final identity = await restored.identity();
    expect((identity['roles'] as List).contains('customer'), true);
    await restored.signOut();
    expect(await store.read(key: key), null);
    await store.write(key: key, value: token);
    await expectLater(first.identity(), throwsA(isA<FajiAuthException>()));
    expect(await store.read(key: key), null);
  }, timeout: const Timeout(Duration(minutes: 2)));
}
