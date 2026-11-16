import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:faji_flutter_core/better_auth.dart';
import 'package:faji_app/features/auth/data/better_auth_repository.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('native registration normalizes form profile and verifies backend access before opening home', () async {
    FlutterSecureStorage.setMockInitialValues({});
    final paths = <String>[];
    final client = FajiAuthClient(
      baseUrl: 'https://api.example.test',
      client: MockClient((request) async {
        paths.add(request.url.path);
        switch (request.url.path) {
          case '/api/auth/sign-up/email':
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            expect(body['phoneNumber'], '+2348012345678');
            expect(body['dateOfBirth'], '1998-01-02');
            expect(body['termsAccepted'], true);
            expect(body['username'], 'ada');
            expect(body['homeAddress'], 'Test address');
            return http.Response(jsonEncode({'token': 'opaque-session'}), 200);
          case '/api/auth/get-session':
            expect(request.headers['authorization'], 'Bearer opaque-session');
            return http.Response(
              jsonEncode({
                'user': {'id': 'subject', 'emailVerified': false},
                'session': {
                  'expiresAt': DateTime.now()
                      .add(const Duration(days: 7))
                      .toUtc()
                      .toIso8601String(),
                },
              }),
              200,
            );
          case '/api/v1/auth/me':
            expect(request.headers['authorization'], 'Bearer opaque-session');
            return http.Response(
              jsonEncode({
                'subject': 'subject',
                'roles': ['customer'],
              }),
              200,
            );
          default:
            throw StateError('Unexpected request');
        }
      }),
    );
    final session = await BetterAuthRepository(client).register(
      const LegacyRegistration(
        email: 'ada@example.test',
        password: 'test-password-123',
        fullName: 'Ada Okafor',
        username: ' ada ',
        phone: '08012345678',
        dateOfBirth: '01/02/1998',
        homeAddress: ' Test address ',
        termsAccepted: true,
      ),
    );
    expect(session.subject, 'subject');
    expect(session.customerAccess, true);
    expect(paths, [
      '/api/auth/sign-up/email',
      '/api/auth/get-session',
      '/api/v1/auth/me',
    ]);
  });
}
