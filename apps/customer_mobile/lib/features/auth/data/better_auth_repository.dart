import 'dart:async';

import 'package:faji_flutter_core/better_auth.dart';

import '../domain/auth_repository.dart';
import '../domain/auth_session.dart';

class BetterAuthRepository
    implements
        CustomerAuthRepository,
        CustomerPasswordSignIn,
        CustomerPasswordRegistration,
        CustomerProfileAccess,
        CustomerPasswordRecovery {
  BetterAuthRepository(this.client);
  final FajiAuthClient client;
  @override
  Stream<AuthSession?> get sessionChanges => const Stream.empty();
  @override
  Future<AuthSession?> restoreSession() async {
    final result = await client.session();
    if (result == null) return null;
    final identity = await client.identity();
    final user = result['user'] as Map<String, dynamic>;
    final session = result['session'] as Map<String, dynamic>;
    return AuthSession(
      subject: user['id'] as String,
      provider: IdentityProvider.betterAuth,
      expiresAt: DateTime.parse(session['expiresAt'] as String),
      emailVerified: user['emailVerified'] == true,
      customerAccess: (identity['roles'] as List).contains('customer'),
    );
  }

  Future<AuthSession> _authenticated() async => (await restoreSession())!;
  @override
  Future<AuthSession?> refreshSession() => restoreSession();
  @override
  Future<AuthSession> signIn(String identifier, String password) async {
    await client.signIn(identifier, password);
    return _authenticated();
  }

  @override
  Future<AuthSession> register(LegacyRegistration input) async {
    if (!input.termsAccepted)
      throw const AuthFailure(
        AuthErrorCode.invalidInput,
        'Accept the terms to continue.',
      );
    final parts = input.dateOfBirth.split('/');
    final birthday = parts.length == 3
        ? '${parts[2]}-${parts[0].padLeft(2, '0')}-${parts[1].padLeft(2, '0')}'
        : input.dateOfBirth;
    var phone = input.phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (phone.startsWith('0')) {
      phone = '+234${phone.substring(1)}';
    } else if (!phone.startsWith('+')) {
      phone = phone.startsWith('234') ? '+$phone' : '+234$phone';
    }
    await client.register(
      input.fullName,
      input.email,
      input.password,
      profile: {
        'username': input.username.trim(),
        'phoneNumber': phone,
        'dateOfBirth': birthday,
        'homeAddress': input.homeAddress.trim(),
        'termsAccepted': input.termsAccepted,
      },
    );
    return _authenticated();
  }

  @override
  Future<String> loadCustomerDisplayName() async {
    final session = await client.session();
    return (session?['user'] as Map<String, dynamic>)['name'] as String;
  }

  @override
  Future<void> signOut() => client.signOut();
  @override
  Future<void> recover(String email) => client.recover(email);
}
