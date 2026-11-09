import 'dart:convert';

import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';
import 'customer_identity_client.dart';
import 'native_oidc_settings.dart';
import 'identity_http_stub.dart'
    if (dart.library.io) 'identity_http_io.dart'
    as platform;

typedef RegistrationRequest = Future<IdentityResponse> Function(
  Uri endpoint,
  Map<String, dynamic> body,
);

class NativeCustomerRegistration {
  NativeCustomerRegistration(this.settings, {RegistrationRequest? request})
    : _request = request ?? platform.postIdentityJson;
  final NativeOidcSettings settings;
  final RegistrationRequest _request;

  Future<void> create(LegacyRegistration registration) async {
    final dateParts = registration.dateOfBirth.split('/');
    final date = dateParts.length == 3
        ? '${dateParts[2]}-${dateParts[0].padLeft(2, '0')}-${dateParts[1].padLeft(2, '0')}'
        : registration.dateOfBirth;
    var phone = registration.phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (phone.startsWith('0')) {
      phone = '+234${phone.substring(1)}';
    } else if (!phone.startsWith('+')) {
      phone = phone.startsWith('234') ? '+$phone' : '+234$phone';
    }
    try {
      final response = await _request(
        settings.apiOrigin.resolve('/api/v1/auth/register'),
        {
          'fullName': registration.fullName.trim(),
          'username': registration.username.trim(),
          'email': registration.email.trim().toLowerCase(),
          'phone': phone,
          'dateOfBirth': date,
          'homeAddress': registration.homeAddress.trim(),
          'password': registration.password,
          'termsAccepted': registration.termsAccepted,
        },
      );
      if (response.statusCode == 201) return;
      if (response.statusCode == 409) {
        throw const AuthFailure(
          AuthErrorCode.accountExists,
          'That email or username is already registered. Sign in or use another.',
        );
      }
      if (response.statusCode == 429) {
        throw const AuthFailure(
          AuthErrorCode.rateLimited,
          'Too many registration attempts. Please wait and try again.',
        );
      }
      if (response.statusCode == 400) {
        final value = jsonDecode(response.body);
        final error = value is Map ? value['error'] : null;
        final message = error is Map ? error['message'] : null;
        throw AuthFailure(
          AuthErrorCode.invalidInput,
          message is String
              ? message
              : message is List && message.isNotEmpty
              ? '${message.first}'
              : 'Please check your registration details.',
        );
      }
      throw const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Registration is temporarily unavailable. Please try again later.',
      );
    } on AuthFailure {
      rethrow;
    } catch (_) {
      throw const AuthFailure(
        AuthErrorCode.network,
        'We could not create your account. Check your connection and try again.',
      );
    }
  }
}
