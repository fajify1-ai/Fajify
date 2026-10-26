import 'dart:async';
import 'dart:convert';

import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';
import 'native_account_verifier.dart';
import 'native_oidc_gateway.dart';
import 'native_oidc_settings.dart';
import 'oidc_auth_boundary.dart';

/// Tokens stay private to this data layer. AuthController remains the single
/// source of presentation state. Serialized work plus a logout generation
/// prevents late login/refresh writes from resurrecting cleared credentials.
class NativeKeycloakRepository
    implements CustomerAuthRepository, BrowserOidcAuthorization {
  NativeKeycloakRepository({
    required this.settings,
    required this.gateway,
    required this.store,
    required this.accounts,
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now;

  final NativeOidcSettings settings;
  final NativeOidcGateway gateway;
  final SecureSessionStore store;
  final NativeAccountVerifier accounts;
  final DateTime Function() _clock;
  NativeOidcTokens? _tokens;
  NativeOidcTokens? _issued;
  String? _subject;
  Future<void> _tail = Future.value();
  Future<AuthSession?>? _refreshing;
  int _generation = 0;

  @override
  Stream<AuthSession?> get sessionChanges => const Stream.empty();

  Future<T> _ordered<T>(Future<T> Function() operation) {
    final result = _tail.then((_) => operation());
    _tail = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  void _current(int generation) {
    if (generation != _generation) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'Sign-in was cancelled.',
      );
    }
  }

  Future<void> _forget() async {
    _tokens = null;
    _subject = null;
    try {
      await store.clear();
    } catch (_) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'Secure session cleanup could not be completed.',
      );
    }
  }

  Future<AuthSession> _accept(
    NativeOidcTokens tokens,
    int generation, {
    String? expectedSubject,
  }) async {
    _issued =
        tokens; // Retained only to end an in-flight browser session on logout.
    _current(generation);
    if (!tokens.expiresAt.isAfter(_clock()) ||
        !RegExp(r'^[A-Za-z0-9._~+/-]+=*$').hasMatch(tokens.accessToken) ||
        tokens.refreshToken.isEmpty ||
        tokens.idToken.isEmpty) {
      throw const FormatException();
    }
    final subject = await accounts.verify(tokens.accessToken);
    _current(generation);
    if (expectedSubject != null && subject != expectedSubject) {
      throw const FormatException();
    }
    if (!tokens.expiresAt.isAfter(_clock())) throw const FormatException();
    await store.write(
      jsonEncode({
        'version': 1,
        'binding': settings.binding,
        'subject': subject,
        'refreshToken': tokens.refreshToken,
        'idToken': tokens.idToken,
      }),
    );
    _current(generation);
    _tokens = tokens;
    _subject = subject;
    return AuthSession(
      subject: subject,
      provider: IdentityProvider.keycloak,
      expiresAt: tokens.expiresAt,
      emailVerified: true,
      customerAccess: true,
    );
  }

  Future<AuthSession?> _guard(Future<AuthSession?> Function() operation) async {
    try {
      return await operation();
    } catch (error) {
      await _forget();
      if (error is AuthFailure) rethrow;
      if (error is NativeAuthorizationCancelled) {
        throw const AuthFailure(
          AuthErrorCode.operationFailed,
          'Sign-in was cancelled.',
        );
      }
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not complete authentication. Please sign in again.',
      );
    }
  }

  @override
  Future<AuthSession> authorize() {
    final generation = _generation;
    return _ordered(
      () async => (await _guard(() async {
        _current(generation);
        await _forget();
        return _accept(await gateway.authorize(), generation);
      }))!,
    );
  }

  @override
  Future<AuthSession?> restoreSession() => refreshSession();

  @override
  Future<AuthSession?> refreshSession() {
    final pending = _refreshing;
    if (pending != null) return pending;
    final generation = _generation;
    final operation = _ordered(
      () => _guard(() async {
        _current(generation);
        var tokens = _tokens;
        var expectedSubject = _subject;
        if (tokens == null) {
          final raw = await store.read();
          _current(generation);
          if (raw == null) return null;
          final value = jsonDecode(raw);
          if (value is! Map<String, dynamic> ||
              value['version'] != 1 ||
              jsonEncode(value['binding']) != jsonEncode(settings.binding) ||
              value['subject'] is! String ||
              (value['subject'] as String).trim().isEmpty ||
              value['refreshToken'] is! String ||
              (value['refreshToken'] as String).isEmpty ||
              value['idToken'] is! String ||
              (value['idToken'] as String).isEmpty) {
            throw const FormatException();
          }
          expectedSubject = value['subject'] as String;
          // Cached metadata grants no access. Always refresh through AppAuth.
          tokens = NativeOidcTokens(
            accessToken: '',
            refreshToken: value['refreshToken'] as String,
            idToken: value['idToken'] as String,
            expiresAt: DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
          );
        }
        return _accept(
          await gateway.refresh(tokens),
          generation,
          expectedSubject: expectedSubject,
        );
      }),
    );
    _refreshing = operation;
    // Register cleanup without creating an unhandled failed secondary future.
    operation.then<void>(
      (_) {
        if (identical(_refreshing, operation)) _refreshing = null;
      },
      onError: (Object _, StackTrace _) {
        if (identical(_refreshing, operation)) _refreshing = null;
      },
    );
    return operation;
  }

  @override
  Future<void> signOut() {
    ++_generation; // Invalidate in-flight results before awaiting the queue.
    _refreshing = null;
    final captured = _tokens ?? _issued;
    final hint = captured == null ? store.read() : Future<String?>.value();
    // Clear locally without waiting for a hung provider request. The store's
    // own serialization orders cleanup after any already-started write/read.
    final cleanup = hint.then(
      (_) => _forget(),
      onError: (Object _, StackTrace _) => _forget(),
    );
    final cleanupError = cleanup.then<Object?>(
      (_) => null,
      onError: (Object error, StackTrace _) => error,
    );
    return _ordered(() async {
      var tokens = _issued ?? captured;
      _issued = null;
      final localError = await cleanupError;
      if (localError != null) throw localError;
      if (tokens == null) {
        try {
          final raw = await hint;
          final value = raw == null ? null : jsonDecode(raw);
          if (value is Map<String, dynamic> &&
              jsonEncode(value['binding']) == jsonEncode(settings.binding) &&
              value['idToken'] is String &&
              (value['idToken'] as String).isNotEmpty) {
            tokens = NativeOidcTokens(
              accessToken: '',
              refreshToken: '',
              idToken: value['idToken'] as String,
              expiresAt: DateTime.fromMillisecondsSinceEpoch(0),
            );
          }
        } catch (_) {
          throw const AuthFailure(
            AuthErrorCode.operationFailed,
            'Signed out locally. Identity-provider logout could not be confirmed.',
          );
        }
      }
      // Local removal is mandatory even when the browser end-session fails.
      if (tokens != null) {
        try {
          await gateway.endSession(tokens);
        } catch (_) {
          throw const AuthFailure(
            AuthErrorCode.operationFailed,
            'Signed out locally. Identity-provider logout could not be confirmed.',
          );
        }
      }
    });
  }

  @override
  Future<AuthSession> completeAuthorization(Uri callback) async =>
      throw const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'The native identity SDK must complete its own browser transaction.',
      );

  @override
  Future<void> beginRegistration() async => throw const AuthFailure(
    AuthErrorCode.providerUnavailable,
    'Registration requires the approved identity-provider browser flow.',
  );

  @override
  Future<void> beginRecovery() async => throw const AuthFailure(
    AuthErrorCode.providerUnavailable,
    'Open password recovery from the identity-provider sign-in page.',
  );
}
