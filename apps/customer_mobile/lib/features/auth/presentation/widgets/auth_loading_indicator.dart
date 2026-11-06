import 'package:flutter/material.dart';

/// Shared progress semantics; callers retain their existing size and colors.
class AuthLoadingIndicator extends StatelessWidget {
  const AuthLoadingIndicator({
    super.key,
    this.size,
    this.color,
    this.strokeWidth = 4,
    this.label = 'Loading',
  });

  final double? size;
  final Color? color;
  final double strokeWidth;
  final String label;

  @override
  Widget build(BuildContext context) {
    final indicator = CircularProgressIndicator(
      strokeWidth: strokeWidth,
      color: color,
      semanticsLabel: label,
    );
    return size == null
        ? indicator
        : SizedBox(width: size, height: size, child: indicator);
  }
}
