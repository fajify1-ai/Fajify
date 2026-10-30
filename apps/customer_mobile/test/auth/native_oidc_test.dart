import 'dart:async';
import 'dart:convert';

import 'package:faji_app/features/auth/data/customer_identity_client.dart';
import 'package:faji_app/features/auth/data/native_account_verifier.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/data/native_oidc_gateway.dart';
import 'package:faji_app/features/auth/data/native_oidc_settings.dart';
import 'package:faji_app/features/auth/data/oidc_auth_boundary.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:faji_app/features/auth/domain/auth_repository.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_test/flutter_test.dart';

final now = DateTime.utc(2026, 10, 26);
Map<String, String> values() => {
  'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': 'true',
  'FAJI_CUSTOMER_OIDC_ISSUER': 'https://identity.example.invalid/realms/faji',
  'FAJI_CUSTOMER_API_ORIGIN': 'https://api.example.invalid',
  'FAJI_CUSTOMER_OIDC_CLIENT_ID': 'faji-customer-mobile',
  'FAJI_CUSTOMER_OIDC_REDIRECT_URI': 'com.faji.customer:/oauth/callback',
  'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI':
      'com.faji.customer:/oauth/callback',
  'FAJI_CUSTOMER_OIDC_SCOPES': 'openid email profile',
};
NativeOidcSettings settings() => NativeOidcSettings.fromValues(values())!;
NativeOidcTokens tokens([String suffix = 'one']) => NativeOidcTokens(
  accessToken: 'access-$suffix',
  refreshToken: 'refresh-$suffix',
  idToken: 'id-$suffix',
  expiresAt: now.add(const Duration(minutes: 5)),
);

class MemoryStore implements SecureSessionStore {
  String? value;
  Object? writeError;
  int writes = 0;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> clear() async {
    value = null;
  }

  @override
  Future<void> write(String serializedSession) async {
    if (writeError != null) throw writeError!;
    writes++;
    value = serializedSession;
  }
}

class Gateway implements NativeOidcGateway {
  NativeOidcTokens result = tokens();
  Object? error;
  Object? logoutError;
  Completer<NativeOidcTokens>? pending;
  int refreshes = 0, logouts = 0;
  NativeOidcTokens? previous;
  CustomerAuthJourney? journey;
  @override
  Future<NativeOidcTokens> authorize({
    CustomerAuthJourney journey = CustomerAuthJourney.signIn,
  }) async {
    this.journey = journey;
    if (error != null) throw error!;
    return pending?.future ?? result;
  }

  @override
  Future<NativeOidcTokens> refresh(NativeOidcTokens previous) {
    refreshes++;
    this.previous = previous;
    return authorize();
  }

  @override
  Future<void> endSession(NativeOidcTokens tokens) async {
    logouts++;
    if (logoutError != null) throw logoutError!;
  }
}

class Accounts implements NativeAccountVerifier {
  String subject = 'subject';
  Object? error;
  int checks = 0;
  @override
  Future<String> verify(String accessToken) async {
    checks++;
    if (error != null) throw error!;
    return subject;
  }
}

class Sdk extends FlutterAppAuth {
  Map<String, dynamic>? actionParameters;
  AuthorizationTokenRequest? authorization;
  TokenRequest? refreshRequest;
  EndSessionRequest? logout;
  @override
  Future<AuthorizationTokenResponse> authorizeAndExchangeCode(
    AuthorizationTokenRequest request,
  ) async {
    authorization = request;
    return AuthorizationTokenResponse(
      'access',
      'refresh',
      tokens().expiresAt,
      'id',
      'Bearer',
      settings().scopes,
      actionParameters,
      null,
    );
  }

  @override
  Future<TokenResponse> token(TokenRequest request) async {
    refreshRequest = request;
    return TokenResponse(
      'new-access',
      null,
      tokens().expiresAt,
      null,
      'Bearer',
      null,
      null,
    );
  }

  @override
  Future<EndSessionResponse> endSession(EndSessionRequest request) async {
    logout = request;
    return EndSessionResponse(null);
  }
}

