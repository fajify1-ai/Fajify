import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import 'auth_loading_indicator.dart';

class AuthPrimaryButton extends StatefulWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.busy = false,
  }) : _recovery = false;

  /// Retains recovery's existing flat, 62px FilledButton design.
  const AuthPrimaryButton.recovery({
    super.key,
    required this.label,
    required this.onTap,
    this.busy = false,
  }) : _recovery = true;

  final String label;
  final VoidCallback onTap;
  final bool busy;
  final bool _recovery;

  @override
  State<AuthPrimaryButton> createState() => _AuthPrimaryButtonState();
}

class _AuthPrimaryButtonState extends State<AuthPrimaryButton> {
  bool pressed = false;

  Widget get _content => widget.busy
      ? AuthLoadingIndicator(
          size: 22,
          strokeWidth: widget._recovery ? 2 : 2.5,
          color: Colors.white,
          label: widget.label,
        )
      : Text(
          widget.label,
          style: widget._recovery
              ? null
              : const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        );

  @override
  Widget build(BuildContext context) {
    if (widget._recovery) {
      return SizedBox(
        width: double.infinity,
        height: 62,
        child: FilledButton(
          onPressed: widget.busy ? null : widget.onTap,
          style: FilledButton.styleFrom(backgroundColor: FajiColors.primary),
          child: _content,
        ),
      );
    }
    return Semantics(
      button: true,
      enabled: !widget.busy,
      child: AnimatedScale(
        scale: pressed ? .98 : 1,
        duration: const Duration(milliseconds: 120),
        child: Material(
          color: FajiColors.primary,
          borderRadius: BorderRadius.circular(20),
          elevation: 12,
          shadowColor: FajiColors.primary.withValues(alpha: .35),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: widget.busy ? null : widget.onTap,
            onHighlightChanged: (value) => setState(() => pressed = value),
            child: SizedBox(height: 68, child: Center(child: _content)),
          ),
        ),
      ),
    );
  }
}
