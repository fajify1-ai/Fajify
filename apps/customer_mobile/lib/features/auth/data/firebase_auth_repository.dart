import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../domain/auth_repository.dart';
import '../domain/auth_input.dart';
import '../domain/auth_session.dart';

/// Retains legacy Firebase identity and Firestore paths during migration.
class FirebaseCustomerAuthRepository
    implements CustomerAuthRepository, LegacyPasswordAuth {
  FirebaseCustomerAuthRepository(this._auth, this._firestore);

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  @override
  Stream<AuthSession?> get sessionChanges =>
      _auth.idTokenChanges().asyncMap((user) => _session(user));

  Future<AuthSession?> _session(User? user, {bool refresh = false}) async {
    if (user == null) return null;
    final result = await user.getIdTokenResult(refresh);
    // Ignore token work belonging to an identity which has since signed out.
    if (_auth.currentUser?.uid != user.uid) return null;
    final expiresAt = result.expirationTime;
    if (expiresAt == null) {
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'The current session could not be verified.',
      );
    }
    return AuthSession(
      subject: user.uid,
      provider: IdentityProvider.legacyFirebase,
      expiresAt: expiresAt,
      emailVerified: user.emailVerified,
      // Preserves the existing legacy customer journey, not a Keycloak role.
      customerAccess: true,
    );
  }

  @override
  Future<AuthSession?> restoreSession() => _session(_auth.currentUser);

  @override
  Future<AuthSession?> refreshSession() =>
      _session(_auth.currentUser, refresh: true);

  @override
  Future<AuthSession> signIn(String email, String password) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      final session = await _session(credential.user);
      if (session == null) throw StateError('No authenticated session');
      return session;
    } on FirebaseAuthException catch (error) {
      throw _mapFailure(error);
    }
  }

  @override
  Future<AuthSession> register(LegacyRegistration registration) async {
    User? createdUser;
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: AuthInput.normalizeEmail(registration.email),
        password: registration.password,
      );
      createdUser = credential.user;
      if (createdUser == null) throw StateError('No registered user');
      await createdUser.updateDisplayName(registration.fullName.trim());
      final username = registration.username.trim();
      await _firestore.collection('users').doc(createdUser.uid).set({
        'uid': createdUser.uid,
        'fullName': registration.fullName.trim(),
        'username': username,
        'usernameLowercase': username.toLowerCase(),
        'email': AuthInput.normalizeEmail(registration.email),
        'phone': registration.phone.trim(),
        'dateOfBirth': registration.dateOfBirth.trim(),
        'homeAddress': registration.homeAddress.trim(),
        'role': 'user',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      final session = await _session(createdUser);
      if (session == null) throw StateError('No registered session');
      return session;
    } catch (error) {
      // Retain rollback for partially created accounts without deleting profiles.
      if (createdUser != null) {
        try {
          await createdUser.delete();
        } catch (_) {
          // Remain failed closed if rollback is unavailable.
        }
      }
      if (error is FirebaseAuthException) throw _mapFailure(error);
      throw const AuthFailure(
        AuthErrorCode.operationFailed,
        'We could not finish creating your account. Please try again.',
      );
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();

  AuthFailure _mapFailure(FirebaseAuthException error) {
    return switch (error.code) {
      'email-already-in-use' => const AuthFailure(
        AuthErrorCode.accountExists,
        'An account already exists with this email.',
      ),
      'invalid-email' => const AuthFailure(
        AuthErrorCode.invalidInput,
        'Please enter a valid email address.',
      ),
      'weak-password' => const AuthFailure(
        AuthErrorCode.invalidInput,
        'Please choose a stronger password.',
      ),
      'invalid-credential' ||
      'wrong-password' ||
      'user-not-found' => const AuthFailure(
        AuthErrorCode.invalidCredentials,
        'Incorrect email or password.',
      ),
      'user-disabled' => const AuthFailure(
        AuthErrorCode.disabled,
        'This account has been disabled.',
      ),
      'too-many-requests' => const AuthFailure(
        AuthErrorCode.rateLimited,
        'Too many attempts. Please try again later.',
      ),
      'network-request-failed' => const AuthFailure(
        AuthErrorCode.network,
        'Check your internet connection and try again.',
      ),
      'operation-not-allowed' => const AuthFailure(
        AuthErrorCode.providerUnavailable,
        'Email and password authentication is not enabled.',
      ),
      _ => const AuthFailure(
        AuthErrorCode.operationFailed,
        'Authentication failed. Please try again.',
      ),
    };
  }
}
