import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/whats_on_item.dart';

class WhatsOnCard extends StatefulWidget {
  const WhatsOnCard({
    super.key,
    required this.item,
    required this.width,
    required this.saved,
    required this.onSaved,
    required this.onCtaPressed,
  });

  final WhatsOnItem item;
  final double width;
  final bool saved;
  final ValueChanged<bool> onSaved;
  final VoidCallback onCtaPressed;

  @override
  State<WhatsOnCard> createState() => _WhatsOnCardState();
}

class _WhatsOnCardState extends State<WhatsOnCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _heartAnimation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
    lowerBound: .84,
    upperBound: 1.08,
    value: 1,
  );

  @override
  void dispose() {
    _heartAnimation.dispose();
    super.dispose();
  }

  void _toggleSaved() {
    HapticFeedback.lightImpact();
    _heartAnimation.forward(from: .84).then((_) => _heartAnimation.reverse());
    widget.onSaved(!widget.saved);
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: 185,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              widget.item.image,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                color: FajiColors.borderDark,
                child: const Icon(
                  Icons.image_not_supported_outlined,
                  color: FajiColors.textSecondaryDark,
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: .08),
                    Colors.black.withValues(alpha: .15),
                    Colors.black.withValues(alpha: .88),
                  ],
                  stops: const [0, .42, 1],
                ),
              ),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: _CategoryPill(label: widget.item.category),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: ScaleTransition(
                scale: _heartAnimation,
                child: Material(
                  color: Colors.white,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: _toggleSaved,
                    customBorder: const CircleBorder(),
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: Icon(
                        widget.saved ? Icons.favorite : Icons.favorite_border,
                        color: FajiColors.primary,
                        size: 21,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 13,
              right: 10,
              bottom: 11,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.item.promoText,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: .35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.item.subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 7),
                      Semantics(
                        button: true,
                        label: widget.item.ctaText,
                        child: FilledButton(
                          onPressed: widget.onCtaPressed,
                          style: FilledButton.styleFrom(
                            backgroundColor: FajiColors.primary,
                            minimumSize: const Size(0, 28),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                          ),
                          child: Text(
                            widget.item.ctaText,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: .58),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
