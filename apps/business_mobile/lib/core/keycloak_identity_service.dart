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
    return BusinessIdentity(
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
