import 'dart:async';

import 'package:flutter/material.dart';

import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/main.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_status_view.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_primary_button.dart';
import 'package:faji_app/features/auth/presentation/widgets/faji_auth_text_field.dart';

class JourneyRepository extends UnavailableAuthRepository
    implements CustomerBrowserJourneys, CustomerPasswordSignIn {
  final journeys = <CustomerAuthJourney>[];
  Object? error;
  Completer<AuthSession>? pending;
  AuthSession session = AuthSession(
    subject: 'fixture-subject',
    provider: IdentityProvider.keycloak,
    expiresAt: DateTime.now().add(const Duration(minutes: 5)),
    emailVerified: true,
    customerAccess: true,
  );

  Future<AuthSession> perform(CustomerAuthJourney journey) async {
    journeys.add(journey);
    if (error != null) throw error!;
    return pending?.future ?? session;
  }

  @override
  Future<AuthSession> signIn(String identifier, String password) =>
      perform(CustomerAuthJourney.signIn);

  @override
  Future<AuthSession> authorize() => perform(CustomerAuthJourney.signIn);
  @override
  Future<AuthSession> registerInBrowser() =>
      perform(CustomerAuthJourney.registration);
  @override
  Future<AuthSession> recoverInBrowser() =>
      perform(CustomerAuthJourney.recovery);
  @override
  Future<AuthSession> verifyEmailInBrowser() =>
      perform(CustomerAuthJourney.verifyEmail);
  @override
  Future<void> beginRegistration() async {
    await registerInBrowser();
  }

  @override
  Future<void> beginRecovery() async {
    await recoverInBrowser();
  }

  @override
  Future<AuthSession> completeAuthorization(Uri callback) async =>
      throw UnsupportedError('SDK only');
}

