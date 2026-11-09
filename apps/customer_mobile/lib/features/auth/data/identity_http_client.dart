import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../domain/auth_session.dart';

/// Android's app trust configuration does not configure dart:io's trust roots.
/// Add only the local developer CA, only in debug, only for localhost services.
/// Chain verification and hostname matching remain HttpClient's responsibility.
bool usesLocalDevelopmentTrust(
  Uri endpoint, {
  required bool debug,
  required bool android,
}) =>
    debug &&
    android &&
    endpoint.scheme == 'https' &&
    endpoint.host == 'localhost' &&
    const [8443, 3443].contains(endpoint.port);

Future<HttpClient> createIdentityHttpClient(Uri endpoint) async {
  SecurityContext? context;
  if (usesLocalDevelopmentTrust(
    endpoint,
    debug: kDebugMode,
    android: Platform.isAndroid,
  )) {
    final certificate = await const MethodChannel('faji.customer/debug-trust')
        .invokeMethod<Uint8List>('getLocalCa');
    if (certificate == null || certificate.isEmpty) {
      throw const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Local HTTPS trust is missing. Copy the development root CA to android/app/src/debug/res/raw/fajify_root_ca.crt and rebuild.',
      );
    }
    context = SecurityContext(withTrustedRoots: true)
      ..setTrustedCertificatesBytes(certificate);
  }
  return HttpClient(context: context)
    ..connectionTimeout = const Duration(seconds: 10);
}
