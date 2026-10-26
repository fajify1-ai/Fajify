/// Build-time public settings only. No client secret belongs in a native app.
class NativeOidcSettings {
  NativeOidcSettings({
    required this.issuer,
    required this.apiOrigin,
    required this.clientId,
    required this.redirectUri,
    required this.logoutRedirectUri,
    required List<String> scopes,
  }) : scopes = List.unmodifiable(scopes) {
    for (final uri in [issuer, apiOrigin]) {
      if (uri.scheme != 'https' ||
          uri.host.isEmpty ||
          uri.userInfo.isNotEmpty ||
          uri.hasQuery ||
          uri.hasFragment) {
        throw const FormatException('Reviewed HTTPS configuration is required');
      }
    }
    if ((apiOrigin.path.isNotEmpty && apiOrigin.path != '/') ||
        issuer.path.endsWith('/') ||
        clientId != 'faji-customer-mobile' ||
        redirectUri.toString() != 'com.faji.customer:/oauth/callback' ||
        logoutRedirectUri != redirectUri ||
        !scopes.contains('openid') ||
        !scopes.contains('email') ||
        scopes.any((scope) => !RegExp(r'^[A-Za-z0-9._:-]+$').hasMatch(scope))) {
      throw const FormatException(
        'Configuration does not match the mobile contract',
      );
    }
  }

  final Uri issuer;
  final Uri apiOrigin;
  final String clientId;
  final Uri redirectUri;
  final Uri logoutRedirectUri;
  final List<String> scopes;

  /// Missing, disabled or invalid settings never activate live authentication.
  static NativeOidcSettings? fromValues(Map<String, String> values) {
    if (values['FAJI_CUSTOMER_NATIVE_AUTH_ENABLED'] != 'true') return null;
    try {
      String requiredValue(String name) {
        final value = values[name];
        if (value == null || value.isEmpty || value != value.trim()) {
          throw const FormatException();
        }
        return value;
      }

      return NativeOidcSettings(
        issuer: Uri.parse(requiredValue('FAJI_CUSTOMER_OIDC_ISSUER')),
        apiOrigin: Uri.parse(requiredValue('FAJI_CUSTOMER_API_ORIGIN')),
        clientId: requiredValue('FAJI_CUSTOMER_OIDC_CLIENT_ID'),
        redirectUri: Uri.parse(
          requiredValue('FAJI_CUSTOMER_OIDC_REDIRECT_URI'),
        ),
        logoutRedirectUri: Uri.parse(
          requiredValue('FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI'),
        ),
        scopes: requiredValue('FAJI_CUSTOMER_OIDC_SCOPES')
            .split(RegExp(r'\s+')),
      );
    } catch (_) {
      return null;
    }
  }

  static NativeOidcSettings? fromEnvironment() => fromValues(const {
    'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': String.fromEnvironment(
      'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED',
    ),
    'FAJI_CUSTOMER_OIDC_ISSUER': String.fromEnvironment(
      'FAJI_CUSTOMER_OIDC_ISSUER',
    ),
    'FAJI_CUSTOMER_API_ORIGIN': String.fromEnvironment(
      'FAJI_CUSTOMER_API_ORIGIN',
    ),
    'FAJI_CUSTOMER_OIDC_CLIENT_ID': String.fromEnvironment(
      'FAJI_CUSTOMER_OIDC_CLIENT_ID',
    ),
    'FAJI_CUSTOMER_OIDC_REDIRECT_URI': String.fromEnvironment(
      'FAJI_CUSTOMER_OIDC_REDIRECT_URI',
    ),
    'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI': String.fromEnvironment(
      'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI',
    ),
    'FAJI_CUSTOMER_OIDC_SCOPES': String.fromEnvironment(
      'FAJI_CUSTOMER_OIDC_SCOPES',
    ),
  });

  /// Binds persisted credentials to every configured identity/API boundary.
  List<Object> get binding => [
    issuer.toString(),
    apiOrigin.toString(),
    clientId,
    redirectUri.toString(),
    logoutRedirectUri.toString(),
    scopes,
  ];
}
