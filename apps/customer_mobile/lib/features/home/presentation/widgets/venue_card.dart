import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/home_business.dart';

class VenueCard extends StatefulWidget {
  const VenueCard({
    super.key,
    required this.business,
    required this.saved,
    required this.onSaved,
    required this.onBook,
  });

  final HomeBusiness business;
  final bool saved;
  final ValueChanged<bool> onSaved;
  final VoidCallback onBook;

  @override
  State<VenueCard> createState() => _VenueCardState();
}

class _VenueCardState extends State<VenueCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _heartAnimation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
    lowerBound: .86,
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
    _heartAnimation.forward(from: .86).then((_) => _heartAnimation.reverse());
    widget.onSaved(!widget.saved);
  }

  @override
  Widget build(BuildContext context) {
    final business = widget.business;
    return Container(
      decoration: BoxDecoration(
        color: FajiColors.surfaceDark,
        borderRadius: BorderRadius.circular(20),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 150,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _BusinessImage(path: business.imageUrl),
                Positioned(
                  left: 12,
                  bottom: 11,
                  child: _LightPill(business.category),
                ),
                Positioned(
                  right: 12,
                  bottom: 11,
                  child: _StatusPill(isOpen: business.isOpen),
                ),
                Positioned(
                  right: 10,
                  top: 10,
                  child: ScaleTransition(
                    scale: _heartAnimation,
                    child: Material(
                      color: Colors.white,
                      shape: const CircleBorder(),
                      child: InkWell(
                        onTap: _toggleSaved,
                        customBorder: const CircleBorder(),
                        child: SizedBox(
                          width: 46,
                          height: 46,
                          child: Icon(
                            widget.saved
                                ? Icons.favorite
                                : Icons.favorite_border,
                            color: FajiColors.primary,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 13, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        business.businessName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _priceLabel(business.priceMin),
                      style: const TextStyle(
                        color: FajiColors.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: FajiColors.textSecondaryDark,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      business.location,
                      style: const TextStyle(
                        color: FajiColors.textSecondaryDark,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 15),
                Row(
                  children: [
                    const Icon(Icons.star, color: Color(0xffffb629), size: 17),
                    const SizedBox(width: 4),
                    Text(
                      business.rating.toStringAsFixed(1),
                      style: const TextStyle(
                        color: Color(0xffffb629),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 9),
                    const _Metric(label: 'Resp.'),
                    const _Metric(label: 'Satis.'),
                    const _Metric(label: 'Qual.'),
                    const Spacer(),
                    Material(
                      color: FajiColors.primary,
                      borderRadius: BorderRadius.circular(22),
                      child: InkWell(
                        onTap: widget.onBook,
                        borderRadius: BorderRadius.circular(22),
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 67),
                          height: 44,
                          alignment: Alignment.center,
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          child: const Text(
                            'Book',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
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
    );
  }
}

class _BusinessImage extends StatelessWidget {
  const _BusinessImage({required this.path});

  final String path;

  @override
  Widget build(BuildContext context) {
    if (path.startsWith('assets/')) {
      return Image.asset(
        path,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const _ImageFallback(),
      );
    }
    if (path.isNotEmpty) {
      return Image.network(
        path,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : const _ImageFallback(),
        errorBuilder: (_, _, _) => const _ImageFallback(),
      );
    }
    return const _ImageFallback();
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) => Container(
    color: FajiColors.borderDark,
    child: const Icon(
      Icons.image_not_supported_outlined,
      color: FajiColors.textSecondaryDark,
    ),
  );
}

class _LightPill extends StatelessWidget {
  const _LightPill(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .9),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Colors.black87,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.isOpen});

  final bool isOpen;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
    decoration: BoxDecoration(
      color: isOpen ? const Color(0xff20c976) : const Color(0xff55565b),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      isOpen ? 'Open' : 'Closed',
      style: const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xff16d879), width: 2),
          ),
          child: const Text(
            '99',
            style: TextStyle(
              color: Color(0xff16d879),
              fontSize: 7,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 3),
        Text(
          label,
          style: const TextStyle(
            color: FajiColors.textSecondaryDark,
            fontSize: 10,
          ),
        ),
      ],
    ),
  );
}

String _priceLabel(int price) {
  if (price <= 0) return 'Free';
  final formatted = price.toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => ',',
  );
  return '₦$formatted+';
}
