import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../plans/data/models/plan_option.dart';
import '../../data/models/booking_draft.dart';
import '../../data/models/confirmed_booking.dart';
import '../../data/repositories/booking_repository.dart';
import '../../domain/services/booking_pricing_service.dart';
import '../../domain/services/mock_booking_payment_service.dart';
import '../screens/add_payment_card_screen.dart';
import '../screens/booking_confirmation_screen.dart';
import '../widgets/booking_date_sheet.dart';
import '../widgets/booking_time_sheet.dart';

class BookingReservationScreen extends StatefulWidget {
  const BookingReservationScreen({super.key, required this.draft});

  final BookingDraft draft;

  @override
  State<BookingReservationScreen> createState() =>
      _BookingReservationScreenState();
}

class _BookingReservationScreenState extends State<BookingReservationScreen> {
  final _pricing = BookingPricingService();
  final _payment = MockBookingPaymentService();
  late BookingDraft _draft;
  late int _guestCount;
  BookingPricing? _price;

  @override
  void initState() {
    super.initState();
    _guestCount = (widget.draft.people ?? widget.draft.guestCount).clamp(
      1,
      widget.draft.plan.maximumGuests,
    );
    _draft = widget.draft.copyWith(guestCount: _guestCount);
    _recalculate();
  }

  void _recalculate() {
    final price = _pricing.calculate(
      plan: _draft.plan,
      guests: _guestCount,
      rideSelected: _draft.rideSelected,
    );
    setState(() {
      _price = price;
      _draft = _draft.copyWith(
        guestCount: _guestCount,
        ridePrice: price.ridePrice,
        calculatedTotal: price.total,
      );
    });
  }

  void _changeGuests(int change) {
    final next = (_guestCount + change).clamp(1, _draft.plan.maximumGuests);
    if (next == _guestCount) return;
    HapticFeedback.lightImpact();
    _guestCount = next;
    _recalculate();
  }

  void _setRide(bool selected) {
    HapticFeedback.lightImpact();
    _draft = _draft.copyWith(rideSelected: selected);
    _recalculate();
  }

