import 'package:flutter/material.dart';
void main() => runApp(const FajiApp());

class FajiApp extends StatelessWidget {
  const FajiApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Faji Ride & Dispatch',
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.red),
    home: Scaffold(
      appBar: AppBar(title: const Text('Faji Ride & Dispatch')),
      body: const Center(child: Text('Driver / Dispatcher workspace — Milestone 1 foundation')),
    ),
  );
}
