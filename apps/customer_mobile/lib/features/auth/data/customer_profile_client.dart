import 'dart:convert';

import '../domain/auth_session.dart';
import 'customer_identity_client.dart';
import 'identity_http_stub.dart'
    if (dart.library.io) 'identity_http_io.dart'
    as platform;

/// Existing NestJS GET /customer/profile contract. The server selects the
/// profile from the signed subject; no client-selected account ID is sent.
class CustomerProfileClient {
  CustomerProfileClient({required Uri apiOrigin, IdentityRequest? request})
    : _endpoint = apiOrigin.resolve('/api/v1/customer/profile'),
      _request = request ?? platform.requestIdentity {
    if (apiOrigin.scheme != 'https' ||
        apiOrigin.host.isEmpty ||
        apiOrigin.userInfo.isNotEmpty ||
        apiOrigin.hasQuery ||
        apiOrigin.hasFragment ||
        (apiOrigin.path.isNotEmpty && apiOrigin.path != '/')) {
      throw ArgumentError('A configured HTTPS API origin is required.');
    }
  }
  final Uri _endpoint;
  final IdentityRequest _request;

  Future<String> loadDisplayName(String accessToken) async {
    if (accessToken.isEmpty) {
      throw const AuthFailure(
        AuthErrorCode.invalidCredentials,
        'Please sign in to load your profile.',
      );
    }
    final response = await _request(
      _endpoint,
      accessToken,
    ).timeout(const Duration(seconds: 10));
    if (response.statusCode != 200 ||
        utf8.encode(response.body).length > 65536) {
      throw const AuthFailure(
        AuthErrorCode.network,
        'We could not load your profile.',
      );
    }
    final value = jsonDecode(response.body);
    final name = value is Map<String, dynamic> ? value['displayName'] : null;
    if (name is! String || name.trim().isEmpty || name.length > 120) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'Your profile name is not available.',
      );
    }
    return name.trim();
  }
}
