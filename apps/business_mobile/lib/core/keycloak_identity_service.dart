import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'config.dart';
import 'services.dart';

class IdentityFailure implements Exception {
  const IdentityFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class IdentityCancelled implements Exception {
  const IdentityCancelled();
}

class KeycloakIdentityService implements IdentityService {
  KeycloakIdentityService(
    this.config, {
    FlutterAppAuth? appAuth,
    FlutterSecureStorage? storage,
    http.Client? client,
  }) : _appAuth = appAuth ?? const FlutterAppAuth(),
       _storage = storage ?? const FlutterSecureStorage(),
       _client = client ?? http.Client();

  static const _accessTokenKey = 'business.access_token';
  static const _refreshTokenKey = 'business.refresh_token';
  static const _idTokenKey = 'business.id_token';
  static const _expiryKey = 'business.access_token_expiry';
  static const _scopes = ['openid', 'profile', 'email'];

  final BusinessConfig config;
  final FlutterAppAuth _appAuth;
  final FlutterSecureStorage _storage;
  final http.Client _client;

  String get _issuer => config.oidcIssuer.replaceFirst(RegExp(r'/+$'), '');

  String get _discoveryUrl => '$_issuer/.well-known/openid-configuration';

  Uri _api(String path) =>
      Uri.parse(config.apiBaseUrl).resolve('/api/v1/$path');

  @override
  Future<BusinessIdentity?> restoreSession() async {
    if (kIsWeb) {
      throw const IdentityFailure(
        'Keycloak sign-in is currently supported on Android and iOS only.',
      );
    }
    final accessToken = await _accessToken();
    if (accessToken == null) return null;
    return _loadIdentity(accessToken, restored: true);
  }

  @override
  Future<BusinessIdentity?> validateSession() async {
    if (kIsWeb) {
      throw const IdentityFailure(
        'Keycloak sign-in is currently supported on Android and iOS only.',
      );
    }
    final accessToken = await _accessToken();
    if (accessToken == null) return null;
    return _loadIdentity(accessToken, restored: true);
  }

