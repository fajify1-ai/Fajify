import 'dart:async';

import 'package:faji_app/core/theme/faji_theme.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/customer_profile_client.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/presentation/auth_scope.dart';
import 'package:faji_app/features/home/presentation/widgets/home_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'native_oidc_test.dart' as fixtures;

class ProfileRepository extends UnavailableAuthRepository
    implements CustomerProfileAccess {
  AuthSession? session;
  String name = 'Ada Okafor';
  Completer<String>? pending;
  @override
  Future<AuthSession?> restoreSession() async => session;
  @override
  Future<String> loadCustomerDisplayName() async => pending?.future ?? name;
}

AuthSession session(String subject) => AuthSession(
  subject: subject,
  provider: IdentityProvider.external,
  expiresAt: DateTime.now().add(const Duration(minutes: 10)),
  emailVerified: false,
  customerAccess: true,
);

void main() {
  test(
    'profile uses the current bearer and actual displayName contract',
    () async {
      final client = CustomerProfileClient(
        apiOrigin: Uri.parse('https://api.example.invalid'),
        request: (uri, token) async {
          expect(
            uri.toString(),
            'https://api.example.invalid/api/v1/customer/profile',
          );
          expect(token, 'test-access');
          expect(uri.hasQuery, isFalse);
          return (
            statusCode: 200,
            body: '{"displayName":" Ada Okafor ","createdAt":"2026-11-09T00:00:00Z"}',
          );
        },
      );
      expect(await client.loadDisplayName('test-access'), 'Ada Okafor');
      for (final response in [
        (statusCode: 401, body: ''),
        (statusCode: 403, body: ''),
        (statusCode: 200, body: '{"displayName":""}'),
        (statusCode: 200, body: '{"displayName":12}'),
      ]) {
        final invalid = CustomerProfileClient(
          apiOrigin: Uri.parse('https://api.example.invalid'),
          request: (_, _) async => response,
        );
        await expectLater(
          invalid.loadDisplayName('test-access'),
          throwsA(isA<AuthFailure>()),
        );
      }
    },
  );

  test('native profile access rejects signed-out calls and late responses after logout', () async {
    final pending = Completer<({int statusCode, String body})>();
    final repository = NativeKeycloakRepository(
      settings: fixtures.settings(),
      gateway: fixtures.Gateway(),
      store: fixtures.MemoryStore(),
      accounts: fixtures.Accounts(),
      clock: () => fixtures.now,
      profile: CustomerProfileClient(
        apiOrigin: fixtures.settings().apiOrigin,
        request: (_, token) async {
          expect(token, 'access-one');
          return pending.future;
        },
      ),
    );
    await expectLater(
      repository.loadCustomerDisplayName(),
      throwsA(isA<AuthFailure>()),
    );
    await repository.authorize();
    final result = repository.loadCustomerDisplayName();
    await repository.signOut();
    pending.complete((statusCode: 200, body: '{"displayName":"Old Account"}'));
    await expectLater(result, throwsA(isA<AuthFailure>()));
  });

  testWidgets(
    'home displays the saved name and initials and updates for another account',
    (tester) async {
      final repo = ProfileRepository()..session = session('ada');
      final auth = AuthController(repo);
      addTearDown(auth.dispose);
      await auth.restore();
      await tester.pumpWidget(
        AuthScope(
          controller: auth,
          child: MaterialApp(
            theme: FajiTheme.light,
            home: const Scaffold(
              body: Padding(padding: EdgeInsets.all(16), child: HomeHeader()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Ada Okafor'), findsOneWidget);
      expect(find.text('AO'), findsOneWidget);
      expect(find.text('Profile unavailable'), findsNothing);
      repo.name = 'Bola Ade';
      repo.session = session('bola');
      await auth.restore();
      await tester.pumpAndSettle();
      expect(find.text('Bola Ade'), findsOneWidget);
      expect(find.text('Ada Okafor'), findsNothing);
      await auth.signOut();
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'late previous-account profile cannot overwrite the current name',
    (tester) async {
      final repo = ProfileRepository()
        ..session = session('first')
        ..pending = Completer<String>();
      final first = repo.pending!;
      final auth = AuthController(repo);
      addTearDown(auth.dispose);
      await auth.restore();
      await tester.pumpWidget(
        AuthScope(
          controller: auth,
          child: const MaterialApp(home: Scaffold(body: HomeHeader())),
        ),
      );
      await tester.pump();
      repo.pending = null;
      repo.name = 'Current Customer';
      repo.session = session('second');
      await auth.restore();
      await tester.pumpAndSettle();
      first.complete('Previous Customer');
      await tester.pumpAndSettle();
      expect(find.text('Current Customer'), findsOneWidget);
      expect(find.text('Previous Customer'), findsNothing);
      await auth.signOut();
      await tester.pumpWidget(const SizedBox());
    },
  );
}
