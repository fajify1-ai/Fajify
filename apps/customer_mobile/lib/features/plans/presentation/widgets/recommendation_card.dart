import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/plan_option.dart';

class RecommendationCard extends StatelessWidget {
  const RecommendationCard({
    super.key,
    required this.plan,
    required this.badge,
    required this.badgeColor,
    required this.saved,
    required this.onSaved,
    required this.onBook,
  });

  final PlanOption plan;
  final String badge;
  final Color badgeColor;
  final bool saved;
  final ValueChanged<bool> onSaved;
  final VoidCallback onBook;

  String _price(int value) =>
      '₦${value.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')}';

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: FajiColors.surfaceDark,
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 166,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _PlanImage(plan: plan),
                Positioned(
                  left: 10,
                  top: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: badgeColor,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 10,
                  top: 10,
                  child: Material(
                    color: const Color(0xdd171717),
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        onSaved(!saved);
                      },
                      customBorder: const CircleBorder(),
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: Icon(
                          saved ? Icons.favorite : Icons.favorite_border,
                          color: FajiColors.primary,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(13, 12, 13, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        plan.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _price(plan.priceMin),
                      style: const TextStyle(
                        color: FajiColors.primary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  '⌖ ${plan.location}',
                  style: const TextStyle(
                    color: FajiColors.textSecondaryDark,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  plan.features.join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: FajiColors.textSecondaryDark,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '♧ Up to ${plan.maximumGuests}',
                  style: const TextStyle(
                    color: FajiColors.textSecondaryDark,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onBook,
                    style: FilledButton.styleFrom(
                      backgroundColor: FajiColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Book Now →',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanImage extends StatelessWidget {
  const _PlanImage({required this.plan});

  final PlanOption plan;

  @override
  Widget build(BuildContext context) {
    if (plan.imageUrl.isNotEmpty) {
      return Image.network(
        plan.imageUrl,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _assetImage(),
      );
    }
    return _assetImage();
  }

  Widget _assetImage() => Image.asset(
    plan.imageAsset,
    fit: BoxFit.cover,
    errorBuilder: (_, _, _) => Container(
      color: FajiColors.borderDark,
      child: const Icon(
        Icons.image_not_supported_outlined,
        color: FajiColors.textSecondaryDark,
        size: 32,
      ),
    ),
  );
}
