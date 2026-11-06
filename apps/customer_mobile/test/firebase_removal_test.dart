import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/core/data/service_unavailable.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/oidc_auth_boundary.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/presentation/screens/user_home_screen.dart';
import 'package:faji_app/features/bookings/data/models/booking_draft.dart';
import 'package:faji_app/features/bookings/data/repositories/booking_repository.dart';
import 'package:faji_app/features/bookings/presentation/screens/booking_reservation_screen.dart';
import 'package:faji_app/features/bookings/presentation/screens/booking_confirmation_screen.dart';
import 'package:faji_app/features/home/data/repositories/home_business_repository.dart';
import 'package:faji_app/features/home/presentation/screens/plan_for_me_step_one_screen.dart';
import 'package:faji_app/features/home/presentation/screens/temporary_home_destinations.dart';
import 'package:faji_app/features/plans/data/repositories/plan_repository.dart';
import 'package:faji_app/features/plans/data/data_sources/placeholder_plan_data.dart';
import 'package:faji_app/features/plans/presentation/screens/plan_results_screen.dart';
import 'package:faji_app/features/wishlist/data/models/wishlist_item.dart';
import 'package:faji_app/features/wishlist/data/repositories/wishlist_repository.dart';

void main() {
  test(
    'missing discovery and plan APIs are failures, never sample data',
    () async {
      await expectLater(
        HomeBusinessRepository().loadHomeBusinesses(),
        throwsA(isA<ServiceUnavailable>()),
      );
      await expectLater(
        PlanRepository().loadAvailablePlans(),
        throwsA(isA<ServiceUnavailable>()),
      );
    },
  );

  test('wishlist cannot claim a save or retain customer data', () async {
    final repository = WishlistRepository.instance;
    final fixture = WishlistItem.fromPlan(placeholderPlans.first);
    await repository.loadForCurrentUser();
    expect(() => repository.add(fixture), throwsA(isA<ServiceUnavailable>()));
    expect(
      () => repository.remove(fixture.id),
      throwsA(isA<ServiceUnavailable>()),
    );
    expect(repository.items, isEmpty);
    expect(repository.savedIds, isEmpty);
    expect(repository.loadError, contains('unavailable'));
  });

  test('pending browser identity cannot authorize or register', () async {
    final controller = AuthController(
      const PendingKeycloakRepository(CustomerOidcConfiguration()),
    );
    addTearDown(controller.dispose);
    await controller.restore();
    await controller.authorize();
    expect(controller.canAccessCustomer, isFalse);
    expect(controller.state.failure?.code, AuthErrorCode.providerUnavailable);
    await controller.beginRegistration();
    expect(controller.canAccessCustomer, isFalse);
    expect(controller.state.failure?.code, AuthErrorCode.providerUnavailable);
  });

  testWidgets('discovery unavailability retains customer navigation', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: UserHomeScreen()));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('Discovery is unavailable'), findsOneWidget);
    expect(find.text('Wishlist'), findsOneWidget);
    await tester.tap(find.text('Wishlist'));
    await tester.pumpAndSettle();
    expect(find.byType(WishlistScreen), findsOneWidget);
    expect(find.textContaining('Wishlist is unavailable'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('plans show unavailable instead of spinning forever', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: PlanResultsScreen(flowState: PlanForMeFlowState())),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Plans is unavailable'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('reservation never creates a local ticket or payment success', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BookingReservationScreen(
          draft: BookingDraft(
            plan: placeholderPlans.first,
            flowState: PlanForMeFlowState(),
            bookingDate: DateTime(2027, 1, 1),
            bookingTimePeriod: BookingTimePeriod.evening,
            paymentMethod: PaymentMethodType.bankTransfer,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Book Reservation'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Bookings is unavailable'), findsOneWidget);
    expect(find.byType(BookingConfirmationScreen), findsNothing);
    expect(BookingRepository.instance.bookings, isEmpty);
    expect(tester.takeException(), isNull);
  });
}
