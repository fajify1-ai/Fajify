import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../data/models/home_promo.dart';

class PromoBannerCarousel extends StatefulWidget {
  const PromoBannerCarousel({super.key});

  @override
  State<PromoBannerCarousel> createState() => _PromoBannerCarouselState();
}

class _PromoBannerCarouselState extends State<PromoBannerCarousel> {
  final _pageController = PageController();
  Timer? _autoplayTimer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _autoplayTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final nextPage = (_currentPage + 1) % homePromos.length;
      _pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 650),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _autoplayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _showPromoMessage() {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('This promotion will be available soon.'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: FajiColors.surfaceDark,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final height = (constraints.maxWidth * .45)
            .clamp(125.0, 150.0)
            .toDouble();
        return Semantics(
          label: 'Promotional offers',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              width: double.infinity,
              height: height,
              child: Stack(
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: homePromos.length,
                    onPageChanged: (page) =>
                        setState(() => _currentPage = page),
                    itemBuilder: (context, index) => _PromoSlide(
                      promo: homePromos[index],
                      onTap: _showPromoMessage,
                    ),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 14,
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(
                          homePromos.length,
                          (index) => AnimatedContainer(
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeOut,
                            width: index == _currentPage ? 18 : 7,
                            height: 7,
                            margin: const EdgeInsets.only(left: 5),
                            decoration: BoxDecoration(
                              color: index == _currentPage
                                  ? Colors.white
                                  : Colors.white54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PromoSlide extends StatelessWidget {
  const _PromoSlide({required this.promo, required this.onTap});

  final HomePromo promo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          promo.imagePath,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            color: FajiColors.borderDark,
            child: const Icon(
              Icons.image_not_supported_outlined,
              color: FajiColors.textSecondaryDark,
              size: 32,
            ),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.centerRight,
              colors: [
                Colors.black.withValues(alpha: .42),
                Colors.black.withValues(alpha: .18),
                Colors.black.withValues(alpha: .68),
              ],
              stops: const [0, .45, 1],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(17, 15, 17, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      promo.eyebrow,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .6,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      promo.title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        height: 1.05,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Semantics(
                button: true,
                label: promo.ctaText,
                child: FilledButton(
                  onPressed: onTap,
                  style: FilledButton.styleFrom(
                    backgroundColor: FajiColors.primary,
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    promo.ctaText,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