  Future<void> _addCard() async {
    final added = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const AddPaymentCardScreen()),
    );
    if (!mounted || added != true) return;
    setState(
      () => _draft = _draft.copyWith(paymentMethod: PaymentMethodType.card),
    );
  }

  Future<void> _editDateTime() async {
    final dateDraft = await showModalBottomSheet<BookingDraft>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BookingDateSheet(
        plan: _draft.plan,
        flowState: _draft.flowState,
        initialDate: _draft.bookingDate,
      ),
    );
    if (!mounted || dateDraft == null) return;
    final timeResult = await showModalBottomSheet<Object?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BookingTimeSheet(draft: dateDraft),
    );
    if (!mounted || timeResult is! BookingDraft) return;
    setState(() {
      _draft = timeResult.copyWith(
        guestCount: _guestCount,
        rideSelected: _draft.rideSelected,
        paymentMethod: _draft.paymentMethod,
      );
    });
  }

  Future<void> _bookReservation() async {
    final method = _draft.paymentMethod;
    if (method == null || _price == null) return;
    final charged = await _payment.charge(draft: _draft);
    if (!mounted || !charged) return;
    final now = DateTime.now();
    final booking = ConfirmedBooking(
      id: 'FJ-${now.millisecondsSinceEpoch}',
      userId: FirebaseAuth.instance.currentUser?.uid ?? '',
      plan: _draft.plan,
      bookingDate: _draft.bookingDate,
      bookingTimePeriod: _draft.bookingTimePeriod!,
      guestCount: _guestCount,
      rideSelected: _draft.rideSelected,
      ridePrice: _price!.ridePrice,
      totalPrice: _price!.total,
      paymentMethod: method,
      createdAt: now,
      qrToken: 'placeholder-${now.millisecondsSinceEpoch}',
      bookingStatus: 'upcoming',
    );
    BookingRepository.instance.add(booking);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => BookingConfirmationScreen(booking: booking),
      ),
    );
  }

  String _money(int value) =>
      '₦${value.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',')}';

  @override
  Widget build(BuildContext context) {
    final price = _price;
    return Scaffold(
      backgroundColor: FajiColors.backgroundDark,
      body: Stack(
        children: [
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(26, 0, 26, 190),
              children: [
                Row(
                  children: [
                    _BackButton(onTap: () => Navigator.of(context).pop()),
                    const SizedBox(width: 16),
                    const Text(
                      'Book your Reservation',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _PlanHero(plan: _draft.plan),
                const SizedBox(height: 20),
                _IncludedCard(plan: _draft.plan),
                const SizedBox(height: 16),
                _BookingDetailsCard(
                  draft: _draft,
                  guestCount: _guestCount,
                  onDecrease: () => _changeGuests(-1),
                  onIncrease: () => _changeGuests(1),
                  onEdit: _editDateTime,
                ),
                const SizedBox(height: 16),
                _PriceBreakdown(price: price),
                const SizedBox(height: 16),
                _RideAddon(selected: _draft.rideSelected, onSelected: _setRide),
                const SizedBox(height: 16),
                _PaymentMethods(
                  selected: _draft.paymentMethod,
                  onSelected: (method) => setState(
                    () => _draft = _draft.copyWith(paymentMethod: method),
                  ),
                  onAddCard: _addCard,
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _BottomBookBar(
              total: price?.total ?? 0,
              enabled: _draft.paymentMethod != null,
              onTap: _bookReservation,
              money: _money,
            ),
          ),
        ],
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: FajiColors.surfaceDark,
    shape: const CircleBorder(side: BorderSide(color: FajiColors.borderDark)),
    child: InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: const SizedBox(
        width: 48,
        height: 48,
        child: Icon(
          Icons.arrow_back_ios_new_rounded,
          color: Colors.white,
          size: 20,
        ),
      ),
    ),
  );
}

class _PlanHero extends StatelessWidget {
  const _PlanHero({required this.plan});

  final PlanOption plan;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          height: 190,
          width: double.infinity,
          child: plan.imageUrl.isNotEmpty
              ? Image.network(
                  plan.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => _asset(),
                )
              : _asset(),
        ),
      ),
      const SizedBox(height: 14),
      Row(
        children: [
          Expanded(
            child: Text(
              plan.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Text(
            '★ ${plan.rating.toStringAsFixed(1)}',
            style: const TextStyle(
              color: Color(0xffffc400),
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
      const SizedBox(height: 5),
      Text(
        '⌖ ${plan.location}, Lagos',
        style: const TextStyle(
          color: FajiColors.textSecondaryDark,
          fontSize: 13,
        ),
      ),
    ],
  );

  Widget _asset() => Image.asset(
    plan.imageAsset,
    fit: BoxFit.cover,
    errorBuilder: (_, _, _) => Container(color: FajiColors.borderDark),
  );
}

class _IncludedCard extends StatelessWidget {
  const _IncludedCard({required this.plan});

  final PlanOption plan;

  @override
  Widget build(BuildContext context) => _SectionCard(
    title: "What's Included",
    child: Row(
      children: plan.features
          .take(3)
          .map((feature) => Expanded(child: _FeatureTile(feature: feature)))
          .toList(),
    ),
  );
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.feature});

  final String feature;

  @override
  Widget build(BuildContext context) => Container(
    height: 84,
    margin: const EdgeInsets.only(right: 10),
    padding: const EdgeInsets.all(8),
    decoration: BoxDecoration(
      color: Colors.black,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: FajiColors.borderDark),
    ),
    child: Center(
      child: Text(
        feature,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.white, fontSize: 12),
      ),
    ),
  );
}

class _BookingDetailsCard extends StatelessWidget {
  const _BookingDetailsCard({
    required this.draft,
    required this.guestCount,
    required this.onDecrease,
    required this.onIncrease,
    required this.onEdit,
  });

  final BookingDraft draft;
  final int guestCount;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) => _SectionCard(
    title: 'Booking Details',
    child: Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _Detail(
                label: 'Date',
                value:
                    '${draft.bookingDate.day}/${draft.bookingDate.month}/${draft.bookingDate.year}',
              ),
            ),
            Expanded(
              child: _Detail(
                label: 'Time',
                value: draft.bookingTimePeriod?.label ?? 'Select time',
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            const Expanded(
              child: _Detail(label: 'Guests', value: ''),
            ),
            _CircleAction(icon: Icons.remove, onTap: onDecrease),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text(
                '$guestCount',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
            ),
            _CircleAction(icon: Icons.add, onTap: onIncrease),
          ],
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, size: 16),
            label: const Text('Edit date & time'),
            style: TextButton.styleFrom(foregroundColor: FajiColors.primary),
          ),
        ),
      ],
    ),
  );
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          color: FajiColors.textSecondaryDark,
          fontSize: 12,
        ),
      ),
      const SizedBox(height: 6),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 14)),
    ],
  );
}

class _CircleAction extends StatelessWidget {
  const _CircleAction({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xff202020),
    shape: const CircleBorder(side: BorderSide(color: FajiColors.primary)),
    child: InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: SizedBox(
        width: 34,
        height: 34,
        child: Icon(icon, color: FajiColors.primary, size: 18),
      ),
    ),
  );
}

