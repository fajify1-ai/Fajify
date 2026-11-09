import 'package:faji_app/core/theme/faji_theme.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_primary_button.dart';
import 'package:faji_app/features/auth/presentation/widgets/faji_auth_text_field.dart';
import 'package:faji_app/features/home/presentation/screens/temporary_home_destinations.dart';
import 'package:faji_app/features/legal/data/privacy_policy.dart';
import 'package:faji_app/features/legal/data/terms_of_service.dart';
import 'package:faji_app/features/legal/presentation/legal_document_screen.dart';
import 'package:faji_app/features/legal/presentation/legal_routes.dart';
import 'package:faji_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../auth/fake_auth_repository.dart';

const formValues = [
  'Ada Okafor',
  'ada.demo',
  'ada@example.invalid',
  '08012345678',
  '01/02/1998',
  'Test Street, Lagos',
  'test-only-password',
  'test-only-password',
];

void main() {
  setUpAll(() async {
    await (FontLoader('Arial')..addFont(
          rootBundle.load(
            'packages/faji_business/assets/fonts/Roboto-Regular.ttf',
          ),
        ))
        .load();
  });

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Future<({FakeAuthRepository repository, AuthController controller})>
  registration(WidgetTester tester) async {
    phone(tester);
    final repository = FakeAuthRepository();
    final controller = AuthController(repository);
    addTearDown(controller.dispose);
    addTearDown(repository.changes.close);
    await tester.pumpWidget(FajiApp(authController: controller));
    await tester.pumpAndSettle();
    navigatorKey.currentState!.pushNamed(FajiRoutes.userLogin);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();
    final fields = find.byType(FajiAuthTextField);
    expect(fields, findsNWidgets(8));
    for (var i = 0; i < formValues.length; i++) {
      tester.widget<FajiAuthTextField>(fields.at(i)).controller.text =
          formValues[i];
    }
    return (repository: repository, controller: controller);
  }

  test(
    'documents have every required section and no invented approval date',
    () {
      expect(termsOfService.sections, hasLength(19));
      expect(privacyPolicy.sections, hasLength(20));
      for (final document in [termsOfService, privacyPolicy]) {
        expect(document.isDraft, isTrue);
        expect(document.approvedOn, isNull);
        expect(document.lastUpdated, 'Pending approval');
        expect(document.version, contains('draft'));
        expect(
          document.sections.where((section) => section.reviewNote != null),
          isNotEmpty,
        );
      }
    },
  );

  for (final document in [termsOfService, privacyPolicy]) {
    for (final scale in [1.0, 2.5]) {
      testWidgets(
        '${document.title} renders without auth and scrolls at text scale $scale',
        (tester) async {
          tester.view.physicalSize = const Size(320, 640);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            MaterialApp(
              theme: FajiTheme.light,
              home: MediaQuery(
                data: MediaQueryData(
                  size: const Size(320, 640),
                  textScaler: TextScaler.linear(scale),
                ),
                child: LegalDocumentScreen(document: document),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('DRAFT — AWAITING APPROVAL'), findsOneWidget);
          expect(find.text('Last updated: Pending approval'), findsOneWidget);
          expect(find.byKey(ValueKey('${document.id}-scroll')), findsOneWidget);
          expect(find.byType(Scrollbar), findsOneWidget);
          final last = find.byKey(
            ValueKey('${document.id}-section-${document.sections.length}'),
          );
          await tester.ensureVisible(last);
          await tester.pumpAndSettle();
          expect(last.hitTestable(), findsOneWidget);
          await tester.ensureVisible(find.text('End of document'));
          await tester.pumpAndSettle();
          expect(find.text('End of document').hitTestable(), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'both named legal routes are available to an unauthenticated app',
    (tester) async {
      final repository = FakeAuthRepository();
      final auth = AuthController(repository);
      addTearDown(auth.dispose);
      addTearDown(repository.changes.close);
      await tester.pumpWidget(FajiApp(authController: auth));
      await tester.pumpAndSettle();
      for (final route in [LegalRoutes.terms, LegalRoutes.privacy]) {
        navigatorKey.currentState!.pushNamed(route);
        await tester.pumpAndSettle();
        expect(find.byType(LegalDocumentScreen), findsOneWidget);
        expect(auth.canAccessCustomer, isFalse);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
      }
    },
  );

  testWidgets(
    'registration links open the right documents and back preserves every value and checkbox',
    (tester) async {
      final state = await registration(tester);
      for (final label in ['Terms of Service', 'Privacy Policy']) {
        final link = find.widgetWithText(TextButton, label);
        await tester.ensureVisible(link);
        await tester.pumpAndSettle();
        expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);
        await tester.tap(link);
        await tester.pumpAndSettle();
        final page = tester.widget<LegalDocumentScreen>(
          find.byType(LegalDocumentScreen),
        );
        expect(
          page.document.id,
          label == 'Terms of Service' ? 'terms' : 'privacy',
        );
        expect(state.controller.canAccessCustomer, isFalse);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        expect(find.text('Create your account'), findsOneWidget);
        final fields = find.byType(FajiAuthTextField);
        for (var i = 0; i < formValues.length; i++) {
          expect(
            tester.widget<FajiAuthTextField>(fields.at(i)).controller.text,
            formValues[i],
          );
        }
        expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);
      }
      await tester.ensureVisible(find.byType(Checkbox));
      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();
      final privacy = find.widgetWithText(TextButton, 'Privacy Policy');
      await tester.ensureVisible(privacy);
      await tester.tap(privacy);
      await tester.pumpAndSettle();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);
    },
  );

  testWidgets(
    'reading legal pages does not accept Terms or trigger registration',
    (tester) async {
      final state = await registration(tester);
      final link = find.widgetWithText(TextButton, 'Terms of Service');
      await tester.ensureVisible(link);
      await tester.tap(link);
      await tester.pumpAndSettle();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      final create = find.widgetWithText(AuthPrimaryButton, 'Create Account');
      await tester.ensureVisible(create);
      await tester.pumpAndSettle();
      await tester.tap(create);
      await tester.pumpAndSettle();
      expect(state.repository.receivedEmail, isNull);
      expect(state.controller.canAccessCustomer, isFalse);
      expect(
        find.text(
          'Please accept the Terms of Service and acknowledge the Privacy Policy.',
        ),
        findsWidgets,
      );
      expect(
        find.text(
          'Acknowledgement is not consent to optional marketing or other optional processing.',
        ),
        findsOneWidget,
      );
      expect(find.byType(Checkbox), findsOneWidget);
    },
  );

  testWidgets('existing Profile area links to both documents', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: FajiTheme.light,
        home: const ProfileScreen(),
        routes: {
          LegalRoutes.terms: (_) => const TermsOfServiceScreen(),
          LegalRoutes.privacy: (_) => const PrivacyPolicyScreen(),
        },
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Legal & privacy'), findsOneWidget);
    expect(
      find.text('Drafts awaiting business and legal approval.'),
      findsOneWidget,
    );
    for (final label in ['Terms of Service', 'Privacy Policy']) {
      await tester.tap(find.widgetWithText(ListTile, label));
      await tester.pumpAndSettle();
      expect(find.byType(LegalDocumentScreen), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
    }
  });
}
