import 'package:flutter/material.dart';

/// Common auth form structure without imposing screen-specific spacing.
class AuthFormLayout extends StatelessWidget {
  const AuthFormLayout({
    super.key,
    required this.formKey,
    required this.children,
  });

  final GlobalKey<FormState> formKey;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Form(
    key: formKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    ),
  );
}
