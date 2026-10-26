import '../../../../core/widgets/service_unavailable_view.dart';

import 'package:flutter/material.dart';

import '../../../../core/theme/faji_colors.dart';
import '../../../bookings/data/models/booking_draft.dart';
import '../../../bookings/presentation/screens/booking_reservation_screen.dart';
import '../../../bookings/presentation/widgets/booking_date_sheet.dart';
import '../../../bookings/presentation/widgets/booking_time_sheet.dart';
import '../../../auth/presentation/screens/user_home_screen.dart';
import '../../../home/presentation/screens/plan_for_me_step_one_screen.dart';
import '../../../home/presentation/screens/temporary_home_destinations.dart';
import '../../../home/presentation/widgets/floating_home_nav.dart';
import '../../data/repositories/plan_repository.dart';
import '../../domain/services/plan_recommendation_service.dart';
import '../widgets/recommendation_card.dart';
import '../../data/models/plan_option.dart';
import '../../../wishlist/data/repositories/wishlist_repository.dart';

class PlanResultsScreen extends StatefulWidget {
  const PlanResultsScreen({
    super.key,
    required this.flowState,
    this.repository,
  });
  final CustomerPlanRepository? repository;

  final PlanForMeFlowState flowState;

  @override
  State<PlanResultsScreen> createState() => _PlanResultsScreenState();
}

class _PlanResultsScreenState extends State<PlanResultsScreen> {
  late final CustomerPlanRepository _repository =
      widget.repository ?? PlanRepository();
  final _service = PlanRecommendationService();
  late Future<PlanRecommendationResult> _recommendations;

  @override
  void initState() {
    super.initState();
    WishlistRepository.instance.loadForCurrentUser();
    _recommendations = _loadRecommendations();
  }

  Future<PlanRecommendationResult> _loadRecommendations() async {
    final plans = await _repository.loadAvailablePlans();
    return _service.recommend(widget.flowState, plans);
  }

  Future<void> _openBookingDateSheet(PlanOption plan) async {
    DateTime? currentBookingDate;
    while (mounted) {
      final draft = await showModalBottomSheet<BookingDraft>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => BookingDateSheet(
          plan: plan,
          flowState: widget.flowState,
          initialDate: currentBookingDate,
        ),
      );
      if (!mounted || draft == null) return;
      currentBookingDate = draft.bookingDate;

      final timeResult = await showModalBottomSheet<Object?>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => BookingTimeSheet(draft: draft),
      );
      if (!mounted || timeResult == null) return;
      if (timeResult is BookingTimeSheetResult) continue;
      if (timeResult is BookingDraft) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BookingReservationScreen(draft: timeResult),
          ),
        );
      }
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: WishlistRepository.instance,
      builder: (context, _) => Scaffold(
        backgroundColor: FajiColors.backgroundDark,
        body: Stack(
          children: [
            SafeArea(
              child: FutureBuilder<PlanRecommendationResult>(
                future: _recommendations,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return const ServiceUnavailableView(feature: 'Plans');
                  }
                  if (!snapshot.hasData) {
                    return const Center(
                      child: CircularProgressIndicator(
                        color: FajiColors.primary,
                      ),
                    );
                  }
                  final result = snapshot.data!;
                  return _ResultsContent(
                    state: widget.flowState,
                    result: result,
                    savedPlanIds: WishlistRepository.instance.savedIds,
                    onSaved: (plan, _) => ScaffoldMessenger.of(context)
                        .showSnackBar(
                          SnackBar(
                            content: Text(
                              WishlistRepository.instance.loadError,
                            ),
                          ),
                        ),
                    onBook: _openBookingDateSheet,
                  );
                },
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: FloatingHomeNav(
                currentItem: HomeNavItem.home,
                showQuickActions: false,
                onNavigation: (item) => _replaceResultsTopLevel(context, item),
                onPlanForMe: () {},
                onBrowsePlans: () {},
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _replaceResultsTopLevel(BuildContext context, HomeNavItem item) {
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
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => destination),
    (_) => false,
  );
}

class _ResultsContent extends StatelessWidget {
  const _ResultsContent({
    required this.state,
    required this.result,
    required this.savedPlanIds,
    required this.onSaved,
    required this.onBook,
  });

  final PlanForMeFlowState state;
  final PlanRecommendationResult result;
  final Set<String> savedPlanIds;
  final void Function(PlanOption plan, bool saved) onSaved;
  final ValueChanged<PlanOption> onBook;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 180),
      children: [
        IconButton(
          onPressed: () => Navigator.of(context).pop(),
          alignment: Alignment.centerLeft,
          padding: EdgeInsets.zero,
          icon: const Icon(
            Icons.chevron_left,
            color: FajiColors.textSecondaryDark,
            size: 30,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          '🎉 We found some plans\nfor you!',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            height: 1.1,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Based on what you picked, here are your best matches.',
          style: TextStyle(color: FajiColors.textSecondaryDark, fontSize: 13),
        ),
        const SizedBox(height: 13),
        _PreferenceChips(state: state),
        const SizedBox(height: 19),
        if (result.bestMatch != null)
          _ResultSection(
            title: 'BEST MATCH FOR YOU',
            color: FajiColors.primary,
            plans: [result.bestMatch!],
            badge: '★ Best Match',
            onSaved: onSaved,
            onBook: onBook,
            savedPlanIds: savedPlanIds,
          ),
        if (result.spendLess != null)
          _ResultSection(
            title: 'YOU COULD SPEND LESS',
            color: const Color(0xff20b56a),
            plans: [result.spendLess!],
            badge: '↓ Spend Less',
            onSaved: onSaved,
            onBook: onBook,
            savedPlanIds: savedPlanIds,
          ),
        if (result.worthStretching != null)
          _ResultSection(
            title: 'WORTH STRETCHING FOR',
            color: const Color(0xffa957ed),
            plans: [result.worthStretching!],
            badge: '↑ Worth It',
            onSaved: onSaved,
            onBook: onBook,
            savedPlanIds: savedPlanIds,
          ),
        if (result.moreOptions.isNotEmpty)
          _ResultSection(
            title: 'MORE OPTIONS',
            color: FajiColors.textSecondaryDark,
            plans: result.moreOptions,
            badge: 'More',
            onSaved: onSaved,
            onBook: onBook,
            savedPlanIds: savedPlanIds,
          ),
        if (result.bestMatch == null)
          _EmptyResults(onBack: () => Navigator.of(context).pop()),
      ],
    );
  }
}

