import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/presentation/customer_access_gate.dart';
import 'package:faji_app/main.dart';

import 'fake_auth_repository.dart';

void main() {
  testWidgets(
    'recovery reports unavailable without pretending to send an email',
    (tester) async {
      await tester.pumpWidget(const FajiApp());
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.forgotPassword);
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsNothing);
      await tester.tap(find.text('Continue in browser'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Keycloak sign-in is awaiting approved integration configuration.',
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets('protected subtree is not built before authentication', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    final controller = AuthController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.changes.close);
    var protectedBuilds = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: CustomerAccessGate(
          controller: controller,
          builder: (_) {
            protectedBuilds++;
            return const Text('protected');
          },
          deniedBuilder: (_) => const Text('signed out'),
        ),
      ),
    );
    expect(protectedBuilds, 0);
    await controller.restore();
    await tester.pump();
    expect(find.text('signed out'), findsOneWidget);
    expect(protectedBuilds, 0);

    repository.changes.add(
      AuthSession(
        subject: 'test',
        provider: IdentityProvider.external,
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
        emailVerified: true,
        customerAccess: true,
      ),
    );
    await tester.pump();
    expect(find.text('protected'), findsOneWidget);

    await controller.signOut();
    await tester.pump();
    expect(find.text('protected'), findsNothing);
  });

  testWidgets(
    'named customer route denies access without initializing a provider',
    (tester) async {
      await tester.pumpWidget(const FajiApp());
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.userHome);
      await tester.pumpAndSettle();
      expect(find.text('Login as a user'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('logout clears directly pushed customer pages from the stack', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    final controller = AuthController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.changes.close);
    await tester.pumpWidget(FajiApp(authController: controller));
    await tester.pumpAndSettle();
    repository.changes.add(
      AuthSession(
        subject: 'test',
        provider: IdentityProvider.external,
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
        emailVerified: true,
        customerAccess: true,
      ),
    );
    navigatorKey.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => const Scaffold(body: Text('nested customer page')),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('nested customer page'), findsOneWidget);
    await controller.signOut();
    await tester.pumpAndSettle();
    expect(find.text('nested customer page'), findsNothing);
    expect(find.text('Login as a user'), findsOneWidget);
    expect(navigatorKey.currentState!.canPop(), isFalse);
  });
}
