import 'package:flutter/material.dart';

import '../application/auth_controller.dart';
import '../domain/auth_session.dart';

/// Does not construct the protected subtree until access is established.
class CustomerAccessGate extends StatelessWidget {
  const CustomerAccessGate({
    super.key,
    required this.controller,
    required this.builder,
    required this.deniedBuilder,
  });

  final AuthController controller;
  final WidgetBuilder builder;
  final WidgetBuilder deniedBuilder;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: controller,
    builder: (context, _) {
      if (controller.state.status == AuthStatus.restoring) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return controller.canAccessCustomer
          ? builder(context)
          : deniedBuilder(context);
    },
  );
}