void main() {
  late JourneyRepository repo;
  late AuthController controller;
  setUp(() {
    repo = JourneyRepository();
    controller = AuthController(repo);
  });
  tearDown(() {
    controller.dispose();
  });

  testWidgets(
    'shared status view explains denied customer access without exposing identity',
    (tester) async {
      final session = AuthSession(
        subject: 'fixture-private-subject',
        provider: IdentityProvider.keycloak,
        expiresAt: DateTime.now().add(const Duration(minutes: 5)),
        emailVerified: true,
        customerAccess: false,
      );
      await tester.pumpWidget(
        MaterialApp(
          home: AuthStatusView(
            state: AuthState(AuthStatus.authenticated, session: session),
          ),
        ),
      );
      expect(
        find.text('This account does not have customer access.'),
        findsOneWidget,
      );
      expect(find.textContaining('fixture-private-subject'), findsNothing);
    },
  );

  test(
    'registration accepts only the fully verified provider session',
    () async {
      await controller.beginRegistration();
      expect(repo.journeys, [CustomerAuthJourney.registration]);
      expect(controller.canAccessCustomer, isTrue);
    },
  );

  test('verification denial stays unauthenticated until a fresh browser result passes', () async {
    repo.error = const AuthFailure(
      AuthErrorCode.verificationRequired,
      'Verify your email.',
    );
    await controller.authorize();
    expect(controller.state.status, AuthStatus.verificationRequired);
    expect(controller.state.session, isNull);
    expect(controller.canAccessCustomer, isFalse);
    repo.error = null;
    await controller.verifyEmail();
    expect(repo.journeys.last, CustomerAuthJourney.verifyEmail);
    expect(controller.canAccessCustomer, isTrue);
  });

  test('customer registration accepts unverified email but expired callbacks remain denied', () async {
    repo.session = AuthSession(
      subject: 'fixture-subject',
      provider: IdentityProvider.keycloak,
      expiresAt: DateTime.now().add(const Duration(minutes: 5)),
      emailVerified: false,
      customerAccess: true,
    );
    await controller.beginRegistration();
    expect(controller.state.status, AuthStatus.authenticated);
    expect(controller.state.session!.emailVerified, isFalse);
    expect(controller.canAccessCustomer, isTrue);
    repo.session = AuthSession(
      subject: 'fixture-subject',
      provider: IdentityProvider.keycloak,
      expiresAt: DateTime.utc(2000),
      emailVerified: true,
      customerAccess: true,
    );
    await controller.requestRecovery();
    expect(controller.state.status, AuthStatus.expired);
    expect(controller.canAccessCustomer, isFalse);
  });

  test('concurrent recovery is dispatched once and late completion cannot defeat logout', () async {
    repo.pending = Completer();
    final recovery = controller.requestRecovery();
    await controller.requestRecovery();
    expect(repo.journeys, [CustomerAuthJourney.recovery]);
    await controller.signOut();
    repo.pending!.complete(repo.session);
    await recovery;
    expect(controller.canAccessCustomer, isFalse);
    expect(controller.state.status, AuthStatus.signedOut);
  });

  test('unknown journey errors are redacted and account denial does not imply verification', () async {
    repo.error = StateError('fixture-private-token');
    await controller.beginRegistration();
    expect(
      controller.state.failure!.message,
      isNot(contains('fixture-private-token')),
    );
    repo.error = const AuthFailure(
      AuthErrorCode.disabled,
      'Account access is unavailable.',
    );
    await controller.authorize();
    expect(controller.state.status, AuthStatus.failure);
    expect(controller.canAccessCustomer, isFalse);
  });

  testWidgets(
    'native sign-in never offers email verification for a legacy profile failure',
    (tester) async {
      repo.error = const AuthFailure(
        AuthErrorCode.verificationRequired,
        'Verify your email.',
      );
      await tester.pumpWidget(FajiApp(authController: controller));
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.userLogin);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(FajiAuthTextField).first, 'test-user');
      await tester.enterText(
        find.byType(FajiAuthTextField).last,
        'test-only-password',
      );
      await tester.tap(find.widgetWithText(AuthPrimaryButton, 'Sign In'));
      await tester.pumpAndSettle();
      expect(find.text('Verify email in browser'), findsNothing);
      expect(find.text('Verify your email.'), findsNothing);
      expect(
        find.text(
          'Your account profile needs attention. Please contact support.',
        ),
        findsOneWidget,
      );
      expect(find.byType(FajiAuthTextField), findsNWidgets(2));
      expect(repo.journeys, [CustomerAuthJourney.signIn]);
    },
  );

  testWidgets(
    'native sign-in progress and incomplete-profile errors stay visible without browser action',
    (tester) async {
      repo.pending = Completer<AuthSession>();
      await tester.pumpWidget(FajiApp(authController: controller));
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.userLogin);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(FajiAuthTextField).first, 'test-user');
      await tester.enterText(
        find.byType(FajiAuthTextField).last,
        'test-only-password',
      );
      await tester.tap(find.widgetWithText(AuthPrimaryButton, 'Sign In'));
      await tester.pump();
      expect(find.text('Signing you in...'), findsOneWidget);
      repo.pending!.completeError(
        const AuthFailure(
          AuthErrorCode.providerUnavailable,
          'Your account profile is incomplete. Please contact support.',
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Your account profile is incomplete. Please contact support.',
        ),
        findsOneWidget,
      );
      expect(find.text('Verify email in browser'), findsNothing);
      expect(repo.journeys, [CustomerAuthJourney.signIn]);
      expect(controller.canAccessCustomer, isFalse);
    },
  );

  testWidgets(
    'browser recovery collects no email and never asserts an email was sent',
    (tester) async {
      repo.error = const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Identity service is unavailable.',
      );
      await tester.pumpWidget(FajiApp(authController: controller));
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.forgotPassword);
      await tester.pumpAndSettle();
      expect(find.byType(FajiAuthTextField), findsNothing);
      await tester.tap(find.text('Continue in browser'));
      await tester.pumpAndSettle();
      expect(find.text('Identity service is unavailable.'), findsOneWidget);
      expect(find.textContaining('sent'), findsNothing);
      expect(controller.canAccessCustomer, isFalse);
    },
  );
}
