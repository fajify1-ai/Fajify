class BusinessConfig {
  const BusinessConfig({
    this.environment = 'development',
    this.useMocks = true,
  });
  final String environment;
  final bool useMocks;
  static const fromBuild = BusinessConfig(
    environment: String.fromEnvironment('APP_ENV', defaultValue: 'development'),
    useMocks:
        String.fromEnvironment('USE_MOCK_SERVICES', defaultValue: 'true') ==
        'true',
  );
  String? get problem => environment != 'development' || !useMocks
      ? 'This M1 build supports development mock services only. Use APP_ENV=development and USE_MOCK_SERVICES=true. Live service adapters are not configured.'
      : null;
}
