import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';

const homeCategories = [
  'All',
  'Restaurant',
  'Beach',
  'Cinema',
  'Park',
  'Bar',
  'Club',
  'Outdoor',
];

class HomeCategoryFilter extends StatelessWidget {
  const HomeCategoryFilter({
    super.key,
    required this.selectedCategory,
    required this.onSelected,
  });

  final String selectedCategory;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(right: 16),
        itemCount: homeCategories.length,
        separatorBuilder: (_, index) => const SizedBox(width: 9),
        itemBuilder: (context, index) {
          final category = homeCategories[index];
          final selected = category == selectedCategory;
          return Material(
            color: selected ? FajiColors.primary : FajiColors.surfaceDark,
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              onTap: () {
                HapticFeedback.lightImpact();
                onSelected(category);
              },
              borderRadius: BorderRadius.circular(24),
              child: Container(
                constraints: const BoxConstraints(minHeight: 36),
                padding: const EdgeInsets.symmetric(horizontal: 18),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: selected
                        ? FajiColors.primary
                        : FajiColors.borderDark,
                  ),
                ),
                child: Text(
                  category,
                  style: TextStyle(
                    color: selected
                        ? Colors.white
                        : FajiColors.textSecondaryDark,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
