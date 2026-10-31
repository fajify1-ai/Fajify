class BusinessConfig {
  const BusinessConfig({
    this.environment = 'development',
    this.useMocks = true,
    this.oidcIssuer = '',
    this.oidcClientId = 'faji-business-mobile',
    this.oidcRedirectUri = 'com.faji.business:/oauth/callback',
    this.apiBaseUrl = '',
  });

  final String environment;
  final bool useMocks;
  final String oidcIssuer;
  final String oidcClientId;
  final String oidcRedirectUri;
  final String apiBaseUrl;

  static const fromBuild = BusinessConfig(
    environment: String.fromEnvironment('APP_ENV', defaultValue: 'development'),
    useMocks:
        String.fromEnvironment('USE_MOCK_SERVICES', defaultValue: 'false') ==
        'true',
    oidcIssuer: String.fromEnvironment('OIDC_ISSUER'),
    oidcClientId: String.fromEnvironment(
      'OIDC_CLIENT_ID',
      defaultValue: 'faji-business-mobile',
    ),
    oidcRedirectUri: String.fromEnvironment(
      'OIDC_REDIRECT_URI',
      defaultValue: 'com.faji.business:/oauth/callback',
    ),
    apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
  );

  String? get problem {
    if (environment != 'development') {
      return 'Only the development environment is configured for this build.';
    }
    if (useMocks) return null;

    final issuer = Uri.tryParse(oidcIssuer);
    final api = Uri.tryParse(apiBaseUrl);
    final redirect = Uri.tryParse(oidcRedirectUri);
    if (!_isSafeEndpoint(issuer) ||
        !_isSafeEndpoint(api) ||
        issuer!.pathSegments.isEmpty ||
        (api!.path.isNotEmpty && api.path != '/') ||
        oidcClientId.trim().isEmpty ||
        redirect == null ||
        redirect.scheme != 'com.faji.business' ||
        redirect.path != '/oauth/callback' ||
        redirect.hasQuery ||
        redirect.hasFragment) {
      return 'Configure OIDC_ISSUER, API_BASE_URL, OIDC_CLIENT_ID and the registered OIDC_REDIRECT_URI before using live authentication.';
    }
    return null;
  }

  bool _isSafeEndpoint(Uri? uri) =>
      uri != null &&
      (uri.scheme == 'https' ||
          (uri.scheme == 'http' &&
              (uri.host == 'localhost' || uri.host == '127.0.0.1'))) &&
      uri.host.isNotEmpty &&
      uri.userInfo.isEmpty &&
      !uri.hasQuery &&
      !uri.hasFragment;
}
