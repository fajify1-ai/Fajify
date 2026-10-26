import 'dart:convert';
import 'dart:io';

/// Native HTTPS transport; deliberately does not follow bearer redirects.
Future<({int statusCode, String body})> requestIdentity(
  Uri endpoint,
  String accessToken,
) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
  try {
    return await (() async {
      final request = await client.getUrl(endpoint);
      request.followRedirects = false;
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer $accessToken',
      );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
      final response = await request.close();
      if (response.statusCode != 200) {
        return (statusCode: response.statusCode, body: '');
      }
      if (response.headers.contentType?.mimeType != 'application/json') {
        throw const FormatException();
      }
      final bytes = <int>[];
      await for (final chunk in response) {
        if (bytes.length + chunk.length > 65536) {
          throw const FormatException();
        }
        bytes.addAll(chunk);
      }
      return (statusCode: response.statusCode, body: utf8.decode(bytes));
    })().timeout(const Duration(seconds: 10));
  } finally {
    client.close(force: true);
  }
}
