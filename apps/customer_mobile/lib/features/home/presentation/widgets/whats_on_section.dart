import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/whats_on_item.dart';
import 'whats_on_card.dart';

class WhatsOnSection extends StatelessWidget {
  const WhatsOnSection({
    super.key,
    required this.savedIds,
    required this.onSaved,
    required this.onCtaPressed,
    required this.onSeeAll,
  });

  final Set<String> savedIds;
  final ValueChanged<WhatsOnItem> onSaved;
  final ValueChanged<WhatsOnItem> onCtaPressed;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final availableWidth = MediaQuery.sizeOf(context).width - 36;
    final cardWidth = (availableWidth * .74).clamp(220.0, 250.0).toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              "What's On 🔥",
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(48, 48),
              ),
              child: const Text(
                'See all',
                style: TextStyle(
                  color: FajiColors.primary,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 9),
        SizedBox(
          height: 185,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(right: 16),
            itemCount: whatsOnItems.length,
            separatorBuilder: (_, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final item = whatsOnItems[index];
              return WhatsOnCard(
                item: item,
                width: cardWidth,
                saved: savedIds.contains(item.id),
                onSaved: (value) => onSaved(item),
                onCtaPressed: () => onCtaPressed(item),
              );
            },
          ),
        ),
      ],
    );
  }
}
