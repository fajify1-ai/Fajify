import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class FajiAuthException implements Exception {
  const FajiAuthException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Opaque, revocable Better Auth session tokens. No JWT decoding or browser flow.
class FajiAuthClient {
  FajiAuthClient({
    required String baseUrl,
    FlutterSecureStorage? storage,
    http.Client? client,
  })  : base = Uri.parse(baseUrl),
        storage = storage ?? const FlutterSecureStorage(),
        client = client ?? http.Client() {
    if (kIsWeb ||
        base.host.isEmpty ||
        base.userInfo.isNotEmpty ||
        base.hasQuery ||
        base.hasFragment ||
        (base.scheme != 'https' &&
            !(kDebugMode &&
                base.scheme == 'http' &&
                ['localhost', '127.0.0.1', '10.0.2.2'].contains(base.host)))) {
      throw const FajiAuthException(
        'Configure an HTTPS API_BASE_URL for the native app.',
      );
    }
  }
  final Uri base;
  final FlutterSecureStorage storage;
  final http.Client client;
  String get _key => 'faji.better_auth.${base.origin}.session';
  Future<Map<String, dynamic>?> request(
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
  }) async {
    final token = authenticated ? await storage.read(key: _key) : null;
    final headers = {
      'content-type': 'application/json',
      if (token != null) 'authorization': 'Bearer $token',
    };
    final req = http.Request(body == null ? 'GET' : 'POST', base.resolve(path))
      ..headers.addAll(headers)
      ..followRedirects = false;
    if (body != null) req.body = jsonEncode(body);
    final response = await http.Response.fromStream(
      await client.send(req).timeout(const Duration(seconds: 15)),
    );
    if (response.statusCode == 401) {
      if (authenticated) await storage.delete(key: _key);
      throw const FajiAuthException(
        'Your session expired. Please sign in again.',
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw FajiAuthException(
        response.statusCode == 429
            ? 'Too many attempts. Please try later.'
            : response.statusCode == 403
                ? 'This account cannot access this resource.'
                : 'Unable to complete authentication. Check your details and retry.',
      );
    }
    if (response.body.isEmpty || response.body == 'null') return null;
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<void> signIn(String email, String password) async {
    final result = await request(
      '/api/auth/sign-in/email',
      body: {'email': email.trim(), 'password': password},
      authenticated: false,
    );
    await _save(result);
  }

  Future<void> register(String name, String email, String password,
      {Map<String, dynamic> profile = const {}}) async {
    final result = await request(
      '/api/auth/sign-up/email',
      body: {
        ...profile,
        'name': name.trim(),
        'email': email.trim(),
        'password': password
      },
      authenticated: false,
    );
    await _save(result);
  }

  Future<void> _save(Map<String, dynamic>? result) async {
    final token = result?['token'];
    if (token is! String || token.isEmpty)
      throw const FajiAuthException('No authenticated session was returned.');
    await storage.write(key: _key, value: token);
  }

  Future<Map<String, dynamic>?> session() async {
    if (await storage.read(key: _key) == null) return null;
    final result = await request('/api/auth/get-session');
    if (result == null) {
      await storage.delete(key: _key);
      return null;
    }
    return result;
  }

  Future<Map<String, dynamic>> identity() async =>
      (await request('/api/v1/auth/me'))!;
  Future<void> recover(String email) async {
    const target = String.fromEnvironment('FAJI_RECOVERY_URL');
    if (!target.startsWith('https://'))
      throw const FajiAuthException(
        'Configure FAJI_RECOVERY_URL with the trusted web reset page.',
      );
    await request(
      '/api/auth/request-password-reset',
      body: {'email': email.trim(), 'redirectTo': target},
      authenticated: false,
    );
  }

  Future<void> reset(String token, String password) async {
    await request(
      '/api/auth/reset-password',
      body: {'token': token, 'newPassword': password},
      authenticated: false,
    );
  }

  Future<void> signOut() async {
    // Keep the token on network failure so server revocation can be retried.
    await request('/api/auth/sign-out', body: {});
    await storage.delete(key: _key);
  }
}
