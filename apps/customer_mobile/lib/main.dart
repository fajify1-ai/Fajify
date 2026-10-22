import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'core/theme/faji_theme.dart';
import 'features/auth/presentation/screens/business_login_screen.dart';
import 'features/auth/presentation/screens/ride_login_screen.dart';
import 'features/auth/presentation/screens/user_auth_screen.dart';
import 'features/auth/presentation/screens/forgot_password_screen.dart';
import 'features/auth/presentation/screens/user_home_screen.dart';
import 'features/onboarding/presentation/screens/role_selection_screen.dart';
import 'features/onboarding/presentation/screens/splash_screen.dart';

class FajiRoutes {
  static const roleSelection = '/role-selection';
  static const userLogin = '/user-auth';
  static const forgotPassword = '/forgot-password';
  static const userHome = '/user-home';
  static const businessLogin = '/business-login';
  static const rideLogin = '/ride-login';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp();

  runApp(const FajiApp());
}

class FajiApp extends StatelessWidget {
  const FajiApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Faji',
    debugShowCheckedModeBanner: false,
    navigatorKey: navigatorKey,
    theme: FajiTheme.dark,
    home: SplashScreen(
      onFinish: () => navigatorKey.currentState?.pushReplacementNamed(
        FajiRoutes.roleSelection,
      ),
    ),
    routes: {
      FajiRoutes.roleSelection: (_) => const RoleSelectionScreen(),
      FajiRoutes.businessLogin: (_) => const BusinessLoginScreen(),
      FajiRoutes.rideLogin: (_) => const RideLoginScreen(),
      FajiRoutes.forgotPassword: (_) => const ForgotPasswordScreen(),
      FajiRoutes.userHome: (_) => const UserHomeScreen(),
    },
    onGenerateRoute: (settings) {
      if (settings.name == FajiRoutes.userLogin) {
        return PageRouteBuilder<void>(
          settings: settings,
          opaque: false,
          barrierColor: Colors.transparent,
          pageBuilder: (_, __, ___) => const UserAuthScreen(),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        );
      }
      return null;
    },
  );
}

final navigatorKey = GlobalKey<NavigatorState>();
