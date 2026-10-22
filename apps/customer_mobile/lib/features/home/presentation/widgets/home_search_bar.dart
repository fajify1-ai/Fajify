import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';

class HomeSearchBar extends StatelessWidget {
  const HomeSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onFilter,
    required this.filterActive,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilter;
  final bool filterActive;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 52,
            decoration: BoxDecoration(
              color: FajiColors.surfaceDark,
              borderRadius: BorderRadius.circular(26),
            ),
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: const TextStyle(color: Colors.white, fontSize: 16),
              cursorColor: FajiColors.primary,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                hintText: 'Search restaurants, venues, events...',
                hintStyle: TextStyle(
                  color: FajiColors.textSecondaryDark,
                  fontSize: 14,
                ),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  size: 24,
                  color: FajiColors.textSecondaryDark,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.only(top: 14, right: 16),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Stack(
          clipBehavior: Clip.none,
          children: [
            Material(
              color: FajiColors.surfaceDark,
              shape: const CircleBorder(),
              child: InkWell(
                onTap: onFilter,
                customBorder: const CircleBorder(),
                child: const SizedBox(
                  width: 52,
                  height: 52,
                  child: Icon(
                    Icons.tune_rounded,
                    size: 24,
                    color: FajiColors.textPrimaryDark,
                  ),
                ),
              ),
            ),
            if (filterActive)
              Positioned(
                right: 1,
                top: 1,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: FajiColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