class _PreferenceChips extends StatelessWidget {
  const _PreferenceChips({required this.state});

  final PlanForMeFlowState state;

  @override
  Widget build(BuildContext context) {
    final labels = <String>[
      if (state.planType != null) state.planType!.label,
      if (state.peopleRange != null) state.peopleRange!.label,
      if (state.peopleRange == null && state.exactPeopleCount != null)
        '${state.exactPeopleCount} people',
      if (state.selectedLocation != null) state.selectedLocation!,
      if (state.selectedDate != null) _shortDate(state.selectedDate!),
      if (state.selectedTimeOfDay != null) state.selectedTimeOfDay!.label,
      if (state.selectedBudget != null) state.selectedBudget!.label,
      ...state.selectedVibes.map((vibe) => vibe.label),
    ];
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: labels.map((label) => _PreferenceChip(label: label)).toList(),
    );
  }

  String _shortDate(DateTime date) => '${date.day}/${date.month}/${date.year}';
}

class _PreferenceChip extends StatelessWidget {
  const _PreferenceChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: FajiColors.primary,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _ResultSection extends StatelessWidget {
  const _ResultSection({
    required this.title,
    required this.color,
    required this.plans,
    required this.badge,
    required this.onSaved,
    required this.onBook,
    required this.savedPlanIds,
  });

  final String title;
  final Color color;
  final List<PlanOption> plans;
  final String badge;
  final void Function(PlanOption plan, bool saved) onSaved;
  final ValueChanged<PlanOption> onBook;
  final Set<String> savedPlanIds;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 1, bottom: 9),
          child: Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 13,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ...plans.map(
          (plan) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: RecommendationCard(
              plan: plan,
              badge: badge,
              badgeColor: color,
              saved: savedPlanIds.contains(plan.id),
              onSaved: (saved) => onSaved(plan, saved),
              onBook: () => onBook(plan),
            ),
          ),
        ),
      ],
    ),
  );
}

class _EmptyResults extends StatelessWidget {
  const _EmptyResults({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.only(top: 36),
      child: Column(
        children: [
          const Text(
            "We couldn't find an exact match.",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          TextButton(onPressed: onBack, child: const Text('Adjust your plan')),
        ],
      ),
    ),
  );
}
