import 'package:flutter/foundation.dart';

import '../domain/auth_repository.dart';
import 'native_account_verifier.dart';
import 'native_keycloak_repository.dart';
import 'native_oidc_gateway.dart';
import 'native_oidc_settings.dart';
import 'oidc_auth_boundary.dart';
import 'platform_secure_session_store.dart';

CustomerAuthRepository createCustomerAuthRepository() {
  final settings = NativeOidcSettings.fromEnvironment();
  if (settings == null ||
      kIsWeb ||
      (defaultTargetPlatform != TargetPlatform.android &&
          defaultTargetPlatform != TargetPlatform.iOS)) {
    return const PendingKeycloakRepository(CustomerOidcConfiguration());
  }
  return NativeKeycloakRepository(
    settings: settings,
    gateway: AppAuthOidcGateway(settings),
    store: PlatformSecureSessionStore(),
    accounts: OidcAccountVerifier(settings),
  );
}
