import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/native_customer_registration.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/data/native_password_sign_in.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';
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

const data = LegacyRegistration(
  email: 'test@example.invalid',
  password: 'test-only-password',
  fullName: 'Test Customer',
  username: 'test.customer',
  phone: '08012345678',
  dateOfBirth: '01/02/1998',
  homeAddress: 'Test Street, Lagos',
  termsAccepted: true,
);

void main() {
  test('registration submits every profile field to HTTPS API and maps duplicate errors', () async {
    final adapter = NativeCustomerRegistration(
      fixtures.settings(),
      request: (uri, body) async {
        expect(
          uri.toString(),
          '${fixtures.settings().apiOrigin}/api/v1/auth/register',
        );
        expect(body, {
          'fullName': data.fullName,
          'username': data.username,
          'email': data.email,
          'phone': '+2348012345678',
          'dateOfBirth': '1998-01-02',
          'homeAddress': data.homeAddress,
          'password': data.password,
          'termsAccepted': true,
        });
        expect(body.containsKey('client_secret'), isFalse);
        return (statusCode: 201, body: '{"created":true}');
      },
    );
    await adapter.create(data);
    final duplicate = NativeCustomerRegistration(
      fixtures.settings(),
      request: (_, _) async => (statusCode: 409, body: ''),
    );
    await expectLater(
      duplicate.create(data),
      throwsA(
        isA<AuthFailure>().having(
          (e) => e.code,
          'code',
          AuthErrorCode.accountExists,
        ),
      ),
    );
  });

  testWidgets(
    'all eight production registration boxes are reachable; accepted terms create account and sign in without browser',
    (tester) async {
      var creates = 0;
      final gateway = fixtures.Gateway();
      final store = fixtures.MemoryStore();
      final repo = NativeKeycloakRepository(
        settings: fixtures.settings(),
        gateway: gateway,
        store: store,
        accounts: fixtures.Accounts()..emailVerified = false,
        clock: () => fixtures.now,
        registration: NativeCustomerRegistration(
          fixtures.settings(),
          request: (_, body) async {
            creates++;
            expect(body['termsAccepted'], true);
            return (statusCode: 201, body: '{"created":true}');
          },
        ),
        passwordSignIn: NativePasswordSignIn(
          fixtures.settings(),
          clock: () => fixtures.now,
          request: (_, body) async {
            expect(body['username'], data.username);
            return (
              statusCode: 200,
              body: '{"access_token":"access-one","refresh_token":"refresh-one","id_token":"id-one","expires_in":300,"token_type":"Bearer"}',
            );
          },
        ),
      );
      final controller = AuthController(repo, clock: () => fixtures.now);
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        AuthScope(
          controller: controller,
          child: MaterialApp(
            theme: FajiTheme.light,
            home: const UserAuthScreen(),
            routes: {
              FajiRoutes.userHome: (_) =>
                  const Scaffold(body: Text('New customer home')),
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Register'));
      await tester.pumpAndSettle();
      final fields = find.byType(FajiAuthTextField);
      expect(fields, findsNWidgets(8));
      final values = [
        data.fullName,
        data.username,
        data.email,
        data.phone,
        data.dateOfBirth,
        data.homeAddress,
        data.password,
        data.password,
      ];
      for (var i = 0; i < 8; i++) {
        await tester.ensureVisible(fields.at(i));
        await tester.pumpAndSettle();
        expect(fields.at(i).hitTestable(), findsOneWidget);
        tester.widget<FajiAuthTextField>(fields.at(i)).controller.text =
            values[i];
      }
      final create = find.widgetWithText(AuthPrimaryButton, 'Create Account');
      await tester.ensureVisible(create);
      await tester.pumpAndSettle();
      await tester.tap(create);
      await tester.pumpAndSettle();
      expect(
        creates,
        0,
        reason: 'Terms are required before any account request',
      );
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byType(Checkbox));
      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      await tester.ensureVisible(create);
      await tester.pumpAndSettle();
      await tester.tap(create);
      await tester.pumpAndSettle();
      expect(creates, 1);
      expect(controller.canAccessCustomer, true);
      expect(find.text('New customer home'), findsOneWidget);
      expect(gateway.journey, isNull);
      expect(store.value, isNot(contains(data.password)));
      await controller.signOut();
      await tester.pumpAndSettle();
    },
  );
}
