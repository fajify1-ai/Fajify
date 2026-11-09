import 'dart:convert';

import 'package:faji_app/features/auth/data/customer_auth_composition.dart';
import 'package:faji_app/features/auth/data/identity_http_io.dart';
import 'package:faji_app/features/auth/data/native_keycloak_repository.dart';
import 'package:faji_app/features/auth/data/native_oidc_settings.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('device build enables native sign-in and reaches HTTPS services', (
    tester,
  ) async {
    final settings = NativeOidcSettings.fromEnvironment();
    expect(createCustomerAuthRepository(), isA<NativeKeycloakRepository>());
    expect(settings.scopes, containsAll(['openid', 'email']));
    final discovery = await requestOidcJson(
      Uri.parse('${settings.issuer}/.well-known/openid-configuration'),
      null,
    );
    expect(discovery.statusCode, 200);
    final value = jsonDecode(discovery.body) as Map<String, dynamic>;
    expect(value['issuer'], settings.issuer.toString());
    expect(
      value['token_endpoint'],
      '${settings.issuer}/protocol/openid-connect/token',
    );
    // An unauthenticated API check must be denied, proving reachability without
    // putting credentials or tokens in the test or its output.
    final api = await requestOidcJson(
      settings.apiOrigin.resolve('/api/v1/auth/me'),
      null,
    );
    expect(api.statusCode, 401);
  });
}
