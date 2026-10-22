import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../auth/presentation/screens/user_home_screen.dart';
import '../../../bookings/data/repositories/booking_repository.dart';
import '../../../bookings/data/models/confirmed_booking.dart';
import '../../../bookings/presentation/screens/booking_ticket_screen.dart';
import '../widgets/floating_home_nav.dart';
import '../../../wishlist/data/models/wishlist_item.dart';
import '../../../wishlist/data/repositories/wishlist_repository.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  late Future<void> _load;

  @override
  void initState() {
    super.initState();
    _load = WishlistRepository.instance.loadForCurrentUser();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: FajiColors.backgroundDark,
        body: _withNavigation(
          SafeArea(
            child: FutureBuilder<void>(
              future: _load,
              builder: (context, snapshot) => AnimatedBuilder(
                animation: WishlistRepository.instance,
                builder: (context, _) => _WishlistContent(
                  items: WishlistRepository.instance.items,
                  loading: snapshot.connectionState != ConnectionState.done,
                  error: WishlistRepository.instance.loadError,
                  onRetry: () => setState(() => _load = WishlistRepository.instance.loadForCurrentUser()),
                  onOpen: (item) => _showItemMessage(context, item),
                ),
              ),
            ),
          ),
          context,
          HomeNavItem.wishlist,
        ),
      );

  void _showItemMessage(BuildContext context, WishlistItem item) {
    final action = switch (item.sourceType) {
      WishlistSourceType.event => 'View Event',
      WishlistSourceType.plan => 'Book Now',
      _ => 'View',
    };
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$action for ${item.title} is available from Home.')),
    );
  }
}

class _WishlistContent extends StatelessWidget {
  const _WishlistContent({required this.items, required this.loading, required this.error, required this.onRetry, required this.onOpen});
  final List<WishlistItem> items;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;
  final ValueChanged<WishlistItem> onOpen;

  @override
  Widget build(BuildContext context) {
    final count = items.length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 150),
      children: [
        const Text('My Wishlist', style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        Text('$count saved ${count == 1 ? 'place' : 'places'}', style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 14)),
        const SizedBox(height: 20),
        if (loading)
          const SizedBox(height: 520, child: Center(child: CircularProgressIndicator(color: FajiColors.primary)))
        else if (error != null)
          _WishlistError(message: error!, onRetry: onRetry)
        else if (items.isEmpty)
          const _WishlistEmptyState()
        else
          ...items.map((item) => Padding(padding: const EdgeInsets.only(bottom: 14), child: _WishlistCard(item: item, onOpen: () => onOpen(item)))),
      ],
    );
  }
}

class _WishlistError extends StatelessWidget {
  const _WishlistError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => SizedBox(height: 520, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(message, textAlign: TextAlign.center, style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 15)), const SizedBox(height: 14), TextButton(onPressed: onRetry, child: const Text('Try again', style: TextStyle(color: FajiColors.primary, fontSize: 15))) ])));
}

class _WishlistEmptyState extends StatelessWidget {
  const _WishlistEmptyState();

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 620,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 80, height: 80, decoration: const BoxDecoration(color: Color(0xfffff3f3), shape: BoxShape.circle), child: const Icon(Icons.favorite_border, color: FajiColors.primary, size: 48)),
            const SizedBox(height: 22),
            const Text('Nothing saved yet', style: TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w500)),
            const SizedBox(height: 10),
            const Text('Tap the heart on any venue or\nevent to save it here.', textAlign: TextAlign.center, style: TextStyle(color: FajiColors.textSecondaryDark, fontSize: 15, height: 1.45)),
            const SizedBox(height: 24),
            FilledButton(onPressed: () => _replaceTopLevel(context, HomeNavItem.home), style: FilledButton.styleFrom(backgroundColor: FajiColors.primary, padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Explore places', style: TextStyle(fontSize: 15))),
          ],
        ),
      );
}

class _WishlistCard extends StatelessWidget {
  const _WishlistCard({required this.item, required this.onOpen});
  final WishlistItem item;
  final VoidCallback onOpen;

