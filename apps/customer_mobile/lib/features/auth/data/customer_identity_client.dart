import 'dart:convert';

import '../domain/auth_session.dart';
import 'identity_http_stub.dart'
    if (dart.library.io) 'identity_http_io.dart'
    as platform;

/// Published Phase 1 /auth/me DTO. This is not a name/photo profile contract.
class CurrentCustomerIdentity {
  CurrentCustomerIdentity({required this.subject, required List<String> roles})
    : roles = List.unmodifiable(roles);

  final String subject;
  final List<String> roles;

  @override
  String toString() => 'CurrentCustomerIdentity(redacted)';
}

typedef IdentityResponse = ({int statusCode, String body});
typedef IdentityRequest = Future<IdentityResponse> Function(
  Uri endpoint,
  String accessToken,
);

/// Called by the future verified OIDC adapter, never directly by widgets.
/// No token is retained; no cached identity can mask suspension or revocation.
class CustomerIdentityClient {
  CustomerIdentityClient({required Uri apiOrigin, IdentityRequest? request})
    : _endpoint = _endpointFor(apiOrigin),
      _request = request ?? platform.requestIdentity;

  final Uri _endpoint;
  final IdentityRequest _request;

  static Uri _endpointFor(Uri origin) {
    if (origin.scheme != 'https' ||
        origin.host.isEmpty ||
        origin.userInfo.isNotEmpty ||
        origin.hasQuery ||
        origin.hasFragment ||
        (origin.path.isNotEmpty && origin.path != '/')) {
      throw ArgumentError('A reviewed HTTPS API origin is required.');
    }
    return origin.resolve('/api/v1/auth/me');
  }

  Future<CurrentCustomerIdentity> load({
    required String accessToken,
    required String expectedSubject,
  }) async {
    if (!RegExp(r'^[A-Za-z0-9._~+/-]+=*$').hasMatch(accessToken) ||
        accessToken.length > 16384 ||
        expectedSubject.trim().isEmpty) {
      throw const AuthFailure(
        AuthErrorCode.invalidCredentials,
        'A verified identity session is required.',
      );
    }
    try {
      final response = await _request(
        _endpoint,
        accessToken,
      ).timeout(const Duration(seconds: 10));
      if (response.statusCode == 401) {
        throw const AuthFailure(
          AuthErrorCode.invalidCredentials,
          'Your session is no longer valid. Please sign in again.',
        );
      }
      if (response.statusCode == 403) {
        throw const AuthFailure(
          AuthErrorCode.disabled,
          'Customer account access is not available.',
        );
      }
      if (response.statusCode != 200) {
        throw const AuthFailure(
          AuthErrorCode.network,
          'Account verification is temporarily unavailable.',
        );
      }
      if (utf8.encode(response.body).length > 65536) {
        throw const FormatException();
      }
      final value = jsonDecode(response.body);
      if (value is! Map<String, dynamic> ||
          value['subject'] != expectedSubject ||
          value['roles'] is! List ||
          !(value['roles'] as List).every(
            (role) => role is String && role.trim().isNotEmpty,
          )) {
        throw const FormatException();
      }
      final roles = List<String>.from(value['roles'] as List);
      if (!roles.contains('customer')) {
        throw const AuthFailure(
          AuthErrorCode.disabled,
          'Customer account access is not available.',
        );
      }
      return CurrentCustomerIdentity(subject: expectedSubject, roles: roles);
    } on AuthFailure {
      rethrow;
    } catch (_) {
      // Never propagate HTTP bodies, tokens, URLs or platform exceptions.
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not verify your customer account. Please try again.',
      );
    }
  }
}
