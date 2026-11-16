import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:faji_flutter_core/better_auth.dart';
import 'package:faji_ride_dispatch/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const key = 'faji.better_auth.https://api.example.test.session';
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets(
      'driver login and remote logout use the embedded form and secure token',
      (tester) async {
    final client = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        client: MockClient((req) async {
          if (req.url.path == '/api/auth/sign-in/email')
            return http.Response(jsonEncode({'token': 'driver-session'}), 200);
          if (req.url.path == '/api/auth/sign-out') {
            expect(req.headers['authorization'], 'Bearer driver-session');
            return http.Response('{}', 200);
          }
          return http.Response(
              jsonEncode({
                'subject': 'driver',
                'roles': ['driver']
              }),
              200);
        }));
    await tester.pumpWidget(FajiApp(authClient: client));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byType(TextFormField).first, 'driver@example.test');
    await tester.enterText(
        find.byType(TextFormField).last, 'test-password-123');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('Driver / Dispatcher workspace'), findsOneWidget);
    expect(await const FlutterSecureStorage().read(key: key), 'driver-session');
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Driver / Dispatcher workspace'), findsNothing);
    expect(await const FlutterSecureStorage().read(key: key), null);
  });
  testWidgets(
      'dispatcher restoration is revalidated on resume and revoked sessions close the workspace',
      (tester) async {
    await const FlutterSecureStorage()
        .write(key: key, value: 'dispatcher-session');
    bool revoked = false;
    final client = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        client: MockClient((req) async {
          if (req.url.path == '/api/auth/get-session')
            return http.Response(
                revoked
                    ? 'null'
                    : jsonEncode({
                        'user': {'id': 'dispatcher'},
                        'session': {'id': 'session'}
                      }),
                200);
          return http.Response(
              jsonEncode({
                'subject': 'dispatcher',
                'roles': ['dispatcher']
              }),
              200);
        }));
    await tester.pumpWidget(FajiApp(authClient: client));
    await tester.pumpAndSettle();
    expect(find.text('Driver / Dispatcher workspace'), findsOneWidget);
    revoked = true;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Driver / Dispatcher workspace'), findsNothing);
    expect(await const FlutterSecureStorage().read(key: key), null);
  });
  testWidgets(
      'network failure never grants a driver workspace from cached metadata',
      (tester) async {
    await const FlutterSecureStorage().write(key: key, value: 'saved-session');
    final client = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        client: MockClient((_) async => throw http.ClientException('offline')));
    await tester.pumpWidget(FajiApp(authClient: client));
    await tester.pumpAndSettle();
    expect(find.text('Driver / Dispatcher workspace'), findsNothing);
    expect(await const FlutterSecureStorage().read(key: key), 'saved-session');
  });
}