  String _money(int value) => '₦${value.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')}+';

  @override
  Widget build(BuildContext context) {
    final price = item.price;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: FajiColors.surfaceDark, borderRadius: BorderRadius.circular(18), border: Border.all(color: FajiColors.borderDark)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(height: 155, width: double.infinity, child: Stack(fit: StackFit.expand, children: [
          item.imageUrl.startsWith('http') ? Image.network(item.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _WishlistImageFallback()) : Image.asset(item.imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _WishlistImageFallback()),
          Positioned(left: 12, bottom: 12, child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .9), borderRadius: BorderRadius.circular(14)), child: Text(item.category, style: const TextStyle(color: Colors.black87, fontSize: 12, fontWeight: FontWeight.w600)))),
          Positioned(right: 10, top: 10, child: Material(color: Colors.white, shape: const CircleBorder(), child: InkWell(onTap: () => WishlistRepository.instance.remove(item.id), customBorder: const CircleBorder(), child: const SizedBox(width: 42, height: 42, child: Icon(Icons.favorite, color: FajiColors.primary, size: 23))))),
        ])),
        Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600))), if (price != null) Text(_money(price), style: const TextStyle(color: FajiColors.primary, fontSize: 14, fontWeight: FontWeight.w600))]),
          const SizedBox(height: 5),
          Text('⌖ ${item.location}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 13)),
          if (item.rating != null) ...[const SizedBox(height: 8), Text('★ ${item.rating!.toStringAsFixed(1)}', style: const TextStyle(color: Color(0xffffb629), fontSize: 13))],
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, height: 42, child: FilledButton(onPressed: onOpen, style: FilledButton.styleFrom(backgroundColor: FajiColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: Text(item.sourceType == WishlistSourceType.event ? 'View Event' : item.sourceType == WishlistSourceType.plan ? 'Book Now →' : 'View / Book'))),
        ])),
      ]),
    );
  }
}

class _WishlistImageFallback extends StatelessWidget {
  const _WishlistImageFallback();
  @override
  Widget build(BuildContext context) => const ColoredBox(color: FajiColors.borderDark, child: Icon(Icons.image_not_supported_outlined, color: FajiColors.textSecondaryDark));
}

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  int _tab = 0;
  bool _loading = true;

  static const _tabs = ['Upcoming', 'Orders', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    await BookingRepository.instance.loadForCurrentUser();
    if (mounted) setState(() => _loading = false);
  }

  List<ConfirmedBooking> _visibleBookings() {
    final bookings = BookingRepository.instance.currentUserBookings;
    if (_tab == 0) return bookings.where(_isUpcoming).toList();
    if (_tab == 2) {
      return bookings
          .where((booking) => booking.bookingStatus == 'completed' || _hasPassed(booking))
          .toList();
    }
    if (_tab == 3) return bookings.where((booking) => booking.bookingStatus == 'cancelled').toList();
    return const [];
  }

  bool _isUpcoming(ConfirmedBooking booking) {
    if (booking.bookingStatus != 'upcoming' && booking.bookingStatus != 'confirmed') return false;
    return !_hasPassed(booking);
  }

  bool _hasPassed(ConfirmedBooking booking) {
    final endHour = booking.bookingTimePeriod.endHour ?? 23;
    final end = DateTime(booking.bookingDate.year, booking.bookingDate.month, booking.bookingDate.day, endHour);
    return !end.isAfter(DateTime.now());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: _withNavigation(_content(context), context, HomeNavItem.bookings),
    );
  }

  Widget _content(BuildContext context) {
    final bookings = _visibleBookings();
    final emptyTitle = switch (_tab) {
      0 => 'No upcoming bookings yet',
      1 => 'No orders yet',
      2 => 'No completed bookings yet',
      _ => 'No cancelled bookings',
    };
    final emptyBody = _tab == 1
        ? 'Your venue and restaurant orders will appear here.'
        : 'When you make a reservation, your tickets will appear here.';

    return SafeArea(
      child: RefreshIndicator(
        color: FajiColors.primary,
        backgroundColor: FajiColors.surfaceDark,
        onRefresh: _loadBookings,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 150),
          children: [
            const Text('My Tickets', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w500)),
            const SizedBox(height: 20),
            _TicketTabs(selected: _tab, tabs: _tabs, onSelected: (value) => setState(() => _tab = value)),
            const SizedBox(height: 16),
            if (_loading)
              const SizedBox(height: 300, child: Center(child: CircularProgressIndicator(color: FajiColors.primary)))
            else if (bookings.isEmpty)
              _EmptyBookings(title: emptyTitle, message: emptyBody, onExplore: _tab == 0 ? () => _replaceTopLevel(context, HomeNavItem.home) : null)
            else
              ...bookings.map((booking) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _TicketCard(booking: booking, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingTicketScreen(booking: booking)))),
                  )),
            const SizedBox(height: 18),
            _HelpCard(onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Faji support will be available here.')))),
          ],
        ),
      ),
    );
  }
}

