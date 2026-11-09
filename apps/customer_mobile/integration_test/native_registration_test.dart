import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/customer_auth_composition.dart';
import 'package:faji_app/features/auth/data/platform_secure_session_store.dart';
import 'package:faji_app/features/auth/presentation/screens/user_home_screen.dart';
import 'package:faji_app/features/auth/presentation/widgets/auth_primary_button.dart';
import 'package:faji_app/features/auth/presentation/widgets/faji_auth_text_field.dart';
import 'package:faji_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'new customer registers through all eight native fields and reaches home',
    (tester) async {
      final suffix = DateTime.now().microsecondsSinceEpoch.toString();
      final username = 'registration_probe_$suffix';
      final password =
          'Rg!9$suffix'; // Disposable in-memory test credential only.
      final auth = AuthController(createCustomerAuthRepository());
      await tester.pumpWidget(FajiApp(authController: auth));
      await tester.pumpAndSettle();
      navigatorKey.currentState!.pushNamed(FajiRoutes.userLogin);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Register'));
      await tester.pumpAndSettle();
      final fields = find.byType(FajiAuthTextField);
      expect(fields, findsNWidgets(8));
      final values = [
        'Registration Probe',
        username,
        '$username@example.invalid',
        '08012345678',
        '01/02/1998',
        'Local test address, Lagos',
        password,
        password,
      ];
      for (var i = 0; i < 8; i++) {
        await tester.ensureVisible(fields.at(i));
        await tester.pumpAndSettle();
        expect(fields.at(i).hitTestable(), findsOneWidget);
        tester.widget<FajiAuthTextField>(fields.at(i)).controller.text =
            values[i];
      }
      await tester.ensureVisible(find.byType(Checkbox));
      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      final create = find.widgetWithText(AuthPrimaryButton, 'Create Account');
      await tester.ensureVisible(create);
      await tester.pumpAndSettle();
      await tester.tap(create);
      await tester.pumpAndSettle();
      expect(auth.state.failure, isNull);
      expect(auth.canAccessCustomer, isTrue);
      expect(find.byType(UserHomeScreen), findsOneWidget);
      for (
        var attempt = 0;
        attempt < 30 && find.text('Registration Probe').evaluate().isEmpty;
        attempt++
      ) {
        await tester.pump(const Duration(milliseconds: 500));
      }
      expect(find.text('Registration Probe'), findsOneWidget);
      expect(find.text('Profile unavailable'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      auth.dispose();
      await PlatformSecureSessionStore().clear();
    },
  );
}
