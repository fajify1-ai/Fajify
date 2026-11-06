import '../../data/repositories/customer_profile_repository.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';

class HomeHeader extends StatefulWidget {
  const HomeHeader({
    super.key,
    this.repository = const UnavailableCustomerProfileRepository(),
  });
  final CustomerProfileRepository repository;

  @override
  State<HomeHeader> createState() => _HomeHeaderState();
}

class _HomeHeaderState extends State<HomeHeader> {
  String _greeting = _greetingForTime(DateTime.now());
  String _name = 'Loading profile…';
  String? _photoUrl;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadHeader();
  }

  Future<void> _loadHeader() async {
    CustomerProfile? profile;
    try {
      profile = await widget.repository.loadCurrentProfile();
    } catch (_) {
      // Preserve the header with an explicit unavailable state.
    }
    if (!mounted) return;
    setState(() {
      _greeting = _greetingForTime(DateTime.now());
      _name = profile?.fullName ?? 'Profile unavailable';
      _photoUrl = profile?.photoUrl;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _ProfileAvatar(name: _name, photoUrl: _photoUrl),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      _greeting,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: FajiColors.textPrimaryDark,
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 5),
                  const Text(
                    '✦',
                    style: TextStyle(
                      color: FajiColors.primary,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _loading
                    ? const Text(
                        'Loading profile…',
                        key: ValueKey('loading'),
                        style: TextStyle(
                          color: FajiColors.textSecondaryDark,
                          fontSize: 15,
                        ),
                      )
                    : Text(
                        _name,
                        key: const ValueKey('name'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xffc3c3c8),
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        _NotificationButton(
          onTap: () {
            HapticFeedback.lightImpact();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Notifications will be available here.'),
                behavior: SnackBarBehavior.floating,
                backgroundColor: FajiColors.surfaceDark,
              ),
            );
          },
        ),
      ],
    );
  }
}

String _greetingForTime(DateTime time) {
  if (time.hour >= 5 && time.hour < 12) return 'Good Morning';
  if (time.hour >= 12 && time.hour < 17) return 'Good Afternoon';
  return 'Good Night';
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.name, required this.photoUrl});

  final String name;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    final fallback = _InitialsAvatar(name: name);
    final url = photoUrl;
    if (url == null || url.isEmpty) return fallback;

    return CircleAvatar(
      radius: 28,
      backgroundColor: FajiColors.surfaceDark,
      child: ClipOval(
        child: Image.network(
          url,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          loadingBuilder: (context, child, progress) =>
              progress == null ? child : fallback,
          errorBuilder: (_, _, _) => fallback,
        ),
      ),
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final parts = name.trim().split(RegExp(r'\s+'));
    final initials = parts.isEmpty
        ? 'F'
        : parts.take(2).map((part) => part[0]).join().toUpperCase();
    return CircleAvatar(
      radius: 28,
      backgroundColor: FajiColors.surfaceDark,
      child: Text(
        initials,
        style: const TextStyle(
          color: FajiColors.textPrimaryDark,
          fontSize: 17,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NotificationButton extends StatelessWidget {
  const _NotificationButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: FajiColors.surfaceDark,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 50,
          height: 50,
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Icon(
                Icons.notifications_none_rounded,
                color: FajiColors.textPrimaryDark,
                size: 27,
              ),
              Positioned(
                right: 10,
                top: 9,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: FajiColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
