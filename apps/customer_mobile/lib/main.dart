import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'core/theme/faji_theme.dart';
import 'features/auth/application/auth_controller.dart';
import 'features/auth/data/firebase_auth_repository.dart';
import 'features/auth/domain/auth_repository.dart';
import 'features/auth/domain/auth_session.dart';
import 'features/auth/presentation/auth_scope.dart';
import 'features/auth/presentation/customer_access_gate.dart';
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
  runApp(
    FajiApp(
      authController: AuthController(
        FirebaseCustomerAuthRepository(
          FirebaseAuth.instance,
          FirebaseFirestore.instance,
        ),
      ),
    ),
  );
}

class FajiApp extends StatefulWidget {
  const FajiApp({super.key, this.authController});
  final AuthController? authController;

  @override
  State<FajiApp> createState() => _FajiAppState();
}

class _FajiAppState extends State<FajiApp> with WidgetsBindingObserver {
  late final AuthController _auth;
  bool _hadCustomerSession = false;

  @override
  void initState() {
    super.initState();
    // Tests and previews without platform composition fail closed.
    _auth =
        widget.authController ??
        AuthController(const UnavailableAuthRepository());
    WidgetsBinding.instance.addObserver(this);
    _auth.addListener(_sessionChanged);
    unawaited(_auth.restore());
  }

  void _sessionChanged() {
    if (_auth.canAccessCustomer) {
      _hadCustomerSession = true;
      return;
    }
    if (!_hadCustomerSession ||
        _auth.state.status == AuthStatus.restoring ||
        _auth.state.status == AuthStatus.authenticating) {
      return;
    }
    _hadCustomerSession = false;
    // Discard the complete customer stack, including directly pushed pages.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_auth.canAccessCustomer) {
        navigatorKey.currentState?.pushNamedAndRemoveUntil(
          FajiRoutes.roleSelection,
          (_) => false,
        );
      }
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _auth.checkExpiry();
      // Firebase owns legacy automatic refresh; preserve valid offline sessions.
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth.removeListener(_sessionChanged);
    // The composition root owns controllers it creates; injected ones are owned
    // by the caller (including main's application-lifetime controller).
    if (widget.authController == null) _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AuthScope(
    controller: _auth,
    child: MaterialApp(
      title: 'Faji',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      theme: FajiTheme.dark,
      home: SplashScreen(
        onFinish: () => navigatorKey.currentState?.pushReplacementNamed(
          _auth.canAccessCustomer
              ? FajiRoutes.userHome
              : FajiRoutes.roleSelection,
        ),
      ),
      routes: {
        FajiRoutes.roleSelection: (_) => const RoleSelectionScreen(),
        FajiRoutes.businessLogin: (_) => const BusinessLoginScreen(),
        FajiRoutes.rideLogin: (_) => const RideLoginScreen(),
        FajiRoutes.forgotPassword: (_) => const ForgotPasswordScreen(),
        FajiRoutes.userHome: (_) => CustomerAccessGate(
          controller: _auth,
          builder: (_) => const UserHomeScreen(),
          deniedBuilder: (_) => const RoleSelectionScreen(),
        ),
      },
      onGenerateRoute: (settings) {
        if (settings.name == FajiRoutes.userLogin) {
          return PageRouteBuilder<void>(
            settings: settings,
            opaque: false,
            barrierColor: Colors.transparent,
            pageBuilder: (_, _, _) => const UserAuthScreen(),
            transitionsBuilder: (_, animation, _, child) =>
                FadeTransition(opacity: animation, child: child),
          );
        }
        return null;
      },
    ),
  );
}

final navigatorKey = GlobalKey<NavigatorState>();
