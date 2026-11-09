import 'package:faji_app/features/auth/data/identity_http_client.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'local CA trust is confined to Android debug localhost HTTPS services',
    () {
      for (final port in [8443, 3443]) {
        final uri = Uri.parse('https://localhost:$port');
        expect(
          usesLocalDevelopmentTrust(uri, debug: true, android: true),
          isTrue,
        );
        expect(
          usesLocalDevelopmentTrust(uri, debug: false, android: true),
          isFalse,
        );
        expect(
          usesLocalDevelopmentTrust(uri, debug: true, android: false),
          isFalse,
        );
      }
      for (final url in [
        'http://localhost:8443',
        'https://localhost:443',
        'https://production.example:8443',
        'https://localhost.example:8443',
        'https://127.0.0.1:8443',
      ]) {
        expect(
          usesLocalDevelopmentTrust(Uri.parse(url), debug: true, android: true),
          isFalse,
        );
      }
    },
  );
}
