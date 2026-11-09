import '../../data/repositories/customer_profile_repository.dart';
import '../../../auth/presentation/auth_scope.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/faji_colors.dart';

class HomeHeader extends StatefulWidget {
  const HomeHeader({super.key, this.repository});
  final CustomerProfileRepository? repository;

  @override
  State<HomeHeader> createState() => _HomeHeaderState();
}

class _HomeHeaderState extends State<HomeHeader> {
  String _greeting = _greetingForTime(DateTime.now());
  String _name = 'Loading profile…';
  String? _photoUrl;
  bool _loading = true;

  Object? _session;
  bool _allowed = false;
  bool _initialized = false;
  int _request = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _resolveProfile();
  }

  @override
  void didUpdateWidget(HomeHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.repository != widget.repository) {
      _initialized = false;
      _resolveProfile();
    }
  }

  void _resolveProfile() {
    final injected = widget.repository;
    if (injected != null) {
      if (!_initialized) {
        _initialized = true;
        _loadHeader(injected);
      }
      return;
    }
    final auth = context
        .dependOnInheritedWidgetOfExactType<AuthScope>()
        ?.notifier;
    if (auth == null) {
      if (!_initialized) {
        _initialized = true;
        _loadHeader(const UnavailableCustomerProfileRepository());
      }
      return;
    }
    final session = auth.state.session;
    final allowed = auth.canAccessCustomer;
    if (!_initialized || !identical(session, _session) || allowed != _allowed) {
      _initialized = true;
      _session = session;
      _allowed = allowed;
      _loadHeader(AuthenticatedCustomerProfileRepository(auth));
    }
  }

  Future<void> _loadHeader(CustomerProfileRepository repository) async {
    final request = ++_request;
    _name = 'Loading profile…';
    _photoUrl = null;
    _loading = true;
    CustomerProfile? profile;
    try {
      profile = await repository.loadCurrentProfile();
    } catch (_) {
      // A real network/profile error can fail independently of sign-in.
    }
    if (!mounted || request != _request) return;
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
                        color: FajiColors.textPrimary,
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
                          color: FajiColors.textSecondary,
                          fontSize: 15,
                        ),
                      )
                    : Text(
                        _name,
                        key: const ValueKey('name'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: FajiColors.textSecondary,
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
                backgroundColor: FajiColors.surface,
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
      backgroundColor: FajiColors.surface,
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
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    final initials = parts.isEmpty
        ? 'F'
        : parts.take(2).map((part) => part[0]).join().toUpperCase();
    return CircleAvatar(
      radius: 28,
      backgroundColor: FajiColors.surface,
      child: Text(
        initials,
        style: const TextStyle(
          color: FajiColors.textPrimary,
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
      color: FajiColors.surface,
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
                color: FajiColors.textPrimary,
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
