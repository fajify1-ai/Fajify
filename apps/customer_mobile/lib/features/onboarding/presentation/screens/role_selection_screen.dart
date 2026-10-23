import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../../main.dart';
import '../widgets/animated_primary_login_button.dart';
import '../widgets/faji_role_card.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..forward();

  Animation<double> _fade(double begin, double end) => CurvedAnimation(
    parent: _controller,
    curve: Interval(begin, end, curve: Curves.easeOutCubic),
  );

  Animation<Offset> _slide(double begin, double end) => Tween<Offset>(
    begin: const Offset(0, .1),
    end: Offset.zero,
  ).animate(_fade(begin, end));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(String route) {
    HapticFeedback.lightImpact();
    Navigator.of(context).pushNamed(route);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final height = constraints.maxHeight;
          final compact = height < 700;
          final sheetHeight = (height * .375).clamp(320.0, 380.0).toDouble();

          return Stack(
            fit: StackFit.expand,
            children: [
              const ColoredBox(color: FajiColors.backgroundDark),
              _TopDecoration(animation: _fade(0, .3)),
              SafeArea(
                child: Stack(
                  children: [
                    Positioned(
                      top: compact ? 78 : 112,
                      left: 0,
                      right: 0,
                      child: FadeTransition(
                        opacity: _fade(.12, .45),
                        child: SlideTransition(
                          position: _slide(.12, .45),
                          child: const Center(child: _FajiWordmark()),
                        ),
                      ),
                    ),
                    Positioned(
                      top: compact ? 258 : height * .355,
                      left: 0,
                      right: 0,
                      child: _IntroContent(
                        fade: _fade(.28, .62),
                        slide: _slide(.28, .62),
                        accentScale: _fade(.48, .72),
                        compact: compact,
                      ),
                    ),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: _BottomSheet(
                        height: sheetHeight,
                        fade: _fade(.48, .9),
                        slide: _slide(.48, .9),
                        onNavigate: _go,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TopDecoration extends StatelessWidget {
  const _TopDecoration({required this.animation});
  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      right: 0,
      width: MediaQuery.sizeOf(context).width * .395,
      height: 214,
      child: FadeTransition(
        opacity: animation,
        child: Container(
          decoration: const BoxDecoration(
            color: FajiColors.decorativeDarkRed,
            borderRadius: BorderRadius.only(bottomLeft: Radius.circular(150)),
          ),
        ),
      ),
    );
  }
}

class _FajiWordmark extends StatelessWidget {
  const _FajiWordmark();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'faji',
      style: TextStyle(
        color: FajiColors.primary,
        fontSize: 76,
        height: .9,
        fontWeight: FontWeight.w900,
        letterSpacing: -6,
      ),
    );
  }
}

class _IntroContent extends StatelessWidget {
  const _IntroContent({
    required this.fade,
    required this.slide,
    required this.accentScale,
    required this.compact,
  });

  final Animation<double> fade;
  final Animation<Offset> slide;
  final Animation<double> accentScale;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: fade,
      child: SlideTransition(
        position: slide,
        child: SizedBox(
          height: compact ? 150 : 166,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              const Positioned(left: 20, top: 9, child: _DotPattern()),
              Positioned.fill(
                child: Column(
                  children: [
                    const Text(
                      'Plan. Book. Enjoy.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 28,
                        height: 1.1,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -.5,
                      ),
                    ),
                    const SizedBox(height: 13),
                    const Text(
                      'Everything you need to make every\nmoment unforgettable.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 16,
                        height: 1.35,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    SizedBox(height: compact ? 19 : 27),
                    ScaleTransition(
                      scale: accentScale,
                      child: Container(
                        width: 49,
                        height: 4,
                        decoration: BoxDecoration(
                          color: FajiColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DotPattern extends StatelessWidget {
  const _DotPattern();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        5,
        (_) => Row(
          children: List.generate(
            3,
            (_) => Container(
              width: 6,
              height: 6,
              margin: const EdgeInsets.only(right: 8, bottom: 9),
              decoration: BoxDecoration(
                color: FajiColors.primary.withValues(alpha: .26),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomSheet extends StatelessWidget {
  const _BottomSheet({
    required this.height,
    required this.fade,
    required this.slide,
    required this.onNavigate,
  });

  final double height;
  final Animation<double> fade;
  final Animation<Offset> slide;
  final void Function(String route) onNavigate;

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: fade,
      child: SlideTransition(
        position: slide,
        child: Container(
          width: double.infinity,
          height: height,
          padding: const EdgeInsets.fromLTRB(24, 30, 24, 14),
          decoration: const BoxDecoration(
            color: FajiColors.surfaceDark,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            children: [
              AnimatedPrimaryLoginButton(
                onTap: () => onNavigate(FajiRoutes.userLogin),
              ),
              const SizedBox(height: 20),
              const Row(
                children: [
                  Expanded(child: Divider(color: FajiColors.borderDark)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 18),
                    child: Text(
                      'or',
                      style: TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: FajiColors.borderDark)),
                ],
              ),
              const SizedBox(height: 17),
              Row(
                children: [
                  Expanded(
                    child: FajiRoleCard(
                      icon: Icons.storefront_outlined,
                      label: 'Faji Business',
                      semanticLabel: 'Open Faji Business',
                      onTap: () => onNavigate(FajiRoutes.businessLogin),
                    ),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: FajiRoleCard(
                      icon: Icons.local_shipping_outlined,
                      label: 'Faji Ride',
                      semanticLabel: 'Open Faji Ride',
                      onTap: () => onNavigate(FajiRoutes.rideLogin),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
