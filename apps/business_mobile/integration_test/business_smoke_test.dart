import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:faji_business/app/business_app.dart';
import 'package:faji_business/core/config.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('merchant demo opens all five workspaces and logs out', (
    tester,
  ) async {
    await tester.pumpWidget(
      const BusinessApp(
        initialLocation: '/login',
        config: BusinessConfig(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsOneWidget);
    for (final label in ['Reservations', 'Orders', 'Menu', 'Services']) {
      final nav = find.byType(NavigationBar).evaluate().isNotEmpty
          ? find.byType(NavigationBar)
          : find.byType(NavigationRail);
      await tester.tap(find.descendant(of: nav, matching: find.text(label)));
      await tester.pumpAndSettle();
    }
    expect(find.text('4 of 8 active'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Log Out'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Log Out'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
  });
}
