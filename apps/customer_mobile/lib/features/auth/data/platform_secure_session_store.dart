import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/auth_session.dart';
import 'oidc_auth_boundary.dart';

/// Native mobile storage only. This adapter stores opaque SDK state, never
/// treats cached metadata as proof of authentication and has no plaintext fallback.
/// Compose with the OIDC SDK only after device storage acceptance checks.
class PlatformSecureSessionStore implements SecureSessionStore {
  PlatformSecureSessionStore([this._storage = const FlutterSecureStorage()]);

  final FlutterSecureStorage _storage;
  static const _key = 'fajify.customer.oidc.session.v1';
  Future<void> _pending = Future<void>.value();

  /// A logout clear must complete after any already-started session write.
  /// Share one instance per SDK lifecycle; callers still cancel stale provider
  /// operations before submitting new writes after logout.
  Future<T> _ordered<T>(Future<T> Function() operation) {
    final result = _pending.then((_) => operation());
    // Failure must reach its caller without poisoning subsequent cleanup.
    _pending = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  void _requireMobile() {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      throw const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Secure customer sessions require a supported mobile platform.',
      );
    }
  }

  @override
  Future<String?> read() => _ordered(() async {
    _requireMobile();
    return _storage.read(key: _key);
  });

  @override
  Future<void> write(String serializedSession) => _ordered(() async {
    _requireMobile();
    await _storage.write(key: _key, value: serializedSession);
  });

  @override
  Future<void> clear() => _ordered(() async {
    _requireMobile();
    // Remove only this app's customer session, never unrelated secure entries.
    await _storage.delete(key: _key);
  });
}
