class BusinessConfig {
  const BusinessConfig({
    this.environment = 'development',
    this.useMocks = true,
    this.apiBaseUrl = '',
  });

  final String environment;
  final bool useMocks;
  final String apiBaseUrl;

  static const fromBuild = BusinessConfig(
    environment: String.fromEnvironment('APP_ENV', defaultValue: 'development'),
    useMocks:
        String.fromEnvironment('USE_MOCK_SERVICES', defaultValue: 'false') ==
        'true',
    apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
  );

  String? get problem {
    if (environment != 'development') {
      return 'Only the development environment is configured for this build.';
    }
    if (useMocks) return null;

    final api=Uri.tryParse(apiBaseUrl);
    if(!_isSafeEndpoint(api))return 'Configure HTTPS API_BASE_URL for live authentication.';
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
