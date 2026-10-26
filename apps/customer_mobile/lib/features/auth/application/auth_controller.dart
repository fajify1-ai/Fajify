import 'dart:async';

import 'package:flutter/foundation.dart';

import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';

/// Owns client session state; providers own credential/token verification.
class AuthController extends ChangeNotifier {
  AuthController(
    this._repository, {
    DateTime Function()? clock,
    this.requireVerifiedEmail = false,
  }) : _clock = clock ?? DateTime.now {
    _subscription = _repository.sessionChanges.listen(
      (session) {
        if (_listenEnabled && !_busy && !_disposed) _accept(session);
      },
      onError: (Object error) {
        if (_listenEnabled && !_busy && !_disposed) _fail(error);
      },
    );
  }

  final CustomerAuthRepository _repository;
  final DateTime Function() _clock;

  /// Legacy Firebase policy is preserved. Enable only with an agreed policy.
  final bool requireVerifiedEmail;
  late final StreamSubscription<AuthSession?> _subscription;
  Timer? _expiry;
  int _generation = 0;
  bool _disposed = false;
  bool _busy = false;
  bool _listenEnabled = false;
  AuthState _state = const AuthState(AuthStatus.restoring);
  AuthState get state => _state;
  bool get canAccessCustomer =>
      !_disposed && _state.allowsCustomerAccess(_clock());

  Future<void> restore() =>
      _run(AuthStatus.restoring, _repository.restoreSession);
  Future<void> refresh() =>
      _run(AuthStatus.restoring, _repository.refreshSession);

  Future<void> signIn(String email, String password) async {
    final provider = _repository;
    if (provider is! LegacyPasswordAuth) {
      _fail(
        const AuthFailure(
          AuthErrorCode.providerUnavailable,
          'Account sign-in is not configured.',
        ),
      );
      return;
    }
    await _run(
      AuthStatus.authenticating,
      () => (provider as LegacyPasswordAuth).signIn(
        email.trim().toLowerCase(),
        password,
      ),
    );
  }

  Future<void> register(LegacyRegistration registration) async {
    final provider = _repository;
    if (provider is! LegacyPasswordAuth) {
      _fail(
        const AuthFailure(
          AuthErrorCode.providerUnavailable,
          'Account registration is not configured.',
        ),
      );
      return;
    }
    await _run(
      AuthStatus.authenticating,
      () => (provider as LegacyPasswordAuth).register(registration),
    );
  }

  Future<void> _run(
    AuthStatus pending,
    Future<AuthSession?> Function() operation,
  ) async {
    if (_disposed || _busy) return;
    final generation = ++_generation;
    _busy = true;
    if (!(pending == AuthStatus.restoring && canAccessCustomer)) {
      _set(AuthState(pending));
    }
    try {
      final session = await operation();
      if (!_disposed && generation == _generation) _accept(session);
    } catch (error) {
      if (!_disposed && generation == _generation) _fail(error);
    } finally {
      if (generation == _generation) _busy = false;
    }
  }

  /// Remove protected access immediately, even if remote logout fails.
  Future<void> signOut() async {
    if (_disposed) return;
    final generation = ++_generation;
    _busy = true;
    _listenEnabled = false;
    _set(const AuthState(AuthStatus.signingOut));
    try {
      await _repository.signOut();
      if (!_disposed && generation == _generation) {
        _set(const AuthState(AuthStatus.signedOut));
      }
    } catch (error) {
      if (!_disposed && generation == _generation) _fail(error);
    } finally {
      if (generation == _generation) _busy = false;
    }
  }

  /// Missing recovery integration is explicit and does not mutate a session.
  Future<AuthFailure?> requestRecovery() async {
    const unavailable = AuthFailure(
      AuthErrorCode.providerUnavailable,
      'Password recovery is awaiting the shared identity integration.',
    );
    final provider = _repository;
    if (_disposed || provider is! CustomerAccountRecovery) return unavailable;
    try {
      await (provider as CustomerAccountRecovery).beginRecovery();
      return null;
    } on AuthFailure catch (error) {
      return error;
    } catch (_) {
      return const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not open account recovery. Please try again.',
      );
    }
  }

  /// Also used on app resume: timers may have paused in the background.
  void checkExpiry() {
    final session = _state.session;
    if (session != null && session.isExpired(_clock())) {
      _set(const AuthState(AuthStatus.expired));
    }
  }

  void _accept(AuthSession? session) {
    _listenEnabled = true;
    if (session == null) {
      _set(const AuthState(AuthStatus.signedOut));
    } else if (session.subject.isEmpty || session.isExpired(_clock())) {
      _set(const AuthState(AuthStatus.expired));
    } else {
      final needsVerification =
          requireVerifiedEmail || session.provider == IdentityProvider.keycloak;
      final verified = !needsVerification || session.emailVerified;
      _set(
        AuthState(
          verified ? AuthStatus.authenticated : AuthStatus.verificationRequired,
          session: session,
        ),
      );
      _expiry = Timer(session.expiresAt.difference(_clock()), checkExpiry);
    }
  }

  void _fail(Object error) {
    _listenEnabled = false;
    _set(
      AuthState(
        AuthStatus.failure,
        failure: error is AuthFailure
            ? error
            : const AuthFailure(
                AuthErrorCode.operationFailed,
                'We could not complete authentication. Please try again.',
              ),
      ),
    );
  }

  void _set(AuthState state) {
    if (_disposed) return;
    _expiry?.cancel();
    _expiry = null;
    _state = state;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    ++_generation;
    _expiry?.cancel();
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
