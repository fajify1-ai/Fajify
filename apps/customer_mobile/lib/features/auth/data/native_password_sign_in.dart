import 'dart:convert';

import '../domain/auth_session.dart';
import 'customer_identity_client.dart';
import 'native_oidc_gateway.dart';
import 'native_oidc_settings.dart';
import 'identity_http_stub.dart'
    if (dart.library.io) 'identity_http_io.dart'
    as platform;

typedef PasswordTokenRequest = Future<IdentityResponse> Function(
  Uri endpoint,
  Map<String, String> fields,
);

/// Exchanges credentials directly with the configured issuer. Passwords never
/// enter persisted session state. The repository verifies account access before
/// accepting or saving the returned tokens.
class NativePasswordSignIn {
  NativePasswordSignIn(
    this.settings, {
    PasswordTokenRequest? request,
    DateTime Function()? clock,
  }) : _request = request ?? platform.postOidcForm,
       _clock = clock ?? DateTime.now;

  final NativeOidcSettings settings;
  final PasswordTokenRequest _request;
  final DateTime Function() _clock;

  Future<NativeOidcTokens> signIn(String identifier, String password) async {
    if (identifier.trim().isEmpty || password.isEmpty) {
      throw const AuthFailure(
        AuthErrorCode.invalidInput,
        'Enter your email or username and password.',
      );
    }
    try {
      final response = await _request(
        Uri.parse('${settings.issuer}/protocol/openid-connect/token'),
        {
          'grant_type': 'password',
          'client_id': settings.clientId,
          'scope': settings.scopes.join(' '),
          'username': identifier.trim(),
          'password': password,
        },
      ).timeout(const Duration(seconds: 12));
      if (response.statusCode == 429) {
        throw const AuthFailure(
          AuthErrorCode.rateLimited,
          'Too many attempts. Please wait and try again.',
        );
      }
      if (response.statusCode >= 500) {
        throw const AuthFailure(
          AuthErrorCode.providerUnavailable,
          'The account server is unavailable. Please try again later.',
        );
      }
      if (utf8.encode(response.body).length > 65536) {
        throw const FormatException();
      }
      final value = jsonDecode(response.body);
      if (value is! Map<String, dynamic>) throw const FormatException();
      if (response.statusCode != 200) {
        // Provider response text can contain account details: never display it.
        if (value['error'] == 'invalid_grant') {
          if (value['error_description'] == 'Account is not fully set up') {
            throw const AuthFailure(
              AuthErrorCode.providerUnavailable,
              'Your account profile is incomplete. Please contact support.',
            );
          }
          throw const AuthFailure(
            AuthErrorCode.invalidCredentials,
            'Incorrect email, username or password.',
          );
        }
        throw const AuthFailure(
          AuthErrorCode.providerUnavailable,
          'Account sign-in is unavailable. Please try again later.',
        );
      }
      final access = value['access_token'];
      final refresh = value['refresh_token'];
      final id = value['id_token'];
      final expires = value['expires_in'];
      if (access is! String ||
          access.isEmpty ||
          refresh is! String ||
          refresh.isEmpty ||
          id is! String ||
          id.isEmpty ||
          expires is! int ||
          expires <= 0 ||
          value['token_type'] is! String ||
          (value['token_type'] as String).toLowerCase() != 'bearer') {
        throw const FormatException();
      }
      return NativeOidcTokens(
        accessToken: access,
        refreshToken: refresh,
        idToken: id,
        expiresAt: _clock().add(Duration(seconds: expires)),
      );
    } on AuthFailure {
      rethrow;
    } catch (_) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not sign you in. Check your connection and try again.',
      );
    }
  }
}
