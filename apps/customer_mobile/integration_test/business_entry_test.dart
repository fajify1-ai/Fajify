import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:faji_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('main app opens Business, visits all tabs and returns safely', (
    tester,
  ) async {
    await app.main();
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    expect(find.text('Grow your business with fajify'), findsOneWidget);
    await tester.tap(find.text('Register Your Business'));
    await tester.pumpAndSettle();
    expect(find.text('Business name'), findsOneWidget);
    expect(find.text('Dashboard'), findsNothing);
    await tester.ensureVisible(find.text('Sign In'));
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsOneWidget);
    for (final label in ['Reservations', 'Orders', 'Menu', 'Services']) {
      final nav = find.byType(NavigationBar).evaluate().isNotEmpty
          ? find.byType(NavigationBar)
          : find.byType(NavigationRail);
      await tester.tap(find.descendant(of: nav, matching: find.text(label)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: label);
    }
    await tester.ensureVisible(find.text('Log Out'));
    await tester.tap(find.text('Log Out'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
    expect(find.text('FAJI BUSINESS SUITE'), findsNothing);
    await tester.tap(find.text('Back to role selection'));
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsNothing);
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('Services'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Switch to Customer App'));
    await tester.tap(find.text('Switch to Customer App'));
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
  });
}
