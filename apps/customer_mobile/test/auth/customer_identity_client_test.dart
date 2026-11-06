import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/data/customer_identity_client.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';

void main() {
  final origin = Uri.parse('https://api.example.invalid');
  Matcher fails(AuthErrorCode code) =>
      throwsA(isA<AuthFailure>().having((error) => error.code, 'code', code));
  CustomerIdentityClient client(IdentityResponse response) =>
      CustomerIdentityClient(
        apiOrigin: origin,
        request: (_, _) async => response,
      );
  Future<CurrentCustomerIdentity> load(CustomerIdentityClient client) => client
      .load(accessToken: 'fixture-token', expectedSubject: 'fixture-subject');

  test(
    'uses published endpoint and binds immutable customer identity',
    () async {
      var calls = 0;
      final api = CustomerIdentityClient(
        apiOrigin: origin,
        request: (endpoint, token) async {
          calls++;
          expect(
            endpoint.toString(),
            'https://api.example.invalid/api/v1/auth/me',
          );
          expect(token, 'fixture-token');
          return (
            statusCode: 200,
            body: jsonEncode({
              'subject': 'fixture-subject',
              'roles': ['customer'],
            }),
          );
        },
      );
      final identity = await load(api);
      expect(identity.subject, 'fixture-subject');
      expect(identity.roles, ['customer']);
      expect(
        () => identity.roles.add('platform-admin'),
        throwsUnsupportedError,
      );
      expect(identity.toString(), isNot(contains('fixture-subject')));
      await load(api);
      expect(
        calls,
        2,
        reason: 'Active account checks must never use cached results',
      );
    },
  );

  test('rejects insecure or ambiguous API origins', () {
    for (final value in [
      'http://api.example.invalid',
      'https://user:password@api.example.invalid',
      'https://api.example.invalid/path',
      'https://api.example.invalid?query=1',
      'https://api.example.invalid#fragment',
    ]) {
      expect(
        () => CustomerIdentityClient(apiOrigin: Uri.parse(value)),
        throwsArgumentError,
      );
    }
  });

  test(
    'rejects missing identity and header injection before transport',
    () async {
      var calls = 0;
      final api = CustomerIdentityClient(
        apiOrigin: origin,
        request: (_, _) async {
          calls++;
          return (statusCode: 200, body: '{}');
        },
      );
      for (final token in ['', 'token\r\nInjected: value']) {
        await expectLater(
          api.load(accessToken: token, expectedSubject: 'fixture-subject'),
          fails(AuthErrorCode.invalidCredentials),
        );
      }
      await expectLater(
        api.load(accessToken: 'fixture-token', expectedSubject: ' '),
        fails(AuthErrorCode.invalidCredentials),
      );
      expect(calls, 0);
    },
  );

  test(
    'denies revoked, pending and suspended responses without leaking bodies',
    () async {
      await expectLater(
        load(client((statusCode: 401, body: 'private'))),
        fails(AuthErrorCode.invalidCredentials),
      );
      await expectLater(
        load(client((statusCode: 403, body: 'private'))),
        fails(AuthErrorCode.disabled),
      );
      for (final status in [302, 429, 500, 503]) {
        await expectLater(
          load(client((statusCode: status, body: 'private'))),
          fails(AuthErrorCode.network),
        );
      }
    },
  );

  test('rejects subject substitution and malformed backend identity', () async {
    for (final body in [
      'not JSON',
      'null',
      '[]',
      '{}',
      '{"subject":"other","roles":["customer"]}',
      '{"subject":"fixture-subject","roles":"customer"}',
      '{"subject":"fixture-subject","roles":["customer",42]}',
      '{"subject":"fixture-subject","roles":["customer",""]}',
      'x' * 65537,
    ]) {
      await expectLater(
        load(client((statusCode: 200, body: body))),
        fails(AuthErrorCode.operationFailed),
      );
    }
  });

  test('non-customer realm roles never grant the customer journey', () async {
    for (final roles in [
      <String>[],
      ['platform-admin'],
      ['Customer'],
    ]) {
      await expectLater(
        load(
          client((
            statusCode: 200,
            body: jsonEncode({'subject': 'fixture-subject', 'roles': roles}),
          )),
        ),
        fails(AuthErrorCode.disabled),
      );
    }
  });

  test('transport diagnostics are redacted', () async {
    final api = CustomerIdentityClient(
      apiOrigin: origin,
      request: (_, _) async {
        throw StateError('fixture-token private HTTP diagnostics');
      },
    );
    try {
      await load(api);
      fail('Transport failure must deny access');
    } on AuthFailure catch (error) {
      expect(error.code, AuthErrorCode.operationFailed);
      expect(error.message, isNot(contains('fixture-token')));
      expect(error.toString(), isNot(contains('private')));
    }
  });
}
