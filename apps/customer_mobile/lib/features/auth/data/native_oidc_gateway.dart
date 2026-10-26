import 'package:flutter_appauth/flutter_appauth.dart';

import 'native_oidc_settings.dart';
import '../domain/auth_repository.dart';

/// Secret-bearing provider data. Never pass this object to presentation/logs.
class NativeOidcTokens {
  const NativeOidcTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.idToken,
    required this.expiresAt,
  });
  final String accessToken;
  final String refreshToken;
  final String idToken;
  final DateTime expiresAt;
  @override
  String toString() => 'NativeOidcTokens(redacted)';
}

abstract interface class NativeOidcGateway {
  Future<NativeOidcTokens> authorize({
    CustomerAuthJourney journey = CustomerAuthJourney.signIn,
  });
  Future<NativeOidcTokens> refresh(NativeOidcTokens previous);
  Future<void> endSession(NativeOidcTokens tokens);
}

class NativeAuthorizationCancelled implements Exception {
  const NativeAuthorizationCancelled();
}

/// Native AppAuth owns state/nonce, S256 PKCE, code exchange and browser callback.
/// No raw callback URI or password is accepted by this adapter.
class AppAuthOidcGateway implements NativeOidcGateway {
  AppAuthOidcGateway(this.settings, {FlutterAppAuth? sdk})
    : _sdk = sdk ?? const FlutterAppAuth();
  final NativeOidcSettings settings;
  final FlutterAppAuth _sdk;

  NativeOidcTokens _tokens(
    TokenResponse response, [
    NativeOidcTokens? previous,
  ]) {
    final access = response.accessToken;
    final refresh = response.refreshToken ?? previous?.refreshToken;
    final id = response.idToken ?? previous?.idToken;
    final expires = response.accessTokenExpirationDateTime;
    if (access == null ||
        access.isEmpty ||
        refresh == null ||
        refresh.isEmpty ||
        id == null ||
        id.isEmpty ||
        expires == null ||
        response.tokenType?.toLowerCase() != 'bearer') {
      throw const FormatException('Incomplete provider session');
    }
    return NativeOidcTokens(
      accessToken: access,
      refreshToken: refresh,
      idToken: id,
      expiresAt: expires.toUtc(),
    );
  }

  @override
  Future<NativeOidcTokens> authorize({
    CustomerAuthJourney journey = CustomerAuthJourney.signIn,
  }) async {
    try {
      final response = await _sdk.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          settings.clientId,
          settings.redirectUri.toString(),
          issuer: settings.issuer.toString(),
          scopes: settings.scopes,
          allowInsecureConnections: false,
          promptValues: switch (journey) {
            CustomerAuthJourney.registration => ['create'],
            CustomerAuthJourney.recovery => ['login'],
            _ => null,
          },
          additionalParameters: journey == CustomerAuthJourney.verifyEmail
              ? {'kc_action': 'VERIFY_EMAIL'}
              : null,
        ),
      );
      if (response.authorizationAdditionalParameters?['kc_action_status'] ==
          'cancelled') {
        throw const NativeAuthorizationCancelled();
      }
      return _tokens(response);
    } on FlutterAppAuthUserCancelledException {
      throw const NativeAuthorizationCancelled();
    }
  }

  @override
  Future<NativeOidcTokens> refresh(NativeOidcTokens previous) async => _tokens(
    await _sdk.token(
      TokenRequest(
        settings.clientId,
        settings.redirectUri.toString(),
        issuer: settings.issuer.toString(),
        refreshToken: previous.refreshToken,
        scopes: settings.scopes,
        allowInsecureConnections: false,
      ),
    ),
    previous,
  );

  @override
  Future<void> endSession(NativeOidcTokens tokens) async {
    await _sdk.endSession(
      EndSessionRequest(
        idTokenHint: tokens.idToken,
        issuer: settings.issuer.toString(),
        postLogoutRedirectUrl: settings.logoutRedirectUri.toString(),
      ),
    );
  }
}
