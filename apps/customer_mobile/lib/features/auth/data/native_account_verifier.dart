import 'dart:convert';

import '../domain/auth_session.dart';
import 'customer_identity_client.dart';
import 'native_oidc_settings.dart';
import 'identity_http_stub.dart'
    if (dart.library.io) 'identity_http_io.dart'
    as platform;

typedef OidcJsonRequest = Future<IdentityResponse> Function(
  Uri uri,
  String? token,
);

abstract interface class NativeAccountVerifier {
  Future<String> verify(String accessToken);
}

/// Do not decode an ID token and call its claims verified. AppAuth performs
/// protocol checks; UserInfo proves email/subject using the access token, and
/// NestJS /me independently enforces signed-token and active-account policy.
class OidcAccountVerifier implements NativeAccountVerifier {
  OidcAccountVerifier(
    this.settings, {
    OidcJsonRequest? request,
    CustomerIdentityClient? identity,
  }) : _request = request ?? platform.requestOidcJson,
       _identity =
           identity ?? CustomerIdentityClient(apiOrigin: settings.apiOrigin);
  final NativeOidcSettings settings;
  final OidcJsonRequest _request;
  final CustomerIdentityClient _identity;

  Future<Map<String, dynamic>> _get(Uri uri, String? token) async {
    final result = await _request(
      uri,
      token,
    ).timeout(const Duration(seconds: 10));
    if (result.statusCode != 200 || utf8.encode(result.body).length > 65536) {
      throw const FormatException();
    }
    final value = jsonDecode(result.body);
    if (value is! Map<String, dynamic>) throw const FormatException();
    return value;
  }

  @override
  Future<String> verify(String accessToken) async {
    try {
      final discovery = await _get(
        Uri.parse('${settings.issuer}/.well-known/openid-configuration'),
        null,
      );
      if (discovery['issuer'] != settings.issuer.toString() ||
          discovery['userinfo_endpoint'] is! String) {
        throw const FormatException();
      }
      final endpoint = Uri.parse(discovery['userinfo_endpoint'] as String);
      if (endpoint.scheme != 'https' ||
          endpoint.origin != settings.issuer.origin ||
          endpoint.userInfo.isNotEmpty ||
          endpoint.hasQuery ||
          endpoint.hasFragment) {
        throw const FormatException();
      }
      final user = await _get(endpoint, accessToken);
      final subject = user['sub'];
      if (subject is! String || subject.trim().isEmpty) {
        throw const FormatException();
      }
      if (user['email_verified'] != true) {
        throw const AuthFailure(
          AuthErrorCode.disabled,
          'Please verify your email before signing in.',
        );
      }
      await _identity.load(accessToken: accessToken, expectedSubject: subject);
      return subject;
    } on AuthFailure {
      rethrow;
    } catch (_) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not verify your customer account. Please try again.',
      );
    }
  }
}
