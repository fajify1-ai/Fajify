import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';

/// No defaults: supply only reviewed Phase 1 values via application composition.
class CustomerOidcConfiguration {
  const CustomerOidcConfiguration({
    this.issuer,
    this.clientId,
    this.redirectUri,
    this.postLogoutRedirectUri,
  });

  final Uri? issuer;
  final String? clientId;
  final Uri? redirectUri;
  final Uri? postLogoutRedirectUri;
}

/// Future adapter uses a maintained native OIDC SDK, the system browser and
/// Authorization Code + S256 PKCE. Password collection is deliberately absent.
abstract interface class BrowserOidcAuthorization
    implements CustomerAccountRecovery {
  Future<AuthSession> authorize();
  Future<AuthSession> completeAuthorization(Uri callback);
  Future<void> beginRegistration();
  @override
  Future<void> beginRecovery();
}

/// Implement with platform-backed secure storage; never SharedPreferences.
/// Values are opaque to presentation and must not be logged.
abstract interface class SecureSessionStore {
  Future<String?> read();
  Future<void> write(String serializedSession);
  Future<void> clear();
}

abstract interface class ProviderSessionLifecycle {
  Future<AuthSession?> refresh();
  Future<void> revoke();
  Future<void> endSession();
}

/// BLOCKED BY PHASE 1: approved clients/callbacks, role policy and SDK adapter.
/// Even a fully populated configuration cannot grant access through this stub.
class PendingKeycloakRepository extends UnavailableAuthRepository
    implements BrowserOidcAuthorization {
  const PendingKeycloakRepository(this.configuration);
  final CustomerOidcConfiguration configuration;

  Never _blocked() => throw const AuthFailure(
    AuthErrorCode.providerUnavailable,
    'Keycloak sign-in is awaiting approved integration configuration.',
  );

  @override
  Future<AuthSession> authorize() async => _blocked();
  @override
  Future<AuthSession> completeAuthorization(Uri callback) async => _blocked();
  @override
  Future<void> beginRegistration() async => _blocked();
  @override
  Future<void> beginRecovery() async => _blocked();
}
