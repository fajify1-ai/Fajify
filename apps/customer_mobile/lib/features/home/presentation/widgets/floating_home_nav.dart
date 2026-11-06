import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';

class FloatingHomeNav extends StatefulWidget {
  const FloatingHomeNav({
    super.key,
    required this.onNavigation,
    required this.onPlanForMe,
    required this.onBrowsePlans,
    this.currentItem = HomeNavItem.home,
    this.showQuickActions = true,
  });

  final ValueChanged<HomeNavItem> onNavigation;
  final VoidCallback onPlanForMe;
  final VoidCallback onBrowsePlans;
  final HomeNavItem currentItem;
  final bool showQuickActions;

  @override
  State<FloatingHomeNav> createState() => _FloatingHomeNavState();
}

class _FloatingHomeNavState extends State<FloatingHomeNav>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 280),
  );
  bool _open = false;

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  void _toggle() {
    HapticFeedback.lightImpact();
    setState(() => _open = !_open);
    if (_open) {
      _animation.forward();
    } else {
      _animation.reverse();
    }
  }

  void _close() {
    if (!_open) return;
    setState(() => _open = false);
    _animation.reverse();
  }

  void _navigate(VoidCallback callback) {
    _close();
    callback();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 310,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          if (_open)
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _close,
                child: const SizedBox.expand(),
              ),
            ),
          if (widget.showQuickActions) ...[
            _QuickAction(
              bottom: 238,
              visible: _open,
              label: '✦  Plan For Me',
              primary: true,
              onTap: () => _navigate(widget.onPlanForMe),
            ),
            _QuickAction(
              bottom: 170,
              visible: _open,
              label: 'Browse Plans',
              primary: false,
              onTap: () => _navigate(widget.onBrowsePlans),
            ),
          ],
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _NavigationBar(
              currentItem: widget.currentItem,
              onTap: widget.onNavigation,
            ),
          ),
          if (widget.showQuickActions)
            Positioned(
              right: 26,
              bottom: 90,
              child: Material(
                color: const Color(0xff202020),
                elevation: 8,
                shadowColor: Colors.black87,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: _toggle,
                  customBorder: const CircleBorder(),
                  child: AnimatedBuilder(
                    animation: _animation,
                    builder: (context, child) => Transform.rotate(
                      angle: _animation.value * .785,
                      child: child,
                    ),
                    child: SizedBox(
                      width: 68,
                      height: 68,
                      child: DecoratedBox(
                        decoration: const ShapeDecoration(
                          shape: CircleBorder(
                            side: BorderSide(color: Color(0xff363636)),
                          ),
                        ),
                        child: Icon(
                          _open ? Icons.close : Icons.add,
                          color: FajiColors.primary,
                          size: 31,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.bottom,
    required this.visible,
    required this.label,
    required this.primary,
    required this.onTap,
  });

  final double bottom;
  final bool visible;
  final String label;
  final bool primary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 0,
      bottom: bottom,
      child: IgnorePointer(
        ignoring: !visible,
        child: AnimatedSlide(
          offset: visible ? Offset.zero : const Offset(0, .35),
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          child: AnimatedOpacity(
            opacity: visible ? 1 : 0,
            duration: const Duration(milliseconds: 220),
            child: Material(
              color: primary ? FajiColors.primary : FajiColors.surfaceDark,
              borderRadius: BorderRadius.circular(31),
              elevation: 8,
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(31),
                child: Container(
                  width: 139,
                  height: 48,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(31),
                    border: primary
                        ? null
                        : Border.all(color: FajiColors.borderDark, width: 2),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: primary ? FontWeight.w800 : FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum HomeNavItem { home, wishlist, bookings, profile }

class _NavigationBar extends StatelessWidget {
  const _NavigationBar({required this.currentItem, required this.onTap});

  final HomeNavItem currentItem;
  final ValueChanged<HomeNavItem> onTap;

  @override
  Widget build(BuildContext context) {
    const items = [
      (HomeNavItem.home, Icons.home_outlined, 'Home'),
      (HomeNavItem.wishlist, Icons.favorite_border, 'Wishlist'),
      (HomeNavItem.bookings, Icons.confirmation_num_outlined, 'Bookings'),
      (HomeNavItem.profile, Icons.person_outline, 'Profile'),
    ];
    return Container(
      height: 74,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: const Color(0xff202020),
        borderRadius: BorderRadius.circular(37),
        border: Border.all(color: const Color(0xff363636)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black87,
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items.map((item) {
          final active = item.$1 == currentItem;
          return Expanded(
            child: InkWell(
              onTap: () => onTap(item.$1),
              borderRadius: BorderRadius.circular(24),
              child: SizedBox(
                height: 68,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      item.$2,
                      size: 26,
                      color: active
                          ? FajiColors.primary
                          : FajiColors.textSecondaryDark,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.$3,
                      style: TextStyle(
                        color: active
                            ? FajiColors.primary
                            : FajiColors.textSecondaryDark,
                        fontSize: 12,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
