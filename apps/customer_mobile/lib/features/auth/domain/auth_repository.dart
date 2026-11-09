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

abstract interface class CustomerAccountRecovery {
  /// Delegates to the provider's account flow; never accepts a password.
  Future<void> beginRecovery();
}

/// Future adapter uses a maintained native OIDC SDK, the system browser and
/// Authorization Code + S256 PKCE. Password collection is deliberately absent.
abstract interface class BrowserOidcAuthorization
    implements CustomerAccountRecovery {
  Future<AuthSession> authorize();
  Future<AuthSession> completeAuthorization(Uri callback);
  Future<void> beginRegistration();
  @override
  Future<void> beginRecovery();
}

enum CustomerAuthJourney { signIn, registration, recovery, verifyEmail }

/// Browser actions return only fully verified client session metadata. Opening
/// a provider page or requesting an email action is never proof of completion.
abstract interface class CustomerBrowserJourneys
    implements BrowserOidcAuthorization {
  Future<AuthSession> registerInBrowser();
  Future<AuthSession> recoverInBrowser();
  Future<AuthSession> verifyEmailInBrowser();
}
