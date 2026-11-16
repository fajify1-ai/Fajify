import 'package:flutter/foundation.dart';
import 'package:faji_flutter_core/better_auth.dart';

import '../domain/auth_repository.dart';
import 'better_auth_repository.dart';

CustomerAuthRepository createCustomerAuthRepository({
  Map<String, String>? values,
  TargetPlatform? platform,
  bool? isWeb,
}) {
  if (isWeb ?? kIsWeb) return const UnavailableAuthRepository();
  final base =
      values?['API_BASE_URL'] ?? const String.fromEnvironment('API_BASE_URL');
  if (base.isEmpty) return const UnavailableAuthRepository();
  return BetterAuthRepository(FajiAuthClient(baseUrl: base));
}
