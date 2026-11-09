import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../domain/auth_session.dart';
import 'identity_http_client.dart';

/// Native HTTPS transport; deliberately does not follow bearer redirects.
Future<({int statusCode, String body})> requestIdentity(
  Uri endpoint,
  String accessToken,
) async {
  return requestOidcJson(endpoint, accessToken);
}

/// Shared bounded transport for discovery, UserInfo and active-account checks.
Future<({int statusCode, String body})> requestOidcJson(
  Uri endpoint,
  String? accessToken,
) async {
  if (endpoint.scheme != 'https' ||
      endpoint.userInfo.isNotEmpty ||
      endpoint.hasFragment) {
    throw const FormatException();
  }
  final client = await createIdentityHttpClient(endpoint);
  try {
    return await (() async {
      final request = await client.getUrl(endpoint);
      request.followRedirects = false;
      if (accessToken != null) {
        request.headers.set(
          HttpHeaders.authorizationHeader,
          'Bearer $accessToken',
        );
      }
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
      final response = await request.close();
      if (response.statusCode != 200) {
        return (statusCode: response.statusCode, body: '');
      }
      if (response.statusCode == 429 || response.statusCode >= 500) {
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
  } on HandshakeException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The secure connection could not be verified. Check the server certificate and device trust settings.',
    );
  } on SocketException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'Cannot reach the account server. Check the connection and USB port forwarding.',
    );
  } on TimeoutException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The account server did not respond. Please try again.',
    );
  } finally {
    client.close(force: true);
  }
}

/// Passwords are sent only to the configured HTTPS issuer, never redirected.
Future<({int statusCode, String body})> postOidcForm(
  Uri endpoint,
  Map<String, String> fields,
) async {
  if (endpoint.scheme != 'https' ||
      endpoint.userInfo.isNotEmpty ||
      endpoint.hasFragment) {
    throw const FormatException();
  }
  final client = await createIdentityHttpClient(endpoint);
  try {
    return await (() async {
      final request = await client.postUrl(endpoint);
      request.followRedirects = false;
      request.headers.contentType = ContentType(
        'application',
        'x-www-form-urlencoded',
        charset: 'utf-8',
      );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
      request.write(Uri(queryParameters: fields).query);
      final response = await request.close();
      if (response.headers.contentType?.mimeType != 'application/json') {
        throw const FormatException();
      }
      final bytes = <int>[];
      await for (final chunk in response) {
        if (bytes.length + chunk.length > 65536) throw const FormatException();
        bytes.addAll(chunk);
      }
      return (statusCode: response.statusCode, body: utf8.decode(bytes));
    })().timeout(const Duration(seconds: 10));
  } on HandshakeException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The secure connection could not be verified. Check the server certificate and device trust settings.',
    );
  } on SocketException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'Cannot reach the account server. Check the connection and USB port forwarding.',
    );
  } on TimeoutException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The account server did not respond. Please try again.',
    );
  } finally {
    client.close(force: true);
  }
}

/// Native registration sends credentials only to the configured HTTPS API.
Future<({int statusCode, String body})> postIdentityJson(
  Uri endpoint,
  Map<String, dynamic> fields,
) async {
  if (endpoint.scheme != 'https' ||
      endpoint.userInfo.isNotEmpty ||
      endpoint.hasFragment) {
    throw const FormatException();
  }
  final client = await createIdentityHttpClient(endpoint);
  try {
    return await (() async {
      final request = await client.postUrl(endpoint);
      request.followRedirects = false;
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
      request.write(jsonEncode(fields));
      final response = await request.close();
      if (response.headers.contentType?.mimeType != 'application/json') {
        throw const FormatException();
      }
      final bytes = <int>[];
      await for (final chunk in response) {
        if (bytes.length + chunk.length > 65536) throw const FormatException();
        bytes.addAll(chunk);
      }
      return (statusCode: response.statusCode, body: utf8.decode(bytes));
    })().timeout(const Duration(seconds: 60));
  } on HandshakeException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The secure connection could not be verified. Check the server certificate and device trust settings.',
    );
  } on SocketException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'Cannot reach the account server. Check the connection and USB port forwarding.',
    );
  } on TimeoutException {
    throw const AuthFailure(
      AuthErrorCode.network,
      'The account server did not respond. Please try again.',
    );
  } finally {
    client.close(force: true);
  }
}