void main() {
  late MemoryStore store;
  late Gateway gateway;
  late Accounts accounts;
  NativeKeycloakRepository repository() => NativeKeycloakRepository(
    settings: settings(),
    gateway: gateway,
    store: store,
    accounts: accounts,
    clock: () => now,
  );
  setUp(() {
    store = MemoryStore();
    gateway = Gateway();
    accounts = Accounts();
  });

  test(
    'configuration is disabled by default and rejects partial/insecure inputs',
    () {
      expect(NativeOidcSettings.fromValues({}), isNull);
      expect(
        NativeOidcSettings.fromValues({
          ...values(),
          'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': 'false',
        }),
        isNull,
      );
      for (final key in values().keys) {
        expect(
          NativeOidcSettings.fromValues({...values()}..remove(key)),
          isNull,
        );
      }
      for (final change in [
        {
          'FAJI_CUSTOMER_OIDC_ISSUER':
              'http://identity.example.invalid/realms/faji',
        },
        {'FAJI_CUSTOMER_API_ORIGIN': 'https://api.example.invalid/path'},
        {'FAJI_CUSTOMER_OIDC_CLIENT_ID': 'other'},
        {'FAJI_CUSTOMER_OIDC_REDIRECT_URI': 'com.other:/callback'},
        {
          'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI':
              'https://other.example.invalid',
        },
        {'FAJI_CUSTOMER_OIDC_SCOPES': 'openid'},
      ]) {
        expect(NativeOidcSettings.fromValues({...values(), ...change}), isNull);
      }
      expect(settings().clientId, 'faji-customer-mobile');
    },
  );

  test(
    'AppAuth owns code exchange and refresh with no native secret',
    () async {
      final sdk = Sdk();
      final adapter = AppAuthOidcGateway(settings(), sdk: sdk);
      final initial = await adapter.authorize();
      expect(sdk.authorization!.clientSecret, isNull);
      expect(sdk.authorization!.issuer, settings().issuer.toString());
      expect(sdk.authorization!.allowInsecureConnections, isFalse);
      expect(sdk.authorization!.scopes, settings().scopes);
      final refreshed = await adapter.refresh(initial);
      expect(sdk.refreshRequest!.refreshToken, 'refresh');
      expect(refreshed.refreshToken, 'refresh');
      expect(refreshed.idToken, 'id');
      expect(refreshed.toString(), 'NativeOidcTokens(redacted)');
      await adapter.endSession(refreshed);
      expect(
        sdk.logout!.postLogoutRedirectUrl,
        settings().logoutRedirectUri.toString(),
      );
    },
  );

  test('SDK journeys preserve issuer/client/scopes and use supported provider hints', () async {
    final sdk = Sdk();
    final adapter = AppAuthOidcGateway(settings(), sdk: sdk);
    await adapter.authorize(journey: CustomerAuthJourney.registration);
    expect(sdk.authorization!.promptValues, ['create']);
    expect(sdk.authorization!.additionalParameters, isNull);
    await adapter.authorize(journey: CustomerAuthJourney.recovery);
    expect(sdk.authorization!.promptValues, ['login']);
    expect(sdk.authorization!.additionalParameters, isNull);
    await adapter.authorize(journey: CustomerAuthJourney.verifyEmail);
    expect(sdk.authorization!.additionalParameters, {
      'kc_action': 'VERIFY_EMAIL',
    });
    expect(sdk.authorization!.clientId, settings().clientId);
    expect(sdk.authorization!.issuer, settings().issuer.toString());
    expect(sdk.authorization!.scopes, settings().scopes);
    expect(sdk.authorization!.clientSecret, isNull);
  });

  test('cancelled provider verification cannot persist a successful SDK token response', () async {
    final sdk = Sdk()..actionParameters = {'kc_action_status': 'cancelled'};
    final repo = NativeKeycloakRepository(
      settings: settings(),
      gateway: AppAuthOidcGateway(settings(), sdk: sdk),
      store: store,
      accounts: accounts,
      clock: () => now,
    );
    await expectLater(repo.verifyEmailInBrowser(), throwsA(isA<AuthFailure>()));
    expect(store.value, isNull);
    expect(accounts.checks, 0);
  });

  test('authorization verifies account and stores credentials without access token', () async {
    final session = await repository().authorize();
    expect(session.subject, 'subject');
    expect(session.emailVerified, isTrue);
    expect(accounts.checks, 1);
    expect(session.provider, IdentityProvider.keycloak);
    expect(store.value, contains('refresh-one'));
    expect(store.value, isNot(contains('access-one')));
  });

  test(
    'restoration always refreshes and rechecks account before access',
    () async {
      await repository().authorize();
      gateway.result = tokens('two');
      final restored = await repository().restoreSession();
      expect(restored!.subject, 'subject');
      expect(gateway.refreshes, 1);
      expect(gateway.previous!.refreshToken, 'refresh-one');
      expect(store.value, contains('refresh-two'));
      expect(accounts.checks, 2);
    },
  );

  test(
    'empty store does not invoke provider; malformed and changed binding deny',
    () async {
      expect(await repository().restoreSession(), isNull);
      expect(gateway.refreshes, 0);
      store.value = '{}';
      await expectLater(
        repository().restoreSession(),
        throwsA(isA<AuthFailure>()),
      );
      expect(store.value, isNull);
      await repository().authorize();
      final value = jsonDecode(store.value!) as Map<String, dynamic>;
      value['binding'] = ['other-issuer'];
      store.value = jsonEncode(value);
      await expectLater(
        repository().restoreSession(),
        throwsA(isA<AuthFailure>()),
      );
      expect(store.value, isNull);
      expect(gateway.refreshes, 0);
    },
  );

  test('refresh coalesces and rejects subject switching', () async {
    final repo = repository();
    await repo.authorize();
    gateway.pending = Completer();
    final first = repo.refreshSession();
    final second = repo.refreshSession();
    expect(identical(first, second), isTrue);
    await Future<void>.delayed(Duration.zero);
    gateway.pending!.complete(tokens('two'));
    await first;
    expect(gateway.refreshes, 1);
    gateway.pending = null;
    accounts.subject = 'other';
    await expectLater(repo.refreshSession(), throwsA(isA<AuthFailure>()));
    expect(store.value, isNull);
  });

  test(
    'expired, cancelled, denied and failed sessions never persist',
    () async {
      gateway.result = NativeOidcTokens(
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresAt: now,
      );
      await expectLater(repository().authorize(), throwsA(isA<AuthFailure>()));
      gateway.result = tokens();
      for (final error in [
        const NativeAuthorizationCancelled(),
        StateError('private-token'),
      ]) {
        gateway.error = error;
        await expectLater(
          repository().authorize(),
          throwsA(
            isA<AuthFailure>().having(
              (e) => e.message,
              'redacted',
              isNot(contains('private-token')),
            ),
          ),
        );
        expect(store.value, isNull);
      }
      gateway.error = null;
      accounts.error = const AuthFailure(
        AuthErrorCode.disabled,
        'Account unavailable',
      );
      await expectLater(repository().authorize(), throwsA(isA<AuthFailure>()));
      expect(store.value, isNull);
    },
  );

  test('storage failure refuses access without plaintext fallback', () async {
    store.writeError = StateError('native private diagnostic');
    await expectLater(repository().authorize(), throwsA(isA<AuthFailure>()));
    expect(store.value, isNull);
  });

  test(
    'logout clears before browser failure and can use stored restart hint',
    () async {
      await repository().authorize();
      gateway.logoutError = StateError('private provider error');
      await expectLater(repository().signOut(), throwsA(isA<AuthFailure>()));
      expect(store.value, isNull);
      expect(gateway.logouts, 1);
    },
  );

  test(
    'logout defeats an in-flight refresh and clears its late result',
    () async {
      final repo = repository();
      await repo.authorize();
      gateway.pending = Completer();
      final refresh = repo.refreshSession();
      final expectation = expectLater(refresh, throwsA(isA<AuthFailure>()));
      await Future<void>.delayed(Duration.zero);
      final logout = repo.signOut();
      await Future<void>.delayed(Duration.zero);
      expect(
        store.value,
        isNull,
        reason: 'Local cleanup must not wait for provider refresh',
      );
      gateway.pending!.complete(tokens('late'));
      await expectation;
      await logout;
      expect(store.value, isNull);
      expect(store.writes, 1);
      expect(gateway.logouts, 1);
    },
  );

  test(
    'raw callback never authorizes; browser journeys verify before access',
    () async {
      final repo = repository();
      await expectLater(
        repo.completeAuthorization(
          Uri.parse('com.faji.customer:/oauth/callback?code=forged'),
        ),
        throwsA(isA<AuthFailure>()),
      );
      expect(store.value, isNull);
      await repo.beginRegistration();
      expect(gateway.journey, CustomerAuthJourney.registration);
      await repo.beginRecovery();
      expect(gateway.journey, CustomerAuthJourney.recovery);
      await repo.verifyEmailInBrowser();
      expect(gateway.journey, CustomerAuthJourney.verifyEmail);
      expect(accounts.checks, 3);
    },
  );

  test('UserInfo verifies email and backend binds customer subject', () async {
    final calls = <String>[];
    final identity = CustomerIdentityClient(
      apiOrigin: settings().apiOrigin,
      request: (uri, token) async {
        calls.add(uri.path);
        return (
          statusCode: 200,
          body: '{"subject":"subject","roles":["customer"]}',
        );
      },
    );
    final verifier = OidcAccountVerifier(
      settings(),
      identity: identity,
      request: (uri, token) async {
        calls.add(uri.path);
        if (token == null) {
          return (
            statusCode: 200,
            body: jsonEncode({
              'issuer': settings().issuer.toString(),
              'userinfo_endpoint': '${settings().issuer}/userinfo-fixture',
            }),
          );
        }
        return (
          statusCode: 200,
          body: '{"sub":"subject","email_verified":true}',
        );
      },
    );
    expect(await verifier.verify('access-fixture'), 'subject');
    expect(calls.last, '/api/v1/auth/me');
    expect(calls, hasLength(3));
  });

  test(
    'UserInfo refuses substituted discovery, cross-origin and unverified email',
    () async {
      for (final mode in ['issuer', 'endpoint', 'email', 'malformed']) {
        final verifier = OidcAccountVerifier(
          settings(),
          request: (uri, token) async {
            if (token == null) {
              return (
                statusCode: 200,
                body: jsonEncode({
                  'issuer': mode == 'issuer'
                      ? 'other'
                      : settings().issuer.toString(),
                  'userinfo_endpoint': mode == 'endpoint'
                      ? 'https://other.example.invalid/userinfo'
                      : '${settings().issuer}/userinfo-fixture',
                }),
              );
            }
            return (
              statusCode: 200,
              body: mode == 'malformed'
                  ? '[]'
                  : '{"sub":"subject","email_verified":false}',
            );
          },
        );
        await expectLater(
          verifier.verify('access-fixture'),
          throwsA(isA<AuthFailure>()),
        );
      }
    },
  );
}
