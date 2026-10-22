import 'package:flutter/material.dart';
void main() => runApp(const FajiApp());

class FajiApp extends StatelessWidget {
  const FajiApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Faji Business',
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.red),
    home: Scaffold(
      appBar: AppBar(title: const Text('Faji Business')),
      body: const Center(child: Text('Business workspace — Milestone 1 foundation')),
    ),
  );
}
