/// Browser bearer transport is intentionally unsupported. Customer web uses
/// its Next.js server session boundary; never store tokens in browser storage.
Future<({int statusCode, String body})> requestIdentity(
  Uri endpoint,
  String accessToken,
) async => throw UnsupportedError('Native identity transport required');
