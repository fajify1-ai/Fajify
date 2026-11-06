import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';

class _BrowserRepository extends UnavailableAuthRepository
    implements BrowserOidcAuthorization {
  AuthSession? verifiedSession;
  Completer<AuthSession>? pending;
  Object? failure;
  Uri? receivedCallback;
  int callbackCalls = 0;

  @override
  Future<AuthSession> completeAuthorization(Uri callback) async {
    receivedCallback = callback;
    callbackCalls++;
    if (failure != null) throw failure!;
    return pending != null ? pending!.future : verifiedSession!;
  }

  @override
  Future<AuthSession> authorize() async => verifiedSession!;
  @override
  Future<void> beginRegistration() async {}
  @override
  Future<void> beginRecovery() async {}
}

void main() {
  final now = DateTime.utc(2026, 10, 26);
  final callback = Uri(
    scheme: 'test-only',
    path: 'callback',
    query: 'code=private-fixture',
  );
  AuthSession verified({
    bool email = true,
    bool access = true,
    bool expired = false,
  }) => AuthSession(
    subject: 'verified-test-subject',
    provider: IdentityProvider.keycloak,
    expiresAt: expired ? now : now.add(const Duration(minutes: 5)),
    emailVerified: email,
    customerAccess: access,
  );
  late _BrowserRepository repository;
  late AuthController controller;
  setUp(() {
    repository = _BrowserRepository()..verifiedSession = verified();
    controller = AuthController(repository, clock: () => now);
  });
  tearDown(() => controller.dispose());

  test(
    'callback is delegated and only verified session metadata grants access',
    () async {
      await controller.completeAuthorization(callback);
      expect(repository.receivedCallback, callback);
      expect(controller.canAccessCustomer, isTrue);
    },
  );
  test('unverified email remains denied after callback', () async {
    repository.verifiedSession = verified(email: false);
    await controller.completeAuthorization(callback);
    expect(controller.state.status, AuthStatus.verificationRequired);
    expect(controller.canAccessCustomer, isFalse);
  });
  test(
    'missing customer authorization remains denied after callback',
    () async {
      repository.verifiedSession = verified(access: false);
      await controller.completeAuthorization(callback);
      expect(controller.canAccessCustomer, isFalse);
    },
  );
  test('expired callback result remains denied', () async {
    repository.verifiedSession = verified(expired: true);
    await controller.completeAuthorization(callback);
    expect(controller.state.status, AuthStatus.expired);
    expect(controller.canAccessCustomer, isFalse);
  });
  test(
    'SDK errors never expose callback credentials through generic failures',
    () async {
      repository.failure = StateError(callback.toString());
      await controller.completeAuthorization(callback);
      expect(controller.state.failure?.code, AuthErrorCode.operationFailed);
      expect(
        controller.state.failure?.message,
        isNot(contains('private-fixture')),
      );
      expect(controller.canAccessCustomer, isFalse);
    },
  );
  test('logout invalidates an already-running callback result', () async {
    repository.pending = Completer<AuthSession>();
    final completion = controller.completeAuthorization(callback);
    await controller.signOut();
    repository.pending!.complete(verified());
    await completion;
    expect(controller.state.status, AuthStatus.signedOut);
    expect(controller.canAccessCustomer, isFalse);
  });
  test('concurrent callback completion is not dispatched twice', () async {
    repository.pending = Completer<AuthSession>();
    final first = controller.completeAuthorization(callback);
    await controller.completeAuthorization(callback);
    expect(repository.callbackCalls, 1);
    repository.pending!.complete(verified());
    await first;
  });
  test('disposed controller cannot accept callback session', () async {
    repository.pending = Completer<AuthSession>();
    final completion = controller.completeAuthorization(callback);
    controller.dispose();
    repository.pending!.complete(verified());
    await completion;
    expect(controller.canAccessCustomer, isFalse);
    // The normal tearDown must not dispose an already-disposed notifier.
    controller = AuthController(const UnavailableAuthRepository());
  });
  test('repository without callback support reports unavailable', () async {
    final unsupported = AuthController(const UnavailableAuthRepository());
    addTearDown(unsupported.dispose);
    await unsupported.completeAuthorization(callback);
    expect(unsupported.state.failure?.code, AuthErrorCode.providerUnavailable);
    expect(unsupported.canAccessCustomer, isFalse);
  });
}
