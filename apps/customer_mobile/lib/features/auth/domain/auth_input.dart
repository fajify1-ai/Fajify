/// Shared client-side input checks, not identity-provider password policy.
abstract final class AuthInput {
  static String normalizeEmail(String value) => value.trim().toLowerCase();

  static String? requiredValue(String? value, String label) =>
      value == null || value.trim().isEmpty ? '$label is required' : null;

  static String? email(String? value) {
    final required = requiredValue(value, 'Email');
    if (required != null) return required;
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value!.trim())
        ? null
        : 'Enter a valid email';
  }

  // Sign-in must not impose a new-account password policy on existing users.
  static String? signInPassword(String? value) =>
      value == null || value.isEmpty ? 'Password is required' : null;

  static String? registrationPassword(String? value) =>
      value == null || value.length < 8 ? 'Use at least 8 characters' : null;
}
