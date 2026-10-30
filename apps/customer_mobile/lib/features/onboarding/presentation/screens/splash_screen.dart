import 'dart:ui';

import 'package:flutter/material.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onFinish});

  final VoidCallback onFinish;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  static const List<(double, double)> _segments = [
    (0.00, 0.28),
    (0.28, 0.56),
    (0.56, 0.76),
    (0.76, 1.00),
  ];

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(
            vsync: this,
            duration: const Duration(milliseconds: 3500),
          )
          ..addStatusListener((status) {
            if (status == AnimationStatus.completed && mounted) {
              widget.onFinish();
            }
          })
          ..forward();
  }

  double _progress(double value, double start, double end) {
    if (value <= start) return 0;
    if (value >= end) return 1;
    return Curves.easeOutCubic.transform(
      ((value - start) / (end - start)).clamp(0.0, 1.0),
    );
  }

  double _pulse(double value) {
    if (value < 0.72) return 1;
    if (value <= 0.84) {
      return lerpDouble(1, 1.04, (value - 0.72) / 0.12) ?? 1;
    }
    if (value <= 0.96) {
      return lerpDouble(1.04, 1, (value - 0.84) / 0.12) ?? 1;
    }
    return 1;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final logoCircleSize = (size.width * 0.48).clamp(150.0, 190.0);
    final logoWidth = logoCircleSize * 0.78;
    final logoHeight = logoWidth * 0.65;
    final blobSize = (size.longestSide * 0.36).clamp(230.0, 380.0);

    return Scaffold(
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final value = _controller.value;
          final screenFadeIn = _progress(value, 0.00, 0.14);
          final screenFadeOut = value < 0.92
              ? 1.0
              : 1 - _progress(value, 0.92, 1.00);
          final logoEntrance = _progress(value, 0.10, 0.34);

          return Opacity(
            opacity: (screenFadeIn * screenFadeOut).clamp(0.0, 1.0),
            child: Container(
              width: double.infinity,
              height: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFFFA3F39),
                    Color(0xFFAF1818),
                    Color(0xFFC0392B),
                  ],
                  stops: [0.0, 0.55, 1.0],
                ),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  _SplashBlob(
                    top: -blobSize * 0.18,
                    right: -blobSize * 0.26,
                    size: blobSize,
                    angle: -0.48,
                  ),
                  _SplashBlob(
                    bottom: -blobSize * 0.18,
                    left: -blobSize * 0.24,
                    size: blobSize,
                    angle: -0.42,
                  ),
                  Center(
                    child: Opacity(
                      opacity: _progress(value, 0.10, 0.26),
                      child: Transform.translate(
                        offset: Offset(0, lerpDouble(12, 0, logoEntrance) ?? 0),
                        child: Transform.scale(
                          scale:
                              (lerpDouble(0.4, 1.0, logoEntrance) ?? 1) *
                              _pulse(value),
                          child: Container(
                            width: logoCircleSize,
                            height: logoCircleSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.30),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: SizedBox(
                              width: logoWidth,
                              height: logoHeight,
                              child: Stack(
                                children: List.generate(_segments.length, (
                                  index,
                                ) {
                                  final segment = _segments[index];
                                  final start = 0.26 + (index * 0.055);
                                  final progress = _progress(
                                    value,
                                    start,
                                    start + 0.16,
                                  );
                                  return Positioned.fill(
                                    child: Opacity(
                                      opacity: progress,
                                      child: Transform.translate(
                                        offset: Offset(
                                          0,
                                          lerpDouble(8, 0, progress) ?? 0,
                                        ),
                                        child: Transform.scale(
                                          scale:
                                              lerpDouble(0.94, 1, progress) ??
                                              1,
                                          child: ClipRect(
                                            clipper: _LogoSegmentClipper(
                                              startFraction: segment.$1,
                                              endFraction: segment.$2,
                                            ),
                                            child: Image.asset(
                                              'assets/images/faji-logo-transparent.png',
                                              width: logoWidth,
                                              height: logoHeight,
                                              fit: BoxFit.contain,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SplashBlob extends StatelessWidget {
  const _SplashBlob({
    this.top,
    this.bottom,
    this.left,
    this.right,
    required this.size,
    required this.angle,
  });
  final double? top;
  final double? bottom;
  final double? left;
  final double? right;
  final double size;
  final double angle;

  @override
  Widget build(BuildContext context) => Positioned(
    top: top,
    bottom: bottom,
    left: left,
    right: right,
    child: Transform.rotate(
      angle: angle,
      child: Container(
        width: size,
        height: size * 0.72,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(size),
        ),
      ),
    ),
  );
}

class _LogoSegmentClipper extends CustomClipper<Rect> {
  const _LogoSegmentClipper({
    required this.startFraction,
    required this.endFraction,
  });
  final double startFraction;
  final double endFraction;

  @override
  Rect getClip(Size size) => Rect.fromLTRB(
    size.width * startFraction,
    0,
    size.width * endFraction,
    size.height,
  );

  @override
  bool shouldReclip(covariant _LogoSegmentClipper oldClipper) =>
      oldClipper.startFraction != startFraction ||
      oldClipper.endFraction != endFraction;
}
