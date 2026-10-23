import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/app/business_app.dart';
import 'package:faji_business/core/business_controller.dart';
import 'package:faji_business/core/config.dart';
import 'package:faji_business/core/models.dart';
import 'package:faji_business/core/services.dart';
import 'package:faji_business/features/menu.dart';
import 'package:faji_business/shared/business_ui.dart';

Future<BusinessController> merchant(
  WidgetTester tester, {
  String route = '/dashboard',
  Size size = const Size(390, 844),
  double scale = 1,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final c = BusinessController(
    repository: MockBusinessRepository(delay: Duration.zero),
  );
  await tester.runAsync(() => c.enterDemo());
  await tester.pumpWidget(
    MediaQuery(
      data: MediaQueryData(size: size, textScaler: TextScaler.linear(scale)),
      child: BusinessApp(controller: c, initialLocation: route),
    ),
  );
  await tester.pumpAndSettle();
  addTearDown(c.dispose);
  return c;
}

void main() {
  testWidgets('protected deep link restores after explicit demo login', (
    tester,
  ) async {
    final c = BusinessController(
      repository: MockBusinessRepository(delay: Duration.zero),
    );
    await tester.pumpWidget(
      BusinessApp(controller: c, initialLocation: '/orders/order-1'),
    );
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    expect(find.text('Order details'), findsOneWidget);
    await c.logout();
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
    expect(find.text('Jollof Rice & Chicken'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
  testWidgets('wrong role is denied and can return to login', (tester) async {
    final c = BusinessController(
      repository: MockBusinessRepository(delay: Duration.zero),
    );
    await tester.pumpWidget(
      BusinessApp(controller: c, initialLocation: '/login'),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Test role without merchant access'));
    await tester.pumpAndSettle();
    expect(find.text('Merchant access required'), findsOneWidget);
    await tester.tap(find.text('Return to login'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome to Faji Business'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
  testWidgets('five tabs navigate to separate menu and services screens', (
    tester,
  ) async {
    await merchant(tester);
    final nav = find.byType(NavigationBar);
    for (final label in [
      'Reservations',
      'Orders',
      'Menu',
      'Services',
      'Home',
    ]) {
      await tester.tap(find.descendant(of: nav, matching: find.text(label)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: label);
    }
    await tester.tap(find.descendant(of: nav, matching: find.text('Services')));
    await tester.pumpAndSettle();
    expect(find.text('4 of 8 active'), findsOneWidget);
  });
  testWidgets('calendar selection and month navigation update the view', (
    tester,
  ) async {
    await merchant(tester, route: '/reservations');
    expect(find.text('6 reserved'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('day-2026-8-31')));
    await tester.tap(find.byKey(const ValueKey('day-2026-8-31')));
    await tester.pumpAndSettle();
    expect(find.text('2 reserved'), findsOneWidget);
    await tester.ensureVisible(find.byTooltip('Next month'));
    await tester.tap(find.byTooltip('Next month'));
    await tester.pumpAndSettle();
    expect(find.text('September 2026'), findsOneWidget);
    await tester.tap(find.byTooltip('Previous month'));
    await tester.pumpAndSettle();
    expect(find.text('August 2026'), findsOneWidget);
  });
  testWidgets('order action updates card and completed filter', (tester) async {
    final c = await merchant(tester, route: '/orders');
    await tester.ensureVisible(find.byKey(const ValueKey('advance-order-1')));
    await tester.tap(find.byKey(const ValueKey('advance-order-1')));
    await tester.pumpAndSettle();
    expect(c.data.orders.first.stage, OrderStage.preparing);
    expect(find.text('Preparing 2'), findsOneWidget);
  });
  testWidgets('menu form validates and saves a local item', (tester) async {
    final c = await merchant(tester, route: '/menu/new');
    await tester.tap(find.text('Save sample item'));
    await tester.pumpAndSettle();
    expect(find.text('Enter an item name'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).at(0), 'Soup');
    await tester.enterText(find.byType(TextFormField).at(1), '2500.50');
    await tester.ensureVisible(find.text('Save sample item'));
    await tester.tap(find.text('Save sample item'));
    await tester.pumpAndSettle();
    expect(c.data.menu.length, 7);
    expect(find.text('7 menu items'), findsOneWidget);
  });
  testWidgets(
    'service confirmation can cancel or update derived active count',
    (tester) async {
      final c = await merchant(tester, route: '/services');
      final switchFinder = find.byType(Switch).first;
      await tester.ensureVisible(switchFinder);
      await tester.tap(switchFinder);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(c.data.services.where((s) => s.enabled).length, 4);
      await tester.tap(switchFinder);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply demo change'));
      await tester.pumpAndSettle();
      expect(find.text('3 of 8 active'), findsOneWidget);
    },
  );
  testWidgets('loading and error states do not expose stale page data', (
    tester,
  ) async {
    final c = await merchant(tester);
    final loading = c.scenario(DemoScenario.error);
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1));
    await loading;
    await tester.pumpAndSettle();
    expect(find.text('Retry sample data'), findsOneWidget);
    await tester.tap(find.text('Retry sample data'));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsOneWidget);
  });
  testWidgets('invalid detail routes are useful and recoverable', (
    tester,
  ) async {
    await merchant(tester, route: '/orders/missing');
    expect(find.text('Order not found'), findsOneWidget);
    await tester.tap(find.text('Back to orders'));
    await tester.pumpAndSettle();
    expect(find.text('Active 3'), findsOneWidget);
  });
  testWidgets('unsupported configuration does not open demo session', (
    tester,
  ) async {
    await tester.pumpWidget(
      const BusinessApp(config: BusinessConfig(useMocks: false)),
    );
    expect(
      find.textContaining('supports development mock services only'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('enter-demo')), findsNothing);
  });
  testWidgets('broken menu image uses a bundled-free category placeholder', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: businessTheme(),
        home: const Scaffold(
          body: MenuThumbnail(
            item: MenuItem(
              'bad',
              'Sample',
              'Drinks',
              100,
              imageAsset: 'missing.png',
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.local_bar_outlined), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('compact layout supports enlarged system text', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 1.8;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await merchant(tester, size: const Size(375, 1000));
    final nav = find.byType(NavigationBar);
    for (final label in ['Reservations', 'Orders', 'Menu', 'Services']) {
      await tester.tap(find.descendant(of: nav, matching: find.text(label)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: label);
    }
  });
  testWidgets(
    'service bottom actions remain reachable and logout clears merchant UI',
    (tester) async {
      await merchant(tester, route: '/services');
      await tester.ensureVisible(find.text('Log Out'));
      await tester.tap(find.text('Log Out'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome to Faji Business'), findsOneWidget);
      expect(find.text('FAJI BUSINESS SUITE'), findsNothing);
    },
  );
  testWidgets('scan page displays contextual sample verification results', (
    tester,
  ) async {
    await merchant(tester, route: '/scan?type=order');
    expect(find.text('Verify order recipient'), findsOneWidget);
    await tester.tap(find.text('Valid'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Demo recipient verified locally'),
      findsOneWidget,
    );
    await tester.tap(find.text('Valid'));
    await tester.pumpAndSettle();
    expect(find.textContaining('already been used'), findsOneWidget);
  });
  for (final width in [375.0, 768.0, 1024.0, 1440.0]) {
    testWidgets('main pages fit viewport width $width', (tester) async {
      final c = await merchant(tester, size: Size(width, 1000));
      for (final route in destinations) {
        final context = tester.element(find.byType(BusinessShell));
        // Navigate through the public router contract.
        final router = Router.of(context).routerDelegate;
        expect(router, isNotNull);
        final nav = width >= 760
            ? find.byType(NavigationRail)
            : find.byType(NavigationBar);
        final i = destinations.indexOf(route);
        await tester.tap(
          find.descendant(of: nav, matching: find.text(labels[i])),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: route);
      }
      expect(c.session, SessionStatus.merchant);
    });
  }
}
