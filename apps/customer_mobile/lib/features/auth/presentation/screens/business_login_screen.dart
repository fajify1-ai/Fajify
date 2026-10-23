import 'package:faji_business/faji_business.dart';
import 'package:flutter/material.dart';

/// The merchant workspace shares the installed app, not the customer session.
class BusinessLoginScreen extends StatelessWidget {
  const BusinessLoginScreen({super.key});

  @override
  Widget build(BuildContext context) => BusinessApp(
    embedded: true,
    initialLocation: '/login',
    onExit: () => Navigator.of(context).pop(),
  );
}
