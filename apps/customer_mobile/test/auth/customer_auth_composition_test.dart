import 'package:faji_app/features/auth/application/auth_controller.dart';
import 'package:faji_app/features/auth/data/customer_auth_composition.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/data/native_oidc_settings.dart';
import 'package:faji_app/features/auth/domain/auth_session.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, String> developmentValues() => {
  'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': 'true',
  'FAJI_CUSTOMER_OIDC_ISSUER': 'https://localhost:8443/realms/fajify',
  'FAJI_CUSTOMER_API_ORIGIN': 'https://localhost:3443',
  'FAJI_CUSTOMER_OIDC_CLIENT_ID': 'faji-customer-mobile',
  'FAJI_CUSTOMER_OIDC_REDIRECT_URI': 'com.faji.customer:/oauth/callback',
  'FAJI_CUSTOMER_OIDC_POST_LOGOUT_REDIRECT_URI':
      'com.faji.customer:/oauth/callback',
  'FAJI_CUSTOMER_OIDC_SCOPES': 'openid email',
};

void main() {
  test(
    'the actual development scope string selects the native Android repository',
    () {
      final settings = NativeOidcSettings.requireValues(developmentValues());
      expect(settings.scopes, ['openid', 'email']);
      expect(settings.issuer.path, '/realms/fajify');
      expect(
        createCustomerAuthRepository(
          values: developmentValues(),
          platform: TargetPlatform.android,
          isWeb: false,
        ),
        isA<NativeKeycloakRepository>(),
      );
      expect(
        NativeOidcSettings.requireValues({
          ...developmentValues(),
          'FAJI_CUSTOMER_OIDC_SCOPES': 'openid\temail  profile',
        }).scopes,
        ['openid', 'email', 'profile'],
      );
    },
  );

  test(
    'missing and disabled configuration produces an actionable sign-in error',
    () async {
      for (final values in [
        <String, String>{},
        {...developmentValues(), 'FAJI_CUSTOMER_NATIVE_AUTH_ENABLED': 'false'},
        {...developmentValues()}..remove('FAJI_CUSTOMER_OIDC_ISSUER'),
      ]) {
        final repository = createCustomerAuthRepository(
          values: values,
          platform: TargetPlatform.android,
          isWeb: false,
        );
        expect(repository, isA<ConfigurationFailureRepository>());
        final controller = AuthController(repository);
        await controller.signIn('test-user', 'test-only-password');
        expect(controller.canAccessCustomer, isFalse);
        expect(
          controller.state.failure?.code,
          AuthErrorCode.providerUnavailable,
        );
        expect(
          controller.state.failure?.message,
          contains('--dart-define-from-file'),
        );
        expect(
          controller.state.failure?.message,
          isNot('Account sign-in is not configured.'),
        );
        controller.dispose();
      }
    },
  );

  test(
    'invalid and unsupported configurations fail closed without a silent stub',
    () {
      for (final values in [
        {...developmentValues(), 'FAJI_CUSTOMER_OIDC_SCOPES': 'openid'},
        {
          ...developmentValues(),
          'FAJI_CUSTOMER_API_ORIGIN': 'http://localhost:3443',
        },
      ]) {
        expect(
          () => NativeOidcSettings.requireValues(values),
          throwsA(isA<AuthFailure>()),
        );
        expect(
          createCustomerAuthRepository(
            values: values,
            platform: TargetPlatform.android,
            isWeb: false,
          ),
          isA<ConfigurationFailureRepository>(),
        );
      }
      expect(
        createCustomerAuthRepository(
          values: developmentValues(),
          platform: TargetPlatform.windows,
          isWeb: false,
        ),
        isA<ConfigurationFailureRepository>(),
      );
    },
  );
}
