import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/main.dart';

void main() {
  testWidgets('role selection actions navigate', (tester) async {
    await tester.pumpWidget(const FajiApp());
    await tester.pumpAndSettle();

    expect(find.text('Plan. Book. Enjoy.'), findsOneWidget);
    expect(find.text('Login as a user'), findsOneWidget);
    expect(find.text('Faji Business'), findsOneWidget);
    expect(find.text('Faji Ride'), findsOneWidget);

    await tester.tap(find.text('Faji Business'));
    await tester.pumpAndSettle();
    expect(find.text('Faji Business'), findsOneWidget);
    expect(find.text('Manage your business with Faji.'), findsOneWidget);
  });
}
