import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:faji_flutter_core/better_auth.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  const key = 'faji.better_auth.https://api.example.test.session';
  test(
    'credentials stay in the request and only opaque session token is stored',
    () async {
      final store = const FlutterSecureStorage();
      final auth = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        storage: store,
        client: MockClient((request) async {
          expect(request.url.path, '/api/auth/sign-in/email');
          expect(request.headers.containsKey('authorization'), false);
          expect(jsonDecode(request.body), {
            'email': 'user@example.test',
            'password': 'private-password-123',
          });
          return http.Response(
            jsonEncode({
              'token': 'opaque-session',
              'user': {'id': 'subject'},
            }),
            200,
          );
        }),
      );
      await auth.signIn(' user@example.test ', 'private-password-123');
      expect(await store.readAll(), {key: 'opaque-session'});
    },
  );
  test(
    'restoration validates saved token and drops it on unauthorized response',
    () async {
      final store = const FlutterSecureStorage();
      await store.write(key: key, value: 'expired-session');
      final auth = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        storage: store,
        client: MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer expired-session');
          return http.Response('{}', 401);
        }),
      );
      await expectLater(auth.session(), throwsA(isA<FajiAuthException>()));
      expect(await store.read(key: key), null);
    },
  );
  test('logout revokes server session before deleting local token', () async {
    final store = const FlutterSecureStorage();
    await store.write(key: key, value: 'session');
    final auth = FajiAuthClient(
      baseUrl: 'https://api.example.test',
      storage: store,
      client: MockClient((request) async {
        expect(await store.read(key: key), 'session');
        expect(request.url.path, '/api/auth/sign-out');
        return http.Response('{}', 200);
      }),
    );
    await auth.signOut();
    expect(await store.read(key: key), null);
  });
  test(
    'network failure during logout keeps token available for revocation retry',
    () async {
      final store = const FlutterSecureStorage();
      await store.write(key: key, value: 'session');
      final auth = FajiAuthClient(
        baseUrl: 'https://api.example.test',
        storage: store,
        client: MockClient((request) async => http.Response('{}', 503)),
      );
      await expectLater(auth.signOut(), throwsA(isA<FajiAuthException>()));
      expect(await store.read(key: key), 'session');
    },
  );
  test('password reset sends token and new password without creating a local session', () async {
    final store = const FlutterSecureStorage();
    final auth = FajiAuthClient(
      baseUrl: 'https://api.example.test',
      storage: store,
      client: MockClient((request) async {
        expect(request.url.path, '/api/auth/reset-password');
        expect(jsonDecode(request.body), {
          'token': 'single-use-token',
          'newPassword': 'new-password-123',
        });
        return http.Response('{}', 200);
      }),
    );
    await auth.reset('single-use-token', 'new-password-123');
    expect(await store.readAll(), isEmpty);
  });
  test('native authentication rejects insecure remote endpoints', () {
    expect(
      () => FajiAuthClient(baseUrl: 'http://api.example.test'),
      throwsA(isA<FajiAuthException>()),
    );
  });
}
