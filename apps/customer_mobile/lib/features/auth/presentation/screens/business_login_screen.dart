import 'dart:ui';

import 'package:faji_business/faji_business.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

/// Business starts with a choice; selecting either action never signs in.
class BusinessLoginScreen extends StatefulWidget {
  const BusinessLoginScreen({super.key});

  @override
  State<BusinessLoginScreen> createState() => _BusinessLoginScreenState();
}

class _BusinessLoginScreenState extends State<BusinessLoginScreen> {
  String? _destination;

  @override
  Widget build(BuildContext context) {
    final destination = _destination;
    if (destination != null) {
      return BusinessApp(
        embedded: true,
        initialLocation: destination,
        onExit: () => Navigator.of(context).pop(),
      );
    }
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: Stack(
        children: [
          Positioned.fill(
            child: ExcludeSemantics(
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: Opacity(
                  opacity: 0.3,
                  child: Align(
                    alignment: const Alignment(0, -0.4),
                    child: Padding(
                      padding: const EdgeInsets.all(48),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/images/faji-logo-transparent.png',
                            width: 220,
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Plan. Book. Enjoy.',
                            style: TextStyle(fontSize: 24),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 580),
              child: Material(
                color: FajiColors.surfaceDark,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
                clipBehavior: Clip.antiAlias,
                child: SafeArea(
                  top: false,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(22, 12, 22, 32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Container(
                            width: 38,
                            height: 4,
                            decoration: BoxDecoration(
                              color: FajiColors.borderDark,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'FAJIFY BUSINESS',
                                    style: TextStyle(
                                      color: FajiColors.primary,
                                      fontSize: 12,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Grow your business with fajify',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton.filledTonal(
                              tooltip: 'Back to role selection',
                              onPressed: () => Navigator.of(context).pop(),
                              icon: const Icon(Icons.close, size: 20),
                              style: IconButton.styleFrom(
                                backgroundColor: FajiColors.borderDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _ChoiceButton(
                          label: 'Sign In',
                          icon: Icons.person_outline,
                          primary: true,
                          onPressed: () =>
                              setState(() => _destination = '/login'),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            children: [
                              Expanded(
                                child: Divider(color: FajiColors.borderDark),
                              ),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 16),
                                child: Text(
                                  'or',
                                  style: TextStyle(
                                    color: FajiColors.textSecondaryDark,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Divider(color: FajiColors.borderDark),
                              ),
                            ],
                          ),
                        ),
                        _ChoiceButton(
                          label: 'Register Your Business',
                          icon: Icons.person_add_alt_outlined,
                          primary: false,
                          onPressed: () =>
                              setState(() => _destination = '/register'),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'New businesses go through a quick setup wizard.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFFAAAAAF),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({
    required this.label,
    required this.icon,
    required this.primary,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool primary;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onPressed,
    style: OutlinedButton.styleFrom(
      backgroundColor: primary ? FajiColors.primary : Colors.transparent,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(56),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      side: BorderSide(
        color: primary ? FajiColors.primary : FajiColors.borderDark,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
    child: Row(
      children: [
        Icon(icon, color: primary ? Colors.white : FajiColors.primary),
        const SizedBox(width: 14),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
        const Icon(Icons.chevron_right, size: 22),
      ],
    ),
  );
}
