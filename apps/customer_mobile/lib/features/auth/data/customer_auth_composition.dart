import 'package:flutter/foundation.dart';

import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';
import 'native_account_verifier.dart';
import 'native_keycloak_repository.dart';
import 'native_oidc_gateway.dart';
import 'native_oidc_settings.dart';
import 'platform_secure_session_store.dart';

CustomerAuthRepository createCustomerAuthRepository({
  Map<String, String>? values,
  TargetPlatform? platform,
  bool? isWeb,
}) {
  final NativeOidcSettings settings;
  try {
    settings = NativeOidcSettings.requireValues(
      values ?? NativeOidcSettings.environmentValues,
    );
  } on AuthFailure catch (failure) {
    return ConfigurationFailureRepository(failure);
  }
  final target = platform ?? defaultTargetPlatform;
  if ((isWeb ?? kIsWeb) ||
      (target != TargetPlatform.android && target != TargetPlatform.iOS)) {
    return const ConfigurationFailureRepository(
      AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Native sign-in requires the Android or iOS app.',
      ),
    );
  }
  return NativeKeycloakRepository(
    settings: settings,
    gateway: AppAuthOidcGateway(settings),
    store: PlatformSecureSessionStore(),
    accounts: OidcAccountVerifier(settings),
  );
}

/// Displays an actionable configuration error through the normal controller,
/// rather than crashing startup or claiming that a placeholder is configured.
class ConfigurationFailureRepository extends UnavailableAuthRepository
    implements
        CustomerPasswordSignIn,
        CustomerPasswordRegistration,
        BrowserOidcAuthorization {
  const ConfigurationFailureRepository(this.failure);
  final AuthFailure failure;

  @override
  Future<AuthSession> signIn(String identifier, String password) async =>
      throw failure;
  @override
  Future<AuthSession> register(LegacyRegistration registration) async =>
      throw failure;
  @override
  Future<AuthSession> authorize() async => throw failure;
  @override
  Future<AuthSession> completeAuthorization(Uri callback) async =>
      throw failure;
  @override
  Future<void> beginRegistration() async => throw failure;
  @override
  Future<void> beginRecovery() async => throw failure;
}
