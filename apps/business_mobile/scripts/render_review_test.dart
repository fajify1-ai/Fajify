// Opt-in raster review harness. Run: flutter test scripts/render_review_test.dart
// These are Flutter widget renders, not browser or device screenshots.
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_business/app/business_app.dart';
import 'package:faji_business/core/business_controller.dart';
import 'package:faji_business/core/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    final roboto = FontLoader('Roboto');
    for (final name in ['Roboto-Regular', 'Roboto-Medium', 'Roboto-Bold']) {
      roboto.addFont(rootBundle.load('assets/fonts/$name.ttf'));
    }
    await roboto.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });
  for (final width in [390.0, 1440.0]) {
    for (final route in [
      '/dashboard',
      '/reservations',
      '/orders',
      '/menu',
      '/services',
      '/profile',
    ]) {
      testWidgets('render $route at $width for review', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 1100);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final c = BusinessController(
          repository: MockBusinessRepository(delay: Duration.zero),
        );
        await tester.runAsync(() => c.enterDemo());
        final root = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: root,
            child: BusinessApp(controller: c, initialLocation: route),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        Future<void> capture(String suffix) async {
          await tester.runAsync(() async {
            final boundary =
                root.currentContext!.findRenderObject()!
                    as RenderRepaintBoundary;
            final image = await boundary.toImage(pixelRatio: 1);
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            final file = File(
              '../../docs/design/business-m1/implementation/${route.substring(1)}-${width.toInt()}$suffix.png',
            );
            await file.parent.create(recursive: true);
            await file.writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await capture('');
        if (route == '/services' || route == '/dashboard') {
          await tester.ensureVisible(
            find.text(route == '/services' ? 'Log Out' : 'Upcoming'),
          );
          await tester.pumpAndSettle();
          await capture('-bottom');
        }
        await tester.pumpWidget(const SizedBox());
        c.dispose();
      });
    }
  }
}
