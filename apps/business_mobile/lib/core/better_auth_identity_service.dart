import 'package:faji_flutter_core/better_auth.dart';
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

class BetterAuthIdentityService implements IdentityService {
  BetterAuthIdentityService(this.config);
  final BusinessConfig config;
  late final FajiAuthClient client = FajiAuthClient(baseUrl: config.apiBaseUrl);
  @override
  Future<BusinessIdentity?> restoreSession() async {
    if (config.problem != null) return null;
    if (await client.session() == null) return null;
    final identity = await client.identity();
    return BusinessIdentity(
      subject: identity['subject'] as String,
      roles: (identity['roles'] as List).cast<String>().toSet(),
      businessMemberships: (identity['memberships'] as List)
          .map((m) => (m as Map<String, dynamic>)['resourceId'] as String)
          .toSet(),
    );
  }

  @override
  Future<BusinessIdentity?> validateSession() => restoreSession();
  @override
  Future<BusinessIdentity> signIn() async {
    final result = await restoreSession();
    if (result == null)
      throw const IdentityFailure('Sign in with your email and password.');
    return result;
  }

  @override
  Future<void> signOut() async {
    if (config.problem == null) await client.signOut();
  }
}
