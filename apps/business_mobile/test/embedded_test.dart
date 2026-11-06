import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/app/business_app.dart';
import 'package:faji_business/core/business_controller.dart';
import 'package:faji_business/core/config.dart';
import 'package:faji_business/core/services.dart';

Future<void> openHost(WidgetTester tester, BusinessController c) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.of(context).push<void>(
              MaterialPageRoute<void>(
                builder: (host) => BusinessApp(
                  controller: c,
                  embedded: true,
                  initialLocation: '/orders/order-1',
                  config: const BusinessConfig(),
                  onExit: () => Navigator.of(host).pop(),
                ),
              ),
            ),
            child: const Text('Open merchant'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open merchant'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('embedded detail Back navigates within Business before exiting', (
    tester,
  ) async {
    final c = BusinessController(
      repository: MockBusinessRepository(delay: Duration.zero),
    );
    await openHost(tester, c);
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    expect(find.text('Order details'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Active 3'), findsOneWidget);
    expect(c.session, SessionStatus.merchant);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Open merchant'), findsOneWidget);
    expect(c.session, SessionStatus.signedOut);
    expect(c.data.menu, isEmpty);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('embedded modal Back closes the modal without leaving Business', (
    tester,
  ) async {
    final c = BusinessController(
      repository: MockBusinessRepository(delay: Duration.zero),
    );
    await openHost(tester, c);
    await tester.tap(find.byKey(const ValueKey('enter-demo')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Demo controls'));
    await tester.pumpAndSettle();
    expect(find.text('Reset sample data'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Reset sample data'), findsNothing);
    expect(find.text('Order details'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
}