class _TicketTabs extends StatelessWidget {
  const _TicketTabs({required this.selected, required this.tabs, required this.onSelected});
  final int selected;
  final List<String> tabs;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          for (var index = 0; index < tabs.length; index++)
            Expanded(
              child: GestureDetector(
                onTap: () => onSelected(index),
                child: Container(
                  padding: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: index == selected ? FajiColors.primary : FajiColors.borderDark, width: index == selected ? 2 : 1))),
                  child: Text(tabs[index], textAlign: TextAlign.center, style: TextStyle(color: index == selected ? FajiColors.primary : FajiColors.textSecondaryDark, fontSize: 12, fontWeight: index == selected ? FontWeight.w600 : FontWeight.w400)),
                ),
              ),
            ),
        ],
      );
}

class _EmptyBookings extends StatelessWidget {
  const _EmptyBookings({required this.title, required this.message, this.onExplore});
  final String title;
  final String message;
  final VoidCallback? onExplore;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(22, 54, 22, 54),
        decoration: BoxDecoration(color: FajiColors.surfaceDark, borderRadius: BorderRadius.circular(18), border: Border.all(color: FajiColors.borderDark)),
        child: Column(children: [
          const Icon(Icons.confirmation_number_outlined, color: FajiColors.textSecondaryDark, size: 44),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 13)),
          if (onExplore != null) ...[
            const SizedBox(height: 20),
            TextButton(onPressed: onExplore, child: const Text('Explore places', style: TextStyle(color: FajiColors.primary, fontSize: 14))),
          ],
        ]),
      );
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.booking, required this.onTap});
  final ConfirmedBooking booking;
  final VoidCallback onTap;

  String _date(DateTime date) => '${_weekday(date.weekday)}, ${date.day} ${_month(date.month)} ${date.year}';
  String _weekday(int value) => const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][value - 1];
  String _month(int value) => const ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][value - 1];
  String _money(int value) => '₦${value.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')}';

  @override
  Widget build(BuildContext context) {
    final image = booking.plan.imageUrl.isNotEmpty ? booking.plan.imageUrl : booking.plan.imageAsset;
    final isCancelled = booking.bookingStatus == 'cancelled';
    final status = isCancelled ? 'Cancelled' : booking.bookingStatus == 'completed' ? 'Completed' : 'Upcoming';
    return Container(
      height: 124,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: FajiColors.surfaceDark, borderRadius: BorderRadius.circular(17), border: Border.all(color: FajiColors.borderDark)),
      child: Row(children: [
        SizedBox(width: 96, height: double.infinity, child: image.startsWith('http') ? Image.network(image, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: FajiColors.borderDark)) : Image.asset(image, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const ColoredBox(color: FajiColors.borderDark))),
        Expanded(child: Padding(padding: const EdgeInsets.fromLTRB(12, 10, 10, 9), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(booking.plan.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500))), const SizedBox(width: 6), _StatusPill(label: status, cancelled: isCancelled)]),
          const SizedBox(height: 4),
          Text(booking.plan.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 12)),
          Text('${_date(booking.bookingDate)} · ${booking.bookingTimePeriod.label}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: FajiColors.textSecondaryDark, fontSize: 11)),
          const Spacer(),
          Row(children: [Expanded(child: Text(_money(booking.totalPrice), style: const TextStyle(color: FajiColors.primary, fontSize: 15, fontWeight: FontWeight.w600))), GestureDetector(onTap: onTap, child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7), decoration: BoxDecoration(color: isCancelled ? FajiColors.borderDark : FajiColors.decorativeDarkRed, borderRadius: BorderRadius.circular(16)), child: Text('View Ticket →', style: TextStyle(color: isCancelled ? FajiColors.textSecondaryDark : FajiColors.primary, fontSize: 11, fontWeight: FontWeight.w600))))]),
        ]))),
      ]),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.cancelled});
  final String label;
  final bool cancelled;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4), decoration: BoxDecoration(color: cancelled ? FajiColors.decorativeDarkRed : const Color(0xFF082D18), borderRadius: BorderRadius.circular(12)), child: Text(label, style: TextStyle(color: cancelled ? FajiColors.primary : const Color(0xFF11B95A), fontSize: 10)));
}

