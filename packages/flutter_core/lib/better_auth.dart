import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class FajiAuthException implements Exception {
  const FajiAuthException(this.message, {this.mfaRequired = false});
  final bool mfaRequired;
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
  int _generation = 0;
  bool challengePending = false;
  final Map<String, String> _challengeCookies = {};
  final Uri base;
  final FlutterSecureStorage storage;
  final http.Client client;
  String get _key => 'faji.better_auth.${base.origin}.session';
  Future<Map<String, dynamic>?> request(
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
  }) async {
    final requestGeneration = _generation;
    final token = authenticated ? await storage.read(key: _key) : null;
    final headers = {
      'content-type': 'application/json',
      if (token != null) 'authorization': 'Bearer $token',
      if (_challengeCookies.isNotEmpty &&
          !authenticated &&
          path.startsWith('/api/auth/two-factor/'))
        'cookie': _challengeCookies.entries
            .map((e) => '${e.key}=${e.value}')
            .join('; '),
    };
    final req = http.Request(body == null ? 'GET' : 'POST', base.resolve(path))
      ..headers.addAll(headers)
      ..followRedirects = false;
    if (body != null) req.body = jsonEncode(body);
    final response =
        await (() async => http.Response.fromStream(await client.send(req)))()
            .timeout(const Duration(seconds: 15));
    final cookies = response.headers['set-cookie'];
    if (cookies != null && requestGeneration == _generation) {
      for (final cookie in cookies.split(RegExp(r',(?=[^;,]+=)'))) {
        final pair = cookie.split(';').first;
        final i = pair.indexOf('=');
        if (i > 0) {
          final key = pair.substring(0, i).trim();
          if (key.contains('better-auth.') && !key.contains('session_token'))
            _challengeCookies[key] = pair.substring(i + 1);
        }
      }
    }
    final rotated = response.headers['set-auth-token'];
    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        rotated != null &&
        authenticated &&
        token != null &&
        requestGeneration == _generation &&
        await storage.read(key: _key) == token) {
      await storage.write(key: _key, value: rotated);
    }
    if (response.statusCode == 401) {
      if (authenticated && await storage.read(key: _key) == token)
        await storage.delete(key: _key);
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
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (rotated != null) data['token'] = rotated;
    return data;
  }

  Future<void> signIn(String email, String password) async {
    final epoch = ++_generation;
    challengePending = false;
    _challengeCookies.clear();
    await storage.delete(key: _key);
    final result = await request(
      '/api/auth/sign-in/email',
      body: {'email': email.trim(), 'password': password},
      authenticated: false,
    );
    if (epoch != _generation) return;
    if (result?['twoFactorRedirect'] == true) {
      challengePending = true;
      throw const FajiAuthException(
          'Enter your authenticator or recovery code.',
          mfaRequired: true);
    }
    if (epoch == _generation) await _save(result);
  }

  Future<void> register(String name, String email, String password,
      {Map<String, dynamic> profile = const {}}) async {
    final epoch = ++_generation;
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
    if (epoch == _generation) await _save(result);
  }

  Future<void> _save(Map<String, dynamic>? result) async {
    final token = result?['token'];
    if (token is! String || token.isEmpty)
      throw const FajiAuthException('No authenticated session was returned.');
    await storage.write(key: _key, value: token);
    challengePending = false;
    _challengeCookies.clear();
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

  Future<void> recoverPhone(String phone) async {
    await request('/api/auth/phone-number/request-password-reset',
        body: {'phoneNumber': phone}, authenticated: false);
  }

  Future<void> resetPhone(String phone, String code, String password) async {
    await request('/api/auth/phone-number/reset-password',
        body: {'phoneNumber': phone, 'otp': code, 'newPassword': password},
        authenticated: false);
  }

  void cancelChallenge() {
    ++_generation;
    challengePending = false;
    _challengeCookies.clear();
  }

  Future<void> verifyMfa(String code, {bool backup = false}) async {
    final epoch = _generation;
    final result = await request(
        '/api/auth/two-factor/${backup ? 'verify-backup-code' : 'verify-totp'}',
        body: {'code': code, 'trustDevice': false},
        authenticated: false);
    if (epoch == _generation) await _save(result);
  }

  Future<void> claim(String token, String password) async {
    await request('/api/auth/faji/claim',
        body: {'token': token, 'password': password}, authenticated: false);
  }

  Future<void> sendPhoneOtp(String phone) async {
    await request('/api/auth/phone-number/send-otp',
        body: {'phoneNumber': phone}, authenticated: false);
  }

  Future<void> phoneLogin(String phone, String code) async {
    final epoch = ++_generation;
    await storage.delete(key: _key);
    final result = await request('/api/auth/phone-number/verify',
        body: {'phoneNumber': phone, 'code': code}, authenticated: false);
    if (epoch == _generation) await _save(result);
  }

  Future<Map<String, dynamic>?> security(String action,
      {required String password,
      String code = '',
      String phone = '',
      String backupCode = ''}) {
    switch (action) {
      case 'step-up':
        return request('/api/auth/faji/step-up', body: {
          'password': password,
          if (code.isNotEmpty) 'code': code,
          if (backupCode.isNotEmpty) 'backupCode': backupCode
        });
      case 'enable':
        return request('/api/auth/two-factor/enable',
            body: {'password': password});
      case 'verify':
        return request('/api/auth/two-factor/verify-totp',
            body: {'code': code, 'trustDevice': false});
      case 'disable':
        return request('/api/auth/two-factor/disable',
            body: {'password': password});
      case 'codes':
        return request('/api/auth/two-factor/generate-backup-codes',
            body: {'password': password});
      case 'verify-phone':
        return request('/api/auth/phone-number/verify', body: {
          'phoneNumber': phone,
          'code': code,
          'updatePhoneNumber': true,
          'disableSession': true
        });
      default:
        return request('/api/auth/faji/unlink-phone', body: {});
    }
  }

  Future<void> signOut() async {
    ++_generation;
    challengePending = false;
    _challengeCookies.clear();
    // Keep the token on network failure so server revocation can be retried.
    await request('/api/auth/sign-out', body: {});
    await storage.delete(key: _key);
  }
}
