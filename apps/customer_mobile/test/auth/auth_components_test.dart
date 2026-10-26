import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/core/theme/faji_colors.dart';
import 'package:faji_app/core/theme/faji_theme.dart';
import 'package:faji_app/features/auth/domain/auth_input.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_error_message.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_form_layout.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_loading_indicator.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_primary_button.dart';
import 'package:faji_app/features/auth/presentation/widgets/faji_auth_text_field.dart';
import 'package:faji_app/main.dart';

Future<Uint8List> capture(WidgetTester tester, Widget child) async {
  final key = GlobalKey();
  await tester.pumpWidget(
    MaterialApp(
      theme: FajiTheme.dark,
      home: Scaffold(
        body: Center(
          child: RepaintBoundary(
            key: key,
            child: SizedBox(width: 320, child: child),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  return (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    image.dispose();
    return bytes!.buffer.asUint8List();
  }))!;
}

void main() {
  test(
    'auth input rules are shared without imposing registration rules on login',
    () {
      for (final email in ['', ' ', 'wrong', 'a@', 'a b@example.invalid']) {
        expect(AuthInput.email(email), isNotNull);
      }
      expect(AuthInput.email(' user@example.invalid '), isNull);
      expect(
        AuthInput.normalizeEmail(' User@Example.invalid '),
        'user@example.invalid',
      );
      expect(AuthInput.signInPassword('short'), isNull);
      expect(AuthInput.registrationPassword('short'), isNotNull);
      expect(AuthInput.signInPassword(''), 'Password is required');
      expect(AuthInput.registrationPassword('12345678'), isNull);
    },
  );

  testWidgets('login, registration and recovery compose the shared controls', (
    tester,
  ) async {
    await tester.pumpWidget(const FajiApp());
    await tester.pumpAndSettle();
    navigatorKey.currentState!.pushNamed(FajiRoutes.userLogin);
    await tester.pumpAndSettle();
    expect(find.byType(AuthFormLayout), findsOneWidget);
    expect(find.byType(FajiAuthTextField), findsNWidgets(2));
    expect(find.byType(AuthPrimaryButton), findsOneWidget);
    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();
    expect(find.byType(AuthFormLayout), findsOneWidget);
    expect(find.byType(FajiAuthTextField), findsNWidgets(8));
    expect(find.byType(AuthPrimaryButton), findsOneWidget);
    navigatorKey.currentState!.pushNamed(FajiRoutes.forgotPassword);
    await tester.pumpAndSettle();
    expect(find.byType(AuthFormLayout), findsOneWidget);
    expect(find.byType(FajiAuthTextField), findsOneWidget);
    expect(find.byType(AuthPrimaryButton), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'invalid');
    await tester.tap(find.text('Send reset link'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.byType(AuthErrorMessage), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'busy variants block duplicate actions and reuse the progress view',
    (tester) async {
      for (final recovery in [false, true]) {
        var calls = 0;
        Widget button(bool busy) => recovery
            ? AuthPrimaryButton.recovery(
                label: 'Continue',
                onTap: () => calls++,
                busy: busy,
              )
            : AuthPrimaryButton(
                label: 'Continue',
                onTap: () => calls++,
                busy: busy,
              );
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: button(false))),
        );
        await tester.tap(find.byType(AuthPrimaryButton));
        await tester.pumpAndSettle();
        expect(calls, 1);
        await tester.pumpWidget(
          MaterialApp(home: Scaffold(body: button(true))),
        );
        await tester.pump();
        await tester.tap(find.byType(AuthPrimaryButton));
        expect(calls, 1);
        expect(find.byType(AuthLoadingIndicator), findsOneWidget);
      }
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('shared messages retain both variants and announce changes', (
    tester,
  ) async {
    late BuildContext context;
    await tester.pumpWidget(
      MaterialApp(
        theme: FajiTheme.dark,
        home: Builder(
          builder: (value) {
            context = value;
            return const Scaffold(body: SizedBox());
          },
        ),
      ),
    );
    for (final presentation in AuthMessagePresentation.values) {
      showAuthMessage(context, 'Test message', presentation: presentation);
      await tester.pumpAndSettle();
      expect(find.byType(AuthErrorMessage), findsOneWidget);
      final semantics = tester.widget<Semantics>(
        find.descendant(
          of: find.byType(AuthErrorMessage),
          matching: find.byType(Semantics),
        ),
      );
      expect(semantics.properties.liveRegion, isTrue);
      final bar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(
        bar.backgroundColor,
        presentation == AuthMessagePresentation.sheet
            ? FajiColors.primary
            : FajiColors.surfaceDark,
      );
      ScaffoldMessenger.of(context).removeCurrentSnackBar();
      await tester.pumpAndSettle();
    }
  });

  testWidgets('recovery field pixels match the pre-refactor appearance', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    // Reference is the recovery field before component reuse; test-only fixture.
    final original = await capture(
      tester,
      TextField(
        controller: controller,
        keyboardType: TextInputType.emailAddress,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: 'you@email.com',
          hintStyle: const TextStyle(color: FajiColors.textSecondaryDark),
          filled: true,
          fillColor: const Color(0xFF252525),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
    final reused = await capture(
      tester,
      FajiAuthTextField(
        controller: controller,
        hint: 'you@email.com',
        keyboardType: TextInputType.emailAddress,
        recoveryAppearance: true,
      ),
    );
    expect(reused, orderedEquals(original));
  });

  testWidgets('recovery button pixels match the pre-refactor appearance', (
    tester,
  ) async {
    final original = await capture(
      tester,
      SizedBox(
        width: double.infinity,
        height: 62,
        child: FilledButton(
          onPressed: () {},
          style: FilledButton.styleFrom(backgroundColor: FajiColors.primary),
          child: const Text('Send reset link'),
        ),
      ),
    );
    final reused = await capture(
      tester,
      AuthPrimaryButton.recovery(label: 'Send reset link', onTap: () {}),
    );
    expect(reused, orderedEquals(original));
  });

  testWidgets('sheet button preserves its established paint and dimensions', (
    tester,
  ) async {
    final original = await capture(
      tester,
      AnimatedScale(
        scale: 1,
        duration: const Duration(milliseconds: 120),
        child: Material(
          color: FajiColors.primary,
          borderRadius: BorderRadius.circular(20),
          elevation: 12,
          shadowColor: FajiColors.primary.withValues(alpha: .35),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () {},
            child: const SizedBox(
              height: 68,
              child: Center(
                child: Text(
                  'Sign In',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    final reused = await capture(
      tester,
      AuthPrimaryButton(label: 'Sign In', onTap: () {}),
    );
    expect(reused, orderedEquals(original));
  });
}
