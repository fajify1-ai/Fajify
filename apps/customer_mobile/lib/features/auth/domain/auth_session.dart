enum IdentityProvider { legacyFirebase, keycloak }

/// Client session metadata only. Never contains passwords or bearer tokens.
class AuthSession {
  AuthSession({
    required this.subject,
    required this.provider,
    required this.expiresAt,
    required this.emailVerified,
    required this.customerAccess,
  });

  final String subject;
  final IdentityProvider provider;
  final DateTime expiresAt;
  final bool emailVerified;

  /// Provider decision for the client journey; never substitutes for API RBAC.
  final bool customerAccess;

  bool isExpired(DateTime now) => !expiresAt.isAfter(now);
}

enum AuthStatus {
  restoring,
  signedOut,
  authenticating,
  authenticated,
  verificationRequired,
  expired,
  signingOut,
  failure,
}

enum AuthErrorCode {
  invalidCredentials,
  invalidInput,
  accountExists,
  disabled,
  rateLimited,
  network,
  providerUnavailable,
  operationFailed,
}

class AuthFailure implements Exception {
  const AuthFailure(this.code, this.message);
  final AuthErrorCode code;
  final String message;

  @override
  String toString() => 'AuthFailure(${code.name})';
}

class AuthState {
  const AuthState(this.status, {this.session, this.failure});
  final AuthStatus status;
  final AuthSession? session;
  final AuthFailure? failure;

  bool allowsCustomerAccess(DateTime now) =>
      status == AuthStatus.authenticated &&
      session != null &&
      session!.subject.isNotEmpty &&
      session!.customerAccess &&
      !session!.isExpired(now);
}
