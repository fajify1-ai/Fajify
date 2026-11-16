import 'auth_session.dart';

abstract interface class CustomerAuthRepository {
  Stream<AuthSession?> get sessionChanges;
  Future<AuthSession?> restoreSession();
  Future<AuthSession?> refreshSession();
  Future<void> signOut();
}

/// In-app credential sign-in, independent of browser account journeys.
abstract interface class CustomerPasswordSignIn {
  Future<AuthSession> signIn(String identifier, String password);
}

abstract interface class CustomerProfileAccess {
  Future<String> loadCustomerDisplayName();
}

abstract interface class CustomerPasswordRegistration {
  Future<AuthSession> register(LegacyRegistration registration);
}

abstract interface class LegacyPasswordAuth
    implements CustomerPasswordSignIn, CustomerPasswordRegistration {
  @override
  Future<AuthSession> register(LegacyRegistration registration);
}

/// Existing form profile fields; this is NOT a backend registration DTO.
class LegacyRegistration {
  const LegacyRegistration({
    required this.email,
    required this.password,
    required this.fullName,
    required this.username,
    required this.phone,
    required this.dateOfBirth,
    required this.homeAddress,
    this.termsAccepted = false,
  });

  final String email;
  final String password;
  final String fullName;
  final String username;
  final String phone;
  final String dateOfBirth;
  final String homeAddress;
  final bool termsAccepted;

  @override
  String toString() => 'LegacyRegistration(redacted)';
}

class UnavailableAuthRepository implements CustomerAuthRepository {
  const UnavailableAuthRepository();

  @override
  Stream<AuthSession?> get sessionChanges => const Stream.empty();
  @override
  Future<AuthSession?> restoreSession() async => null;
  @override
  Future<AuthSession?> refreshSession() async => null;
  @override
  Future<void> signOut() async {}
}

abstract interface class CustomerPasswordRecovery {
  Future<void> recover(String email);
}

abstract interface class CustomerSecondFactor {
  bool get challengePending;
  Future<AuthSession> verifySecondFactor(String code, {bool backup = false});
}