class _PriceBreakdown extends StatelessWidget {
  const _PriceBreakdown({required this.price});
  final BookingPricing? price;
  @override
  Widget build(BuildContext context) => _SectionCard(
    title: 'Price Breakdown',
    child: Column(
      children: [
        _PriceRow(label: 'Plan / package', value: price?.planTotal ?? 0),
        _PriceRow(label: 'Ride add-on', value: price?.ridePrice ?? 0),
        _PriceRow(label: 'Service fee', value: price?.serviceFee ?? 0),
        const Divider(color: FajiColors.borderDark),
        _PriceRow(label: 'Total', value: price?.total ?? 0, strong: true),
      ],
    ),
  );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.strong = false,
  });
  final String label;
  final int value;
  final bool strong;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: strong ? Colors.white : FajiColors.textSecondaryDark,
            fontSize: 13,
            fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        const Spacer(),
        Text(
          '₦${value.toString()}',
          style: TextStyle(
            color: strong ? FajiColors.primary : Colors.white,
            fontSize: 14,
            fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ],
    ),
  );
}

class _RideAddon extends StatelessWidget {
  const _RideAddon({required this.selected, required this.onSelected});
  final bool selected;
  final ValueChanged<bool> onSelected;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(18),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ADD-ON',
          style: TextStyle(
            color: FajiColors.textSecondaryDark,
            fontSize: 12,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Need a ride to the venue?',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Book your transport now — from ₦6,500 round trip',
          style: TextStyle(color: FajiColors.textSecondaryDark, fontSize: 12),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            _RideButton(
              label: 'No Thanks',
              selected: !selected,
              onTap: () => onSelected(false),
            ),
            const SizedBox(width: 10),
            _RideButton(
              label: 'Yes, Book a Ride',
              selected: selected,
              onTap: () => onSelected(true),
            ),
          ],
        ),
      ],
    ),
  );
}

class _RideButton extends StatelessWidget {
  const _RideButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Expanded(
    child: OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: selected ? Colors.white : FajiColors.textSecondaryDark,
        backgroundColor: selected ? FajiColors.primary : Colors.transparent,
        side: BorderSide(
          color: selected ? FajiColors.primary : FajiColors.borderDark,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12),
      ),
    ),
  );
}

class _PaymentMethods extends StatelessWidget {
  const _PaymentMethods({
    required this.selected,
    required this.onSelected,
    required this.onAddCard,
  });
  final PaymentMethodType? selected;
  final ValueChanged<PaymentMethodType> onSelected;
  final VoidCallback onAddCard;
  @override
  Widget build(BuildContext context) => _SectionCard(
    title: 'Payment Method',
    child: Column(
      children: [
        _PaymentRow(
          label: 'Add a new card',
          detail: 'Visa, Mastercard, Verve',
          icon: Icons.credit_card_outlined,
          selected: selected == PaymentMethodType.card,
          onTap: onAddCard,
        ),
        const SizedBox(height: 10),
        _PaymentRow(
          label: 'Bank Transfer',
          detail: 'Pay directly to Faji account',
          icon: Icons.account_balance_outlined,
          selected: selected == PaymentMethodType.bankTransfer,
          onTap: () => onSelected(PaymentMethodType.bankTransfer),
        ),
        const SizedBox(height: 10),
        _PaymentRow(
          label: 'USSD',
          detail: 'Dial from any phone, no internet needed',
          icon: Icons.phone_android_outlined,
          selected: selected == PaymentMethodType.ussd,
          onTap: () => onSelected(PaymentMethodType.ussd),
        ),
      ],
    ),
  );
}

class _PaymentRow extends StatelessWidget {
  const _PaymentRow({
    required this.label,
    required this.detail,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final String detail;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xff292020) : Colors.transparent,
    borderRadius: BorderRadius.circular(14),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? FajiColors.primary : FajiColors.borderDark,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: selected
                  ? FajiColors.primary
                  : FajiColors.textSecondaryDark,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    detail,
                    style: const TextStyle(
                      color: FajiColors.textSecondaryDark,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle,
                color: FajiColors.primary,
                size: 20,
              ),
          ],
        ),
      ),
    ),
  );
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
    decoration: BoxDecoration(
      color: FajiColors.surfaceDark,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: FajiColors.borderDark),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        child,
      ],
    ),
  );
}

class _BottomBookBar extends StatelessWidget {
  const _BottomBookBar({
    required this.total,
    required this.enabled,
    required this.onTap,
    required this.money,
  });
  final int total;
  final bool enabled;
  final VoidCallback onTap;
  final String Function(int) money;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
    color: const Color(0xff202020),
    child: Column(
      children: [
        if (!enabled)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text(
              'Select a payment method above to continue',
              style: TextStyle(
                color: FajiColors.textSecondaryDark,
                fontSize: 12,
              ),
            ),
          ),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: FilledButton(
            onPressed: enabled ? onTap : null,
            style: FilledButton.styleFrom(
              backgroundColor: FajiColors.primary,
              disabledBackgroundColor: const Color(0xff2b2b2b),
              disabledForegroundColor: FajiColors.textSecondaryDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    '▢  Book Reservation',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  money(total),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
