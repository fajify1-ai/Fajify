import 'dart:async';

import 'package:faji_app/features/auth/domain/auth_repository.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';

/// Explicit test double; never used by application composition.
class FakeAuthRepository implements CustomerAuthRepository, LegacyPasswordAuth {
  final changes = StreamController<AuthSession?>.broadcast(sync: true);
  AuthSession? session;
  Object? failure;
  Completer<AuthSession?>? pendingRestore;
  int logoutCalls = 0;
  int refreshCalls = 0;
  String? receivedEmail;

  @override
  Stream<AuthSession?> get sessionChanges => changes.stream;
  @override
  Future<AuthSession?> restoreSession() async {
    if (failure != null) throw failure!;
    return pendingRestore != null ? pendingRestore!.future : session;
  }

  @override
  Future<AuthSession?> refreshSession() {
    refreshCalls++;
    return restoreSession();
  }

  @override
  Future<AuthSession> signIn(String email, String password) async {
    receivedEmail = email;
    if (failure != null) throw failure!;
    return session!;
  }

  @override
  Future<AuthSession> register(LegacyRegistration registration) =>
      signIn(registration.email, registration.password);
  @override
  Future<void> signOut() async {
    logoutCalls++;
    if (failure != null) throw failure!;
    session = null;
  }
}