  Future<Object?> merchantRequest(String method, String path, [Map<String, Object>? body]) async {
    final token = await _accessToken();
    if (token == null) throw const IdentityFailure('Sign in again to continue.');
    final request = http.Request(method, _api(path))
      ..followRedirects = false
      ..headers['authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    final response = await _send(_client.send(request).then(http.Response.fromStream));
    if (response.statusCode == 403) {
      throw const IdentityFailure('Your account cannot perform this operation.');
    }
    if (response.statusCode == 409) {
      throw const IdentityFailure('This record changed. Refresh before trying again.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const IdentityFailure('The request could not be completed.');
    }
    return jsonDecode(response.body);
  }

  Future<BusinessIdentity> signInWithPassword(String identifier, String password) async {
    final request = http.Request(
      'POST',
      Uri.parse('$_issuer/protocol/openid-connect/token'),
    )..followRedirects = false;
    request.bodyFields = {
      'grant_type': 'password',
      'client_id': config.oidcClientId,
      'username': identifier,
      'password': password,
      'scope': _scopes.join(' '),
    };
    final response = await _send(
      _client.send(request).then(http.Response.fromStream),
    );
    if (response.statusCode != 200) {
      throw const IdentityFailure('Sign-in failed. Check your details and try again.');
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final accessToken = data['access_token'];
    final expiresIn = data['expires_in'];
    if (accessToken is! String || accessToken.isEmpty ||
        expiresIn is! int || expiresIn <= 0) {
      throw const IdentityFailure('Faji returned an invalid sign-in response.');
    }
    final identity = await _loadIdentity(accessToken);
    if (identity == null) {
      throw const IdentityFailure('Your sign-in could not be verified.');
    }
    await _saveTokens(
      TokenResponse(
        accessToken,
        data['refresh_token'] as String?,
        DateTime.now().add(Duration(seconds: expiresIn)),
        data['id_token'] as String?,
        'Bearer',
        _scopes,
        null,
      ),
      preserveRefreshToken: false,
    );
    return identity;
  }

  Future<void> registerBusiness(Map<String, Object> fields) async {
    final request = http.Request('POST', _api('auth/register-business'))
      ..followRedirects = false
      ..headers['content-type'] = 'application/json'
      ..body = jsonEncode(fields);
    final response = await _send(
      _client.send(request).then(http.Response.fromStream),
    );
    if (response.statusCode == 409) {
      throw const IdentityFailure('That email or username already exists. Sign in to continue.');
    }
    if (response.statusCode != 201) {
      throw const IdentityFailure('Registration could not be completed. Check your details and try again.');
    }
  }

  @override
  Future<BusinessIdentity> signIn() async {
    if (kIsWeb) {
      throw const IdentityFailure(
        'Keycloak sign-in is currently supported on Android and iOS only.',
      );
    }
    try {
      final response = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          config.oidcClientId,
          config.oidcRedirectUri,
          issuer: _issuer,
          discoveryUrl: _discoveryUrl,
          scopes: _scopes,
          promptValues: const ['login'],
          allowInsecureConnections: _allowsLocalHttp,
        ),
      );
      await _saveTokens(response, preserveRefreshToken: false);
      final accessToken = response.accessToken;
      if (accessToken == null || accessToken.isEmpty) {
        await _clearTokens();
        throw const IdentityFailure(
          'Keycloak did not return a usable access token.',
        );
      }
      final identity = await _loadIdentity(accessToken);
      if (identity == null) {
        throw const IdentityFailure(
          'Your sign-in could not be verified. Please try again.',
        );
      }
      return identity;
    } on FlutterAppAuthUserCancelledException {
      throw const IdentityCancelled();
    } on FlutterAppAuthPlatformException {
      throw const IdentityFailure(
        'Keycloak sign-in failed. Check your connection and try again.',
      );
    }
  }

  @override
  Future<void> signOut() async {
    String? idToken;
    IdentityFailure? failure;
    try {
      idToken = await _storage.read(key: _idTokenKey);
    } on Exception {
      failure = const IdentityFailure(
        'Local credentials could not be read for sign-out.',
      );
    }
    try {
      final accessToken = await _accessToken();
      if (accessToken != null) {
        final response = await _send(
          _client.post(
            _api('auth/sessions/revoke-current'),
            headers: {'Authorization': 'Bearer $accessToken'},
          ),
        );
        if (response.statusCode < 200 || response.statusCode >= 300) {
          failure = const IdentityFailure(
            'The server session could not be revoked. Local credentials were cleared.',
          );
        }
      }
    } on Exception {
      failure ??= const IdentityFailure(
        'The server session could not be revoked. Local credentials were cleared.',
      );
    }
    try {
      if (idToken != null && idToken.isNotEmpty) {
        await _appAuth.endSession(
          EndSessionRequest(
            idTokenHint: idToken,
            postLogoutRedirectUrl: config.oidcRedirectUri,
            issuer: _issuer,
            discoveryUrl: _discoveryUrl,
            allowInsecureConnections: _allowsLocalHttp,
          ),
        );
      }
    } on Exception {
      failure ??= const IdentityFailure(
        'Keycloak sign-out could not be confirmed. Local credentials were cleared.',
      );
    } finally {
      await _clearTokens();
    }
    if (failure != null) throw failure;
  }

  bool get _allowsLocalHttp =>
      Uri.parse(config.oidcIssuer).scheme == 'http' ||
      Uri.parse(config.apiBaseUrl).scheme == 'http';

  Future<BusinessIdentity?> _loadIdentity(
    String accessToken, {
    bool restored = false,
  }) async {
    final response = await _send(
      _client.get(
        _api('auth/me'),
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
    if (response.statusCode == 401) {
      await _clearTokens();
      return null;
    }
    if (response.statusCode == 403) {
      await _clearTokens();
      throw const IdentityFailure(
        'This Faji account is suspended or restricted. Contact support.',
      );
    }
    if (response.statusCode != 200) {
      throw IdentityFailure(
        restored
            ? 'Your saved session could not be verified. Please try again.'
            : 'Your sign-in could not be verified. Please try again.',
      );
    }
    final Object? payload;
    try {
      payload = jsonDecode(response.body);
    } on FormatException {
      throw const IdentityFailure(
        'The identity service returned an invalid response.',
      );
    }
    if (payload is! Map<String, dynamic> ||
        payload['subject'] is! String ||
        (payload['subject'] as String).isEmpty ||
        payload['roles'] is! List ||
        (payload['roles'] as List).any((role) => role is! String)) {
      throw const IdentityFailure(
        'The identity service returned an invalid response.',
      );
    }
    final memberships = payload['memberships'];
    final status = payload['businessApplicationStatus'];
    final membershipRoles = <String, Set<String>>{};
    if (memberships is List) {
      for (final row in memberships) {
        if (row is Map && row['resourceType'] == 'business' &&
            row['status'] == 'approved' && row['resourceId'] is String &&
            row['role'] is String) {
          membershipRoles.putIfAbsent(row['resourceId'] as String, () => {})
              .add(row['role'] as String);
        }
      }
    }
    return BusinessIdentity(
      membershipRoles: membershipRoles,
      applicationStatus: status is String ? status : null,
      businessMemberships: {
        if (memberships is List)
          for (final membership in memberships)
            if (membership is Map &&
                membership['resourceType'] == 'business' &&
                membership['status'] == 'approved' &&
                const {'owner', 'manager', 'staff'}.contains(membership['role']) &&
                membership['resourceId'] is String)
              membership['resourceId'] as String,
      },
      subject: payload['subject'] as String,
      roles: (payload['roles'] as List).cast<String>().toSet(),
    );
  }

  Future<String?> _accessToken() async {
    final accessToken = await _storage.read(key: _accessTokenKey);
    final expiryValue = await _storage.read(key: _expiryKey);
    final expiry = expiryValue == null ? null : DateTime.tryParse(expiryValue);
    if (accessToken != null &&
        accessToken.isNotEmpty &&
        expiry != null &&
        DateTime.now().toUtc().isBefore(
          expiry.toUtc().subtract(const Duration(seconds: 30)),
        )) {
      return accessToken;
    }

    final refreshToken = await _storage.read(key: _refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      await _clearTokens();
      return null;
    }
    try {
      final response = await _appAuth.token(
        TokenRequest(
          config.oidcClientId,
          config.oidcRedirectUri,
          issuer: _issuer,
          discoveryUrl: _discoveryUrl,
          refreshToken: refreshToken,
          scopes: _scopes,
          allowInsecureConnections: _allowsLocalHttp,
        ),
      );
      await _saveTokens(response, preserveRefreshToken: true);
      final renewed = response.accessToken;
      if (renewed == null || renewed.isEmpty) {
        await _clearTokens();
        throw const IdentityFailure(
          'Session refresh did not return an access token. Please sign in again.',
        );
      }
      return renewed;
    } on Exception {
      await _clearTokens();
      throw const IdentityFailure(
        'Your session expired and could not be refreshed. Please sign in again.',
      );
    }
  }

  Future<void> _saveTokens(
    TokenResponse response, {
    required bool preserveRefreshToken,
  }) async {
    final accessToken = response.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      await _clearTokens();
      throw const IdentityFailure(
        'Keycloak did not return a usable access token.',
      );
    }
    final expiry = response.accessTokenExpirationDateTime;
    if (expiry == null) {
      await _clearTokens();
      throw const IdentityFailure(
        'Keycloak did not return an access-token expiry.',
      );
    }
    try {
      await _storage.write(key: _accessTokenKey, value: accessToken);
      await _storage.write(
        key: _expiryKey,
        value: expiry.toUtc().toIso8601String(),
      );
      if (response.refreshToken != null) {
        await _storage.write(
          key: _refreshTokenKey,
          value: response.refreshToken,
        );
      } else if (!preserveRefreshToken) {
        await _storage.delete(key: _refreshTokenKey);
      }
      if (response.idToken != null) {
        await _storage.write(key: _idTokenKey, value: response.idToken);
      }
    } on Exception {
      await _clearTokens();
      throw const IdentityFailure(
        'Secure token storage failed. Sign in again.',
      );
    }
  }

  Future<http.Response> _send(Future<http.Response> request) async {
    try {
      return await request.timeout(const Duration(seconds: 15));
    } on http.ClientException {
      throw const IdentityFailure(
        'Could not reach the Faji identity service. Check your connection.',
      );
    } on TimeoutException {
      throw const IdentityFailure(
        'The Faji identity service did not respond in time.',
      );
    }
  }

  Future<void> _clearTokens() async {
    IdentityFailure? failure;
    for (final key in [
      _accessTokenKey,
      _refreshTokenKey,
      _idTokenKey,
      _expiryKey,
    ]) {
      try {
        await _storage.delete(key: key);
      } on Exception {
        failure ??= const IdentityFailure(
          'Secure credentials could not be fully cleared from this device.',
        );
      }
    }
    if (failure != null) throw failure;
  }
}
