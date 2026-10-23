import 'package:flutter/material.dart';

import '../core/business_controller.dart';
import '../core/models.dart';

// Business-local adapter until D2 publishes reviewed shared widget exports.
const brand = Color(0xFFFA3F38);
const canvas = Color(0xFF0D0D0D);
const surface = Color(0xFF1C1C1C);
const muted = Color(0xFFB5B5BE);
const good = Color(0xFF5CD58C);
const amber = Color(0xFFFFBE4D);

ThemeData businessTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'Roboto',
  progressIndicatorTheme: const ProgressIndicatorThemeData(
    color: brand,
    linearTrackColor: Color(0xFF303030),
  ),
  brightness: Brightness.dark,
  scaffoldBackgroundColor: canvas,
  colorScheme: const ColorScheme.dark(
    primary: brand,
    surface: surface,
    onPrimary: Colors.white,
    onSurface: Colors.white,
    secondary: good,
  ),
  textTheme: const TextTheme(
    headlineMedium: TextStyle(fontSize: 26, fontWeight: FontWeight.w600),
    titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
    bodyMedium: TextStyle(fontSize: 14, height: 1.4),
    bodySmall: TextStyle(fontSize: 12, color: muted, height: 1.4),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
    contentPadding: const EdgeInsets.all(16),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(48, 48),
      foregroundColor: Colors.white,
      side: const BorderSide(color: Color(0xFF424242)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  dividerTheme: const DividerThemeData(color: Color(0xFF303030), thickness: 1),
  navigationRailTheme: NavigationRailThemeData(
    backgroundColor: surface,
    indicatorColor: brand.withValues(alpha: .12),
    selectedIconTheme: const IconThemeData(color: brand),
    selectedLabelTextStyle: const TextStyle(color: brand),
    unselectedIconTheme: const IconThemeData(color: muted),
  ),
  segmentedButtonTheme: SegmentedButtonThemeData(
    style: ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? const Color(0xFF303030)
            : surface,
      ),
      foregroundColor: const WidgetStatePropertyAll(Colors.white),
    ),
  ),
  navigationBarTheme: NavigationBarThemeData(
    backgroundColor: surface,
    indicatorColor: brand.withValues(alpha: .12),
    labelTextStyle: WidgetStateProperty.resolveWith(
      (states) => TextStyle(
        fontSize: 11,
        color: states.contains(WidgetState.selected) ? brand : muted,
      ),
    ),
  ),
);

class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.color,
    this.borderColor,
    this.padding = const EdgeInsets.all(18),
  });
  final Widget child;
  final Color? color;
  final Color? borderColor;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Material(
    color: color ?? surface,
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: BorderSide(color: borderColor ?? const Color(0xFF292929)),
    ),
    child: Padding(padding: padding, child: child),
  );
}

class PageBody extends StatelessWidget {
  const PageBody({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
    this.storageKey,
  });
  final String title;
  final String subtitle;
  final List<Widget> children;
  final String? storageKey;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    key: PageStorageKey(storageKey ?? title),
    padding: const EdgeInsets.fromLTRB(18, 22, 18, 32),
    child: Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 920),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(
                title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 22),
            ...children.expand((child) => [child, const SizedBox(height: 14)]),
          ],
        ),
      ),
    ),
  );
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.label, {super.key, this.color = good});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .10),
      borderRadius: BorderRadius.circular(30),
    ),
    child: Text(
      label,
      style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500),
    ),
  );
}

class SectionHeading extends StatelessWidget {
  const SectionHeading(this.title, {super.key, this.action});
  final String title;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
      ),
      if (action != null) action!,
    ],
  );
}

class DataGate extends StatelessWidget {
  const DataGate({super.key, required this.controller, required this.child});
  final BusinessController controller;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    switch (controller.state) {
      case LoadState.loading:
        return const Center(
          child: CircularProgressIndicator(
            semanticsLabel: 'Loading sample data',
          ),
        );
      case LoadState.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_outlined, size: 36, color: muted),
                const SizedBox(height: 12),
                Text(
                  controller.error ?? 'Could not load sample data.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => controller.scenario(DemoScenario.populated),
                  child: const Text('Retry sample data'),
                ),
              ],
            ),
          ),
        );
      case LoadState.empty:
      case LoadState.data:
        return child;
    }
  }
}

Widget emptyState(String message) => Panel(
  child: Column(
    children: [
      const Icon(Icons.inbox_outlined, color: muted, size: 32),
      const SizedBox(height: 12),
      Text(message, textAlign: TextAlign.center),
    ],
  ),
);

Future<void> preview(BuildContext context, String title, String message) =>
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );

Future<bool> confirmDemo(
  BuildContext context,
  String title,
  String message,
) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Apply demo change'),
          ),
        ],
      ),
    ) ??
    false;

void feedback(BuildContext context, bool ok) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(
        ok
            ? 'Sample change saved for this demo session.'
            : 'Sample change failed. Please retry.',
      ),
    ),
  );
}
