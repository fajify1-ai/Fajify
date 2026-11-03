import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/oidc_auth_boundary.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';

import 'fake_auth_repository.dart';

void main() {
  final now = DateTime.utc(2026, 1, 1);
  AuthSession session({bool verified = true, bool access = true}) =>
      AuthSession(
        subject: 'test-subject',
        provider: IdentityProvider.external,
        expiresAt: now.add(const Duration(minutes: 5)),
        emailVerified: verified,
        customerAccess: access,
      );

  late FakeAuthRepository repository;
  late AuthController controller;

  setUp(() {
    repository = FakeAuthRepository();
    controller = AuthController(repository, clock: () => now);
  });
  tearDown(() async {
    controller.dispose();
    await repository.changes.close();
  });

  testWidgets(
    'Keycloak refresh starts before expiry and failure removes access',
    (tester) async {
      var time = now;
      final timed = AuthController(repository, clock: () => time);
      addTearDown(timed.dispose);
      repository.session = AuthSession(
        subject: 'fixture-subject',
        provider: IdentityProvider.keycloak,
        expiresAt: now.add(const Duration(minutes: 5)),
        emailVerified: true,
        customerAccess: true,
      );
      await timed.restore();
      repository.failure = StateError('private refresh diagnostics');
      time = now.add(const Duration(minutes: 4, seconds: 30));
      await tester.pump(const Duration(minutes: 4, seconds: 30));
      await tester.pump();
      expect(repository.refreshCalls, 1);
      expect(timed.canAccessCustomer, isFalse);
      expect(timed.state.failure!.message, isNot(contains('private')));
    },
  );

  test('restoration starts denied and restores an existing session', () async {
    expect(controller.canAccessCustomer, isFalse);
    repository.session = session();
    await controller.restore();
    expect(controller.state.status, AuthStatus.authenticated);
    expect(controller.canAccessCustomer, isTrue);
  });

  test('missing and expired sessions never grant access', () async {
    await controller.restore();
    expect(controller.state.status, AuthStatus.signedOut);
    repository.session = AuthSession(
      subject: 'test',
      provider: IdentityProvider.external,
      expiresAt: now,
      emailVerified: true,
      customerAccess: true,
    );
    await controller.restore();
    expect(controller.state.status, AuthStatus.expired);
    expect(controller.canAccessCustomer, isFalse);
  });

  test('legacy login normalizes email and keeps failures typed', () async {
    repository.session = session();
    await controller.signIn(' Test@Example.invalid ', 'test-only');
    expect(repository.receivedEmail, 'test@example.invalid');
    expect(controller.canAccessCustomer, isTrue);
    repository.failure = const AuthFailure(
      AuthErrorCode.invalidCredentials,
      'Incorrect email or password.',
    );
    await controller.signIn('test@example.invalid', 'test-only');
    expect(controller.state.failure?.code, AuthErrorCode.invalidCredentials);
    expect(controller.canAccessCustomer, isFalse);
  });

  test('customer authorization decision is required', () async {
    repository.session = session(access: false);
    await controller.restore();
    expect(controller.canAccessCustomer, isFalse);
  });

  test(
    'verification policy is explicit and denies unverified accounts',
    () async {
      final verifiedOnly = AuthController(
        repository,
        clock: () => now,
        requireVerifiedEmail: true,
      );
      addTearDown(verifiedOnly.dispose);
      repository.session = session(verified: false);
      await verifiedOnly.restore();
      expect(verifiedOnly.state.status, AuthStatus.verificationRequired);
      expect(verifiedOnly.canAccessCustomer, isFalse);
    },
  );

  test('logout invalidates a restoration which completes late', () async {
    repository.pendingRestore = Completer<AuthSession?>();
    final restore = controller.restore();
    await controller.signOut();
    repository.pendingRestore!.complete(session());
    await restore;
    expect(controller.state.status, AuthStatus.signedOut);
    expect(repository.logoutCalls, 1);
    expect(controller.canAccessCustomer, isFalse);
  });

  test(
    'failed logout remains denied even after provider emits a session',
    () async {
      repository.session = session();
      await controller.restore();
      repository.failure = StateError('test-only failure');
      await controller.signOut();
      repository.changes.add(session());
      expect(controller.canAccessCustomer, isFalse);
      expect(controller.state.failure?.code, AuthErrorCode.operationFailed);
    },
  );

  testWidgets(
    'expiry removes access without waiting for a new provider event',
    (tester) async {
      var time = now;
      final timed = AuthController(repository, clock: () => time);
      addTearDown(timed.dispose);
      repository.session = session();
      await timed.restore();
      time = now.add(const Duration(minutes: 5));
      await tester.pump(const Duration(minutes: 5));
      expect(timed.state.status, AuthStatus.expired);
      expect(timed.canAccessCustomer, isFalse);
    },
  );

  test(
    'refresh failure removes access and does not expose provider errors',
    () async {
      repository.session = session();
      await controller.restore();
      repository.failure = StateError('must not reach UI');
      await controller.refresh();
      expect(controller.canAccessCustomer, isFalse);
      expect(
        controller.state.failure?.message,
        isNot(contains('must not reach UI')),
      );
    },
  );

  test(
    'refresh keeps an unexpired session visible while provider work is pending',
    () async {
      repository.session = session();
      await controller.restore();
      repository.pendingRestore = Completer<AuthSession?>();
      final refresh = controller.refresh();
      expect(controller.canAccessCustomer, isTrue);
      repository.pendingRestore!.complete(session());
      await refresh;
      expect(controller.canAccessCustomer, isTrue);
    },
  );

  test('provider sign-out invalidates the current customer session', () async {
    repository.session = session();
    await controller.restore();
    repository.changes.add(null);
    expect(controller.state.status, AuthStatus.signedOut);
    expect(controller.canAccessCustomer, isFalse);
  });

  test('a pending restoration cannot update a disposed controller', () async {
    final disposable = AuthController(repository, clock: () => now);
    repository.pendingRestore = Completer<AuthSession?>();
    final restore = disposable.restore();
    disposable.dispose();
    repository.pendingRestore!.complete(session());
    await restore;
    expect(disposable.canAccessCustomer, isFalse);
  });

  test(
    'unconfigured recovery is explicit and does not change a valid session',
    () async {
      repository.session = session();
      await controller.restore();
      final failure = await controller.requestRecovery();
      expect(failure?.code, AuthErrorCode.providerUnavailable);
      expect(controller.canAccessCustomer, isTrue);
    },
  );

  test(
    'Keycloak verification is required even with legacy compatibility enabled',
    () async {
      repository.session = AuthSession(
        subject: 'fixture-keycloak-subject',
        provider: IdentityProvider.keycloak,
        expiresAt: now.add(const Duration(minutes: 5)),
        emailVerified: false,
        customerAccess: true,
      );
      await controller.restore();
      expect(controller.state.status, AuthStatus.verificationRequired);
      expect(controller.canAccessCustomer, isFalse);
    },
  );

  test('disposed controllers no longer grant access', () async {
    final disposable = AuthController(repository, clock: () => now);
    repository.session = session();
    await disposable.restore();
    disposable.dispose();
    expect(disposable.canAccessCustomer, isFalse);
  });

  test('pending Keycloak adapter never fabricates authentication', () async {
    const pending = PendingKeycloakRepository(CustomerOidcConfiguration());
    expect(await pending.restoreSession(), isNull);
    await expectLater(pending.authorize(), throwsA(isA<AuthFailure>()));
    await expectLater(
      pending.completeAuthorization(Uri(path: '/test-callback')),
      throwsA(isA<AuthFailure>()),
    );
    await expectLater(pending.beginRecovery(), throwsA(isA<AuthFailure>()));
  });
}
