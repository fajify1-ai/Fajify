import 'dart:convert';

import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/data/native_password_sign_in.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/presentation/auth_scope.dart';
import 'package:faji_app/features/auth/presentation/screens/user_auth_screen.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_primary_button.dart';
import 'package:faji_app/features/auth/presentation/widgets/faji_auth_text_field.dart';
import 'package:faji_app/core/theme/faji_theme.dart';
import 'package:faji_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'native_oidc_test.dart' as fixtures;

void main() {
  final tokenBody = jsonEncode({
    'access_token': 'access-one',
    'refresh_token': 'refresh-one',
    'id_token': 'id-one',
    'expires_in': 300,
    'token_type': 'Bearer',
  });

  testWidgets(
    'native form reports bad credentials then signs in without opening browser',
    (tester) async {
      final gateway = fixtures.Gateway();
      var calls = 0;
      final repository = NativeKeycloakRepository(
        settings: fixtures.settings(),
        gateway: gateway,
        store: fixtures.MemoryStore(),
        accounts: fixtures.Accounts()..emailVerified = false,
        clock: () => fixtures.now,
        passwordSignIn: NativePasswordSignIn(
          fixtures.settings(),
          clock: () => fixtures.now,
          request: (_, fields) async {
            calls++;
            expect(fields['username'], 'test-user');
            return fields['password'] == 'correct-test-only'
                ? (statusCode: 200, body: tokenBody)
                : (statusCode: 400, body: '{"error":"invalid_grant"}');
          },
        ),
      );
      final controller = AuthController(repository, clock: () => fixtures.now);
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        AuthScope(
          controller: controller,
          child: MaterialApp(
            theme: FajiTheme.light,
            home: const UserAuthScreen(),
            routes: {
              FajiRoutes.userHome: (_) =>
                  const Scaffold(body: Text('Customer home')),
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(FajiAuthTextField).first, 'test-user');
      await tester.enterText(
        find.byType(FajiAuthTextField).last,
        'wrong-test-only',
      );
      await tester.tap(find.widgetWithText(AuthPrimaryButton, 'Sign In'));
      await tester.pumpAndSettle();
      expect(
        find.text('Incorrect email, username or password.'),
        findsOneWidget,
      );
      expect(controller.canAccessCustomer, isFalse);
      await tester.enterText(
        find.byType(FajiAuthTextField).last,
        'correct-test-only',
      );
      await tester.tap(find.widgetWithText(AuthPrimaryButton, 'Sign In'));
      await tester.pumpAndSettle();
      expect(calls, 2);
      expect(controller.canAccessCustomer, isTrue);
      expect(find.text('Customer home'), findsOneWidget);
      expect(controller.state.session!.emailVerified, isFalse);
      expect(gateway.journey, isNull);
      await controller.signOut();
      await tester.pumpAndSettle();
    },
  );

  test(
    'in-app login verifies account before storing tokens and granting access',
    () async {
      final store = fixtures.MemoryStore();
      final accounts = fixtures.Accounts();
      final gateway = fixtures.Gateway();
      final repository = NativeKeycloakRepository(
        settings: fixtures.settings(),
        gateway: gateway,
        store: store,
        accounts: accounts,
        clock: () => fixtures.now,
        passwordSignIn: NativePasswordSignIn(
          fixtures.settings(),
          clock: () => fixtures.now,
          request: (uri, fields) async {
            expect(
              uri.toString(),
              '${fixtures.settings().issuer}/protocol/openid-connect/token',
            );
            expect(uri.scheme, 'https');
            expect(fields['username'], 'MixedCaseUser');
            expect(fields['password'], 'test-only-password');
            expect(fields['grant_type'], 'password');
            expect(fields.containsKey('client_secret'), isFalse);
            return (statusCode: 200, body: tokenBody);
          },
        ),
      );
      final controller = AuthController(repository, clock: () => fixtures.now);
      addTearDown(controller.dispose);
      await controller.signIn(' MixedCaseUser ', 'test-only-password');
      expect(controller.canAccessCustomer, isTrue);
      expect(accounts.checks, 1);
      expect(
        gateway.journey,
        isNull,
        reason: 'Password login must not open the browser',
      );
      expect(store.value, isNot(contains('test-only-password')));
      expect(store.value, isNot(contains('access-one')));

      accounts.error = const AuthFailure(
        AuthErrorCode.disabled,
        'Account unavailable.',
      );
      await controller.signIn('MixedCaseUser', 'test-only-password');
      expect(controller.canAccessCustomer, isFalse);
      expect(store.value, isNull);
    },
  );

  test(
    'credential errors, required setup and throttling remain typed',
    () async {
      for (final fixture in [
        (
          status: 400,
          body:
              '{"error":"invalid_grant","error_description":"private details"}',
          code: AuthErrorCode.invalidCredentials,
        ),
        (
          status: 400,
          body: '{"error":"invalid_grant","error_description":"Account is not fully set up"}',
          code: AuthErrorCode.providerUnavailable,
        ),
        (status: 429, body: '', code: AuthErrorCode.rateLimited),
        (
          status: 400,
          body: '{"error":"unauthorized_client"}',
          code: AuthErrorCode.providerUnavailable,
        ),
        (status: 302, body: '', code: AuthErrorCode.operationFailed),
        (status: 200, body: '{}', code: AuthErrorCode.operationFailed),
      ]) {
        final signIn = NativePasswordSignIn(
          fixtures.settings(),
          request: (_, _) async =>
              (statusCode: fixture.status, body: fixture.body),
        );
        await expectLater(
          signIn.signIn('user', 'test-only-password'),
          throwsA(
            isA<AuthFailure>()
                .having((e) => e.code, 'code', fixture.code)
                .having(
                  (e) => e.message,
                  'message',
                  isNot(contains('private details')),
                ),
          ),
        );
      }
    },
  );

  test('missing credentials never make a network request', () async {
    final signIn = NativePasswordSignIn(
      fixtures.settings(),
      request: (_, _) async {
        fail('Must validate credentials before posting');
      },
    );
    await expectLater(signIn.signIn('', 'secret'), throwsA(isA<AuthFailure>()));
    await expectLater(signIn.signIn('user', ''), throwsA(isA<AuthFailure>()));
  });
}