class _HelpCard extends StatelessWidget {
  const _HelpCard({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.fromLTRB(16, 14, 12, 14), decoration: BoxDecoration(color: FajiColors.decorativeDarkRed, border: Border.all(color: const Color(0xFF57201F)), borderRadius: BorderRadius.circular(16)), child: Row(children: [const Expanded(child: Text('Need help with a ticket or order?', style: TextStyle(color: FajiColors.textSecondaryDark, fontSize: 12))), TextButton(onPressed: onTap, style: TextButton.styleFrom(backgroundColor: FajiColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))), child: const Text('Get Help', style: TextStyle(fontSize: 12)))]));
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const _TemporaryScreen(title: 'Profile', currentItem: HomeNavItem.profile);
}

class PlanForMeScreen extends StatelessWidget {
  const PlanForMeScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const _TemporaryScreen(title: 'Plan For Me');
}

class BrowsePlansScreen extends StatelessWidget {
  const BrowsePlansScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      const _TemporaryScreen(title: 'Browse Plans');
}

class _TemporaryScreen extends StatelessWidget {
  const _TemporaryScreen({required this.title, this.currentItem});
  final String title;
  final HomeNavItem? currentItem;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: FajiColors.backgroundDark,
        appBar: AppBar(
          backgroundColor: FajiColors.backgroundDark,
          title: Text(title),
        ),
        body: currentItem == null
            ? _temporaryBody
            : _withNavigation(_temporaryBody, context, currentItem!),
      );

  Widget get _temporaryBody => Center(
        child: Text(
          '$title coming soon',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
}

Widget _withNavigation(
  Widget body,
  BuildContext context,
  HomeNavItem currentItem,
) {
  return Stack(
    children: [
      Positioned.fill(child: body),
      Positioned(
        left: 16,
        right: 16,
        bottom: 16,
        child: FloatingHomeNav(
          currentItem: currentItem,
          showQuickActions: false,
          onNavigation: (item) => _replaceTopLevel(context, item),
          onPlanForMe: () {},
          onBrowsePlans: () {},
        ),
      ),
    ],
  );
}

void _replaceTopLevel(BuildContext context, HomeNavItem item) {
  final Widget destination;
  switch (item) {
    case HomeNavItem.home:
      destination = const UserHomeScreen();
    case HomeNavItem.wishlist:
      destination = const WishlistScreen();
    case HomeNavItem.bookings:
      destination = const BookingsScreen();
    case HomeNavItem.profile:
      destination = const ProfileScreen();
  }
  Navigator.of(context).pushReplacement(
    MaterialPageRoute(builder: (_) => destination),
  );
}
