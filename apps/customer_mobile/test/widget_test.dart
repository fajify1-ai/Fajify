import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/presentation/screens/business_login_screen.dart';
import 'package:faji_app/main.dart';

Future<void> openRoles(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(const FajiApp());
  await tester.pump(const Duration(seconds: 4));
  await tester.pumpAndSettle();
}

Future<void> openBusiness(WidgetTester tester) async {
  await tester.tap(find.text('Faji Business'));
  await tester.pumpAndSettle();
  expect(find.text('Grow your business with fajify'), findsOneWidget);
  expect(find.text('Register Your Business'), findsOneWidget);
  await tester.tap(find.text('Sign In'));
  await tester.pumpAndSettle();
  expect(find.text('Welcome to Faji Business'), findsOneWidget);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    // Use real font metrics for the host's existing fixed-height intro.
    final fonts = FontLoader('Arial')
      ..addFont(
        rootBundle.load(
          'packages/faji_business/assets/fonts/Roboto-Regular.ttf',
        ),
      );
    await fonts.load();
  });
  testWidgets(
    'Business entry opens embedded login and returns to role selection',
    (tester) async {
      await openRoles(tester);
      expect(find.text('Login as a user'), findsOneWidget);
      expect(find.text('Faji Ride'), findsOneWidget);
      await openBusiness(tester);
      expect(find.byType(MaterialApp), findsOneWidget);
      expect(find.text('Dashboard'), findsNothing);
      await tester.tap(find.text('Back to role selection'));
      await tester.pumpAndSettle();
      expect(find.text('Login as a user'), findsOneWidget);
      await tester.tap(find.text('Faji Ride'));
      await tester.pumpAndSettle();
      expect(find.text('Get where you are going with Faji.'), findsOneWidget);
    },
  );

  testWidgets(
    'merchant tabs, customer switch and fresh re-entry share one app',
    (tester) async {
      await openRoles(tester);
      await openBusiness(tester);
      await tester.tap(find.byKey(const ValueKey('enter-demo')));
      await tester.pumpAndSettle();
      expect(find.text('Dashboard'), findsOneWidget);
      for (final label in ['Reservations', 'Orders', 'Menu', 'Services']) {
        final nav = find.byType(NavigationBar);
        await tester.tap(find.descendant(of: nav, matching: find.text(label)));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: label);
      }
      await tester.ensureVisible(find.text('Switch to Customer App'));
      await tester.tap(find.text('Switch to Customer App'));
      await tester.pumpAndSettle();
      expect(find.text('Login as a user'), findsOneWidget);
      expect(find.text('FAJI BUSINESS SUITE'), findsNothing);
      await openBusiness(tester);
      expect(find.text('Dashboard'), findsNothing);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Login as a user'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome back'), findsOneWidget);
      expect(find.byKey(const ValueKey('enter-demo')), findsNothing);
    },
  );

  testWidgets('Android Back leaves merchant login and keeps role selection', (
    tester,
  ) async {
    await openRoles(tester);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
    await openBusiness(tester);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
    expect(find.text('Welcome to Faji Business'), findsNothing);
  });

  testWidgets('Business choice closes without opening a merchant session', (
    tester,
  ) async {
    await openRoles(tester);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    expect(find.text('Grow your business with fajify'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Register Your Business'), findsOneWidget);
    expect(find.byKey(const ValueKey('enter-demo')), findsNothing);
    await tester.tap(find.byTooltip('Back to role selection'));
    await tester.pumpAndSettle();
    expect(find.text('Login as a user'), findsOneWidget);
  });

  testWidgets('Business registration is reachable without merchant login', (
    tester,
  ) async {
    await openRoles(tester);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register Your Business'));
    await tester.pumpAndSettle();
    expect(find.text('Register Your Business'), findsOneWidget);
    expect(find.text('Business name'), findsOneWidget);
    expect(find.text('Dashboard'), findsNothing);
    expect(find.byKey(const ValueKey('enter-demo')), findsNothing);
    await tester.ensureVisible(find.text('Sign In'));
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
  });

  testWidgets('Business choices fit a compact screen with enlarged text', (
    tester,
  ) async {
    await openRoles(tester);
    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    tester.view.physicalSize = const Size(320, 568);
    final element = tester.element(find.text('Grow your business with fajify'));
    final data = MediaQuery.of(element);
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: data.copyWith(textScaler: const TextScaler.linear(1.8)),
          child: const BusinessLoginScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Register Your Business'));
    expect(tester.takeException(), isNull);
  });
}
